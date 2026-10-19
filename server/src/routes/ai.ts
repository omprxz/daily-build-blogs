import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { providerRegistry } from '../services/ai/provider-registry.js';
import { researchService } from '../services/research/rss.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { encryptApiKey, decryptApiKey } from '../utils/security.js';
import { getEditorialVoiceProfile } from '../services/ai/editorial-voice.js';
import { eq, gte, desc, and } from 'drizzle-orm';

const router = Router();

const SELF_AUTHENTICATING_PROVIDERS = new Set(['antigravity', 'codex', 'tgpt', 'ollama']);

// GET /api/ai/providers - List all providers with their discovered models
router.get('/providers', authenticate, async (req, res, next) => {
  try {
    const onlyChecked = req.query.onlyChecked === 'true';
    const onlyEnabled = req.query.onlyEnabled === 'true';

    let dbProviders = await db.query.aiProviders.findMany();
    // Exclude removed standalone providers
    dbProviders = dbProviders.filter(p => !['grok', 'claude', 'custom_openai'].includes(p.slug));

    if (onlyEnabled) {
      dbProviders = dbProviders.filter(p => p.isEnabled);
    }

    const result = await Promise.all(dbProviders.map(async (prov) => {
      const isAuto = prov.slug === 'antigravity' || prov.slug === 'codex';

      let models = await db.query.aiModels.findMany({
        where: eq(schema.aiModels.providerId, prov.id)
      });

      if (isAuto) {
        models = [
          {
            id: 'automatic',
            providerId: prov.id,
            modelId: 'automatic',
            displayName: prov.slug === 'antigravity' ? 'Antigravity Auto Selection' : 'Codex Auto Selection',
            capabilities: ['text', 'structured_output'],
            contextWindow: 128000,
            isDefault: true,
            pricingNotes: 'Automatic Model Selection',
            discoveredAt: new Date(),
          } as any
        ];
      }

      const checkedIds: string[] = (prov.settingsJson as any)?.checkedModelIds;
      const enrichedModels = models.map((m) => ({
        ...m,
        isChecked: isAuto || (Array.isArray(checkedIds) ? checkedIds.includes(m.modelId) : true),
      }));

      const finalModels = (onlyChecked && !isAuto && Array.isArray(checkedIds) && checkedIds.length > 0)
        ? enrichedModels.filter((m) => m.isChecked)
        : enrichedModels;

      return {
        id: prov.id,
        name: prov.name,
        slug: prov.slug,
        baseUrl: prov.baseUrl,
        isEnabled: prov.isEnabled,
        isAutomaticModel: isAuto,
        isFreeTierAvailable: prov.isFreeTierAvailable,
        rateLimitsInfo: prov.rateLimitsInfo,
        pricingDocUrl: prov.pricingDocUrl,
        hasApiKey: Boolean(prov.apiKeyEncrypted),
        settingsJson: prov.settingsJson,
        checkedModelIds: isAuto ? ['automatic'] : (checkedIds || null),
        models: finalModels,
      };
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/providers/:slug/models - Dynamic model listing for a provider fetched from API/DB
router.get('/providers/:slug/models', authenticate, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const refresh = req.query.refresh === 'true';
    const onlyChecked = req.query.onlyChecked === 'true';

    if (slug === 'antigravity' || slug === 'codex') {
      return res.json({
        provider: slug,
        isAutomaticModel: true,
        count: 1,
        checkedModelIds: ['automatic'],
        models: [
          {
            id: 'automatic',
            modelId: 'automatic',
            displayName: slug === 'antigravity' ? 'Antigravity Auto Selection' : 'Codex Auto Selection',
            capabilities: ['text', 'structured_output'],
            isChecked: true,
            isDefault: true,
          }
        ],
      });
    }

    const provider = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, slug)
    });

    if (!provider) {
      return res.status(404).json({ error: 'NotFound', message: `Provider '${slug}' not found.` });
    }

    let models = await db.query.aiModels.findMany({
      where: eq(schema.aiModels.providerId, provider.id)
    });

    // If no models exist in DB or refresh requested, fetch live models via provider API
    if (models.length === 0 || refresh) {
      const targetKey = provider.apiKeyEncrypted ? decryptApiKey(provider.apiKeyEncrypted) : undefined;
      const testResult = await providerRegistry.testAndDiscover(slug, targetKey, provider.baseUrl || undefined);
      if (testResult.success) {
        models = await db.query.aiModels.findMany({
          where: eq(schema.aiModels.providerId, provider.id)
        });
      }
    }

    const checkedIds: string[] = (provider.settingsJson as any)?.checkedModelIds;
    const enrichedModels = models.map((m) => ({
      ...m,
      isChecked: Array.isArray(checkedIds) ? checkedIds.includes(m.modelId) : true,
    }));

    const finalModels = (onlyChecked && Array.isArray(checkedIds) && checkedIds.length > 0)
      ? enrichedModels.filter((m) => m.isChecked)
      : enrichedModels;

    res.json({
      provider: slug,
      isAutomaticModel: false,
      count: finalModels.length,
      checkedModelIds: checkedIds || null,
      models: finalModels,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/providers/:slug/models - Add custom model to provider
const addCustomModelSchema = z.object({
  modelId: z.string().min(1, 'Model ID is required').max(100),
  displayName: z.string().max(150).optional(),
  category: z.enum(['text', 'image', 'video', 'code']).optional(),
  capabilities: z.array(z.string()).optional(),
  contextWindow: z.number().int().positive().optional(),
});

router.post('/providers/:slug/models', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const body = addCustomModelSchema.parse(req.body);

    const provider = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, slug),
    });

    if (!provider) {
      return res.status(404).json({ error: 'NotFound', message: `Provider '${slug}' not found.` });
    }

    if (slug === 'antigravity' || slug === 'codex') {
      return res.status(400).json({
        error: 'UnsupportedProvider',
        message: `${provider.name} uses automatic local agent execution and does not support manual model overrides.`,
      });
    }

    const cleanModelId = body.modelId.trim();
    const cleanDisplayName = body.displayName?.trim() || cleanModelId;

    let capabilities = body.capabilities || ['text', 'structured_output'];
    if (body.category === 'image' && !capabilities.includes('image_generation')) {
      capabilities = ['image_generation', ...capabilities];
    } else if (body.category === 'video' && !capabilities.includes('video_generation')) {
      capabilities = ['video_generation', ...capabilities];
    } else if (body.category === 'code' && !capabilities.includes('code_generation')) {
      capabilities = ['code_generation', ...capabilities];
    }

    // Check if model already exists for this provider
    const existingModel = await db.query.aiModels.findFirst({
      where: and(
        eq(schema.aiModels.providerId, provider.id),
        eq(schema.aiModels.modelId, cleanModelId)
      ),
    });

    let savedModel;
    if (existingModel) {
      const [updated] = await db.update(schema.aiModels)
        .set({
          displayName: cleanDisplayName,
          capabilities,
          contextWindow: body.contextWindow || existingModel.contextWindow || 128000,
          pricingNotes: 'Custom Model',
        })
        .where(eq(schema.aiModels.id, existingModel.id))
        .returning();
      savedModel = updated;
    } else {
      const [inserted] = await db.insert(schema.aiModels)
        .values({
          providerId: provider.id,
          modelId: cleanModelId,
          displayName: cleanDisplayName,
          capabilities,
          contextWindow: body.contextWindow || 128000,
          isDefault: false,
          pricingNotes: 'Custom Model',
        })
        .returning();
      savedModel = inserted;
    }

    // Ensure model is checked in provider settings so it is immediately active
    const settings = (provider.settingsJson as any) || {};
    let checkedIds: string[] = Array.isArray(settings.checkedModelIds)
      ? [...settings.checkedModelIds]
      : (await db.query.aiModels.findMany({ where: eq(schema.aiModels.providerId, provider.id) })).map((m) => m.modelId);

    if (!checkedIds.includes(cleanModelId)) {
      checkedIds.push(cleanModelId);
      await db.update(schema.aiProviders)
        .set({
          settingsJson: {
            ...settings,
            checkedModelIds: checkedIds,
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.aiProviders.id, provider.id));
    }

    res.json({
      success: true,
      message: `Model '${cleanModelId}' successfully added to ${provider.name}.`,
      model: {
        ...savedModel,
        isChecked: true,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', message: err.errors[0]?.message || 'Invalid input.' });
    }
    next(err);
  }
});

// DELETE /api/ai/providers/:slug/models/:modelId - Delete a model (especially custom models)
router.delete('/providers/:slug/models/:modelId', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { slug, modelId } = req.params;

    const provider = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, slug),
    });

    if (!provider) {
      return res.status(404).json({ error: 'NotFound', message: `Provider '${slug}' not found.` });
    }

    await db.delete(schema.aiModels).where(
      and(
        eq(schema.aiModels.providerId, provider.id),
        eq(schema.aiModels.modelId, modelId)
      )
    );

    // Also remove from checkedModelIds if present
    const settings = (provider.settingsJson as any) || {};
    if (Array.isArray(settings.checkedModelIds)) {
      const updatedChecked = settings.checkedModelIds.filter((id: string) => id !== modelId);
      await db.update(schema.aiProviders)
        .set({
          settingsJson: {
            ...settings,
            checkedModelIds: updatedChecked,
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.aiProviders.id, provider.id));
    }

    res.json({
      success: true,
      message: `Model '${modelId}' removed successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/providers/:slug/test - Dynamic model discovery & connection test
router.post('/providers/:slug/test', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { apiKey, baseUrl } = req.body;

    let targetKey = apiKey;
    let targetUrl = baseUrl;

    // If apiKey wasn't sent in body, check existing stored encrypted key
    if (!targetKey) {
      const stored = await db.query.aiProviders.findFirst({
        where: eq(schema.aiProviders.slug, slug)
      });
      if (stored && stored.apiKeyEncrypted) {
        targetKey = decryptApiKey(stored.apiKeyEncrypted);
      }
      if (stored && !targetUrl) {
        targetUrl = stored.baseUrl;
      }
    }

    const testResult = await providerRegistry.testAndDiscover(slug, targetKey, targetUrl);
    res.json(testResult);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ai/providers/:slug - Save configuration & API key with strict validation
router.put('/providers/:slug', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { apiKey, baseUrl, isEnabled, settingsJson } = req.body;

    const existing = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, slug)
    });

    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Provider not found.' });
    }

    // Require valid API key or existing verified key before enabling (unless self-authenticating)
    const wantsEnabled = isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled;
    const hasKey = (apiKey !== undefined && apiKey !== '') || Boolean(existing.apiKeyEncrypted);

    if (wantsEnabled && !SELF_AUTHENTICATING_PROVIDERS.has(slug) && !hasKey) {
      return res.status(400).json({
        error: 'KeyRequired',
        message: `A valid API key is required before '${existing.name}' can be activated.`,
      });
    }

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (apiKey !== undefined) {
      if (apiKey === '') {
        updatePayload.apiKeyEncrypted = null;
        if (!SELF_AUTHENTICATING_PROVIDERS.has(slug)) {
          updatePayload.isEnabled = false;
        }
      } else {
        updatePayload.apiKeyEncrypted = encryptApiKey(apiKey);
      }
    }
    if (baseUrl !== undefined) {
      updatePayload.baseUrl = baseUrl;
    }
    if (isEnabled !== undefined) {
      updatePayload.isEnabled = Boolean(isEnabled);
    }
    if (settingsJson !== undefined) {
      updatePayload.settingsJson = settingsJson;
    }

    const [updated] = await db.update(schema.aiProviders)
      .set(updatePayload)
      .where(eq(schema.aiProviders.slug, slug))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      baseUrl: updated.baseUrl,
      isEnabled: updated.isEnabled,
      isAutomaticModel: slug === 'antigravity' || slug === 'codex',
      hasApiKey: Boolean(updated.apiKeyEncrypted),
      settingsJson: updated.settingsJson,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-titles - AI-powered title generation with 3-4 suggestions
const generateTitlesSchema = z.object({
  topic: z.string().min(2),
  currentTitle: z.string().optional(),
  count: z.number().default(4),
  provider: z.string().optional(),
  model: z.string().optional(),
});

router.post('/generate-titles', authenticate, async (req, res, next) => {
  try {
    const input = generateTitlesSchema.parse(req.body);
    const profile = await getEditorialVoiceProfile();

    const prompt = `Topic & Subject: "${input.topic}"
${input.currentTitle ? `Current Draft Title: "${input.currentTitle}"` : ''}

Generate ${input.count} compelling, authoritative, high-clickthrough editorial article titles.
Editorial Directives:
- Tone: ${profile.learnedTone}
- Derive style and journalistic angle from the topic, but do NOT copy source headlines verbatim.
- Create varied angles: one analytical breakdown, one breakthrough/impact angle, one architectural/engineering view, and one visionary forward-looking angle.
- Never use boring clickbait; maintain high-credibility tech journalism standards.
- Output strictly a JSON array of ${input.count} strings, e.g.: ["Title 1", "Title 2", "Title 3", "Title 4"]`;

    const result = await providerRegistry.generate('summary', {
      model: input.model || '',
      prompt,
      systemInstruction: profile.systemPrompt,
      responseJsonSchema: { type: 'array' },
    }, input.provider);

    let titles: string[] = [];
    if (result.structuredJson && Array.isArray(result.structuredJson)) {
      titles = result.structuredJson;
    } else {
      const match = result.content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          titles = JSON.parse(match[0]);
        } catch {}
      }
      if (titles.length === 0) {
        titles = result.content
          .split('\n')
          .map((l) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^["'-\s*]+|["'\s]+$/g, '').trim())
          .filter((l) => l.length > 10);
      }
    }

    res.json({
      titles: titles.slice(0, input.count),
      durationMs: result.durationMs,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/rewrite - Full-content generation, regeneration, prompt-based rewriting, and selected text editing
const rewriteSchema = z.object({
  text: z.string().min(1),
  prompt: z.string().optional(),
  preset: z.enum(['brief', 'professional', 'detailed', 'in_depth']).default('professional'),
  provider: z.string().optional(),
  model: z.string().optional(),
  isFullArticle: z.boolean().default(false),
  headline: z.string().optional(),
});

router.post('/rewrite', authenticate, async (req, res, next) => {
  try {
    const input = rewriteSchema.parse(req.body);
    const profile = await getEditorialVoiceProfile();

    const presetInstructions: Record<string, string> = {
      brief: 'Length: Concise and compact. Deliver clear, high-density summary paragraphs with bulleted key points. Avoid excess narrative.',
      professional: 'Length: Balanced executive journalism. Authoritative, polished, clear architectural structure with <h2> and <h3> sections.',
      detailed: 'Length: Comprehensive technical deep-dive. Thoroughly explain mechanisms, implementation nuances, protocols, and performance trade-offs.',
      in_depth: 'Length: Definitive architectural treatise. Exhaustive explanations, architectural trade-offs, comparative tables, failure modes, and future horizon outlook with minimal code blocks.',
    };

    const targetPreset = presetInstructions[input.preset] || presetInstructions.professional;

    const rewritePrompt = input.isFullArticle
      ? `You are writing or fully restructuring an editorial tech article on: "${input.headline || input.text.slice(0, 80)}"
Preset Style: ${input.preset.toUpperCase()} (${targetPreset})
${input.prompt ? `Custom Instructions: ${input.prompt}` : ''}

Existing Content / Topic Guide:
${input.text}

Requirements:
- Format completely in clean semantic HTML (<h2>, <h3>, <p>, <ul>, <li>, <blockquote>).
- Minimize Code Blocks: Significantly decrease code blocks (<pre><code>). Prioritize thorough conceptual and architectural explanations in prose, using code blocks only sparingly for brief, essential snippets where strictly necessary.
- Ensure genuine, complete technical content without any placeholder text or incomplete thoughts.
- Deliver publication-ready, deeply informative prose.`
      : `You are revising/rewriting the following excerpt or section from a DailyBuild Tech article:
Preset Style: ${input.preset.toUpperCase()} (${targetPreset})
${input.prompt ? `Custom Instructions: ${input.prompt}` : 'Improve flow, precision, technical depth, and readability.'}

Original Text:
"${input.text}"

Output the rewritten version using clean semantic HTML tags. Do not add conversational intros or apologies.`;

    const result = await providerRegistry.generate('rewrite', {
      model: input.model || '',
      prompt: rewritePrompt,
      systemInstruction: profile.systemPrompt,
    }, input.provider);

    // Validate that output is genuine and not placeholder
    if (!result.content || result.content.trim().length < 20 || result.content.toLowerCase().includes('technical report under compilation')) {
      throw new Error('AI Provider returned invalid placeholder content. Please try another provider or prompt.');
    }

    res.json({
      content: result.content,
      durationMs: result.durationMs,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate - AI Content Studio generation
const generateSchema = z.object({
  taskType: z.enum(['outline', 'article', 'rewrite', 'seo', 'summary']).default('article'),
  prompt: z.string().min(5),
  systemInstruction: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  responseJsonSchema: z.record(z.any()).optional(),
});

router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const input = generateSchema.parse(req.body);
    let systemInstruction = input.systemInstruction;
    if (!systemInstruction) {
      const profile = await getEditorialVoiceProfile();
      systemInstruction = profile.systemPrompt;
    }

    const result = await providerRegistry.generate(input.taskType, {
      model: input.model || '',
      prompt: input.prompt,
      systemInstruction,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      responseJsonSchema: input.responseJsonSchema,
    }, input.provider);

    // Validation: ensure substantial content
    if (!result.content || result.content.trim().length < 30 || result.content.toLowerCase().includes('technical report under compilation')) {
      throw new Error('AI Provider returned placeholder or incomplete content. Valid content required.');
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/models/recent - Save & return last 7 days models used by each provider
router.get('/models/recent', authenticate, async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let records: any[] = [];
    try {
      records = await db.query.usageRecords.findMany({
        where: gte(schema.usageRecords.createdAt, sevenDaysAgo),
        orderBy: [desc(schema.usageRecords.createdAt)],
      });
    } catch (e: any) {
      console.warn('[Usage Query Notice]:', e.message);
    }

    // Curated defaults so active providers have intelligent presets immediately
    const defaultsByProvider: Record<string, string[]> = {
      openrouter: ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001', 'anthropic/claude-3.5-haiku', 'meta-llama/llama-3.3-70b-instruct'],
      gemini: ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-1.5-flash'],
      tgpt: ['tgpt-windows', 'tgpt-linux', 'tgpt-default'],
      openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
      ollama: ['llama3.2', 'deepseek-r1', 'mistral'],
    };

    const grouped: Record<string, { modelId: string; lastUsedAt: string; count: number }[]> = {};

    // Group database usage logs
    for (const rec of records) {
      if (!grouped[rec.providerSlug]) {
        grouped[rec.providerSlug] = [];
      }
      const existing = grouped[rec.providerSlug].find(m => m.modelId === rec.modelId);
      if (existing) {
        existing.count += 1;
      } else {
        grouped[rec.providerSlug].push({
          modelId: rec.modelId,
          lastUsedAt: rec.createdAt.toISOString(),
          count: 1,
        });
      }
    }

    // Merge defaults if provider has fewer than 2 recent models recorded
    for (const [prov, defModels] of Object.entries(defaultsByProvider)) {
      if (!grouped[prov]) grouped[prov] = [];
      for (const defId of defModels) {
        if (!grouped[prov].some(m => m.modelId === defId)) {
          grouped[prov].push({
            modelId: defId,
            lastUsedAt: new Date().toISOString(),
            count: 1,
          });
        }
      }
    }

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/models/record - Explicitly save model usage in last 7 days history
router.post('/models/record', authenticate, async (req, res, next) => {
  try {
    const { providerSlug, modelId, taskType } = req.body;
    if (providerSlug && modelId) {
      await db.insert(schema.usageRecords).values({
        providerSlug,
        modelId,
        taskType: taskType || 'article',
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: '0.000000',
        durationMs: 0,
      });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/suggest-topics-rss - Suggest topics from fresh RSS stories, falling back to stale ones
const suggestTopicsRssSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  count: z.number().default(5),
});

router.post('/suggest-topics-rss', authenticate, async (req, res, next) => {
  try {
    const input = suggestTopicsRssSchema.parse(req.body);

    // 0. Fetch recent 16 generated articles from database to strictly exclude those topics
    const recent16Articles = await db.query.articles.findMany({
      orderBy: [desc(schema.articles.createdAt)],
      limit: 16,
      columns: { id: true, title: true, excerpt: true },
    });
    const recent16Titles = recent16Articles.map(a => a.title.trim()).filter(Boolean);
    const recent16Normalized = recent16Titles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // 1. Fetch newly discovered RSS items
    let items = await db.query.discoveredItems.findMany({
      where: eq(schema.discoveredItems.status, 'new'),
      orderBy: [desc(schema.discoveredItems.retrievedAt)],
      limit: 20,
    });
    let usedStale = false;

    // 2. If 0 new articles or RSS blogs, fall back to existing cached items in database
    if (items.length === 0) {
      usedStale = true;
      items = await db.query.discoveredItems.findMany({
        orderBy: [desc(schema.discoveredItems.retrievedAt)],
        limit: 20,
      });
    }

    // Filter out any items that match any of the recent 16 article titles
    if (recent16Normalized.length > 0) {
      items = items.filter(it => {
        const hNorm = (it.headline || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return !recent16Normalized.some(rt => rt === hNorm || (rt.length > 15 && hNorm.length > 15 && (rt.includes(hNorm) || hNorm.includes(rt))));
      });
    }

    // 4. Formulate contextual story digest
    let storyContext = '';
    if (items.length > 0) {
      storyContext = items
        .slice(0, 8)
        .map((it, idx) => `${idx + 1}. Headline: "${it.headline}"${it.summary ? ` - Summary: ${it.summary.slice(0, 160)}` : ''}`)
        .join('\n');
    }

    const exclusionBlock = recent16Titles.length > 0
      ? `\nCRITICAL EXCLUSION RULE (MANDATORY):
Under NO circumstances suggest, cover, or duplicate any of these ${recent16Titles.length} recently published article titles:
${recent16Titles.map((t, idx) => `${idx + 1}. "${t}"`).join('\n')}
You MUST ONLY suggest completely fresh, distinct topics other than these existing ones.`
      : '';

    const prompt = storyContext
      ? `Based on these recent engineering & tech RSS news stories:\n${storyContext}\n${exclusionBlock}\n\nFormulate ${input.count} trending, high-interest editorial headlines for a digital tech publication. Focus on popular platforms, comparisons, and breakthrough industry changes. Keep each headline punchy, compelling, and authoritative. Return each headline on a new line, nothing else.`
      : `Suggest ${input.count} trending, popular, highly engaging technology and AI news article headlines for a modern digital publication.\n${exclusionBlock}\nReturn each topic on a new line, nothing else.`;

    const result = await providerRegistry.generate('summary', {
      model: input.model || '',
      prompt,
      systemInstruction: 'You are an editorial director for a top tech news publication. Output only a list of high-interest headlines, one per line. Do NOT repeat or duplicate recently published topics.',
    }, input.provider);

    const topics = result.content
      .split('\n')
      .map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
      .filter(l => l.length > 10);

    res.json({
      topics,
      usedStale,
      storiesCount: items.length,
      excludedRecentTitles: recent16Titles,
      stories: items.map(it => ({
        id: it.id,
        headline: it.headline,
        url: it.canonicalUrl,
        isStale: it.status !== 'new',
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/recent-titles - Fetch recent 16 generated articles to enforce topic exclusion in UI
router.get('/recent-titles', authenticate, async (req, res, next) => {
  try {
    const list = await db.query.articles.findMany({
      orderBy: [desc(schema.articles.createdAt)],
      limit: 16,
      columns: { id: true, title: true, createdAt: true },
    });
    res.json(list.map(a => a.title.trim()).filter(Boolean));
  } catch (err) {
    next(err);
  }
});

export default router;
