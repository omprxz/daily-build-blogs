import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';
import { antigravityAdapter } from './antigravity.js';
import { codexAdapter } from './codex.js';
import { openRouterAdapter } from './openrouter.js';
import { GeminiAdapter } from './gemini.js';
import { OpenAIAdapter } from './openai.js';
import { GroqAdapter } from './groq.js';
import { OllamaAdapter } from './ollama.js';
import { tgptAdapter } from './tgpt.js';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { decryptApiKey } from '../../utils/security.js';
import { eq, and, or, isNull, ne } from 'drizzle-orm';

class AIProviderRegistry {
  private adapters = new Map<string, AIProviderAdapter>();

  constructor() {
    this.register(antigravityAdapter);
    this.register(codexAdapter);
    this.register(openRouterAdapter);
    this.register(new GeminiAdapter());
    this.register(tgptAdapter);
    this.register(new GroqAdapter());
    this.register(new OllamaAdapter());
    this.register(new OpenAIAdapter('openai', 'OpenAI', 'https://api.openai.com/v1'));
  }

  register(adapter: AIProviderAdapter) {
    this.adapters.set(adapter.slug, adapter);
  }

  getAdapter(slug: string): AIProviderAdapter {
    const adapter = this.adapters.get(slug);
    if (!adapter) {
      throw new Error(`AI Provider adapter '${slug}' not found.`);
    }
    return adapter;
  }

  getAllAdapters(): AIProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  async testAndDiscover(providerSlug: string, apiKey?: string, baseUrl?: string): Promise<TestConnectionResult> {
    const adapter = this.getAdapter(providerSlug);
    const result = await adapter.testConnection(apiKey, baseUrl);

    // If successful and connected to database, sync discovered models to ai_models table
    if (result.success && result.models.length > 0) {
      try {
        const providerRecord = await db.query.aiProviders.findFirst({
          where: eq(schema.aiProviders.slug, providerSlug)
        });

        if (providerRecord) {
          // Delete existing discovered models for clean refresh (preserve custom models)
          await db.delete(schema.aiModels).where(
            and(
              eq(schema.aiModels.providerId, providerRecord.id),
              or(
                isNull(schema.aiModels.pricingNotes),
                ne(schema.aiModels.pricingNotes, 'Custom Model')
              )
            )
          );

          // Find existing custom models to avoid duplicate insertions
          const existingModels = await db.query.aiModels.findMany({
            where: eq(schema.aiModels.providerId, providerRecord.id),
          });
          const existingModelIds = new Set(existingModels.map((m) => m.modelId));

          // Insert newly discovered models
          for (const m of result.models) {
            if (!existingModelIds.has(m.id)) {
              await db.insert(schema.aiModels).values({
                providerId: providerRecord.id,
                modelId: m.id,
                displayName: m.name,
                capabilities: m.capabilities,
                contextWindow: m.contextWindow || null,
                isDefault: m.isDefault || false,
                pricingNotes: m.pricingNotes || null,
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[Sync Models Warning]: ${err.message}`);
      }
    }

    return result;
  }

  private exhaustedProviders = new Set<string>();

  async generate(
    taskType: string,
    options: GenerationOptions,
    providerSlug?: string,
    skipCascade = false
  ): Promise<GenerationResult> {
    // 1. Resolve Provider and Decrypted API Key
    let slug = providerSlug;
    let apiKey: string | undefined;
    let baseUrl: string | undefined;

    if (!slug) {
      // Find first enabled provider from DB, skipping exhausted providers and prioritizing local/free providers
      const enabledProviders = await db.query.aiProviders.findMany({
        where: eq(schema.aiProviders.isEnabled, true)
      });
      const viable = enabledProviders.filter(p => !this.exhaustedProviders.has(p.slug) && p.slug !== 'openai');
      if (viable.length > 0) {
        slug = viable[0].slug;
        apiKey = viable[0].apiKeyEncrypted ? decryptApiKey(viable[0].apiKeyEncrypted) : undefined;
        baseUrl = viable[0].baseUrl || undefined;
      } else if (enabledProviders.length > 0 && !this.exhaustedProviders.has(enabledProviders[0].slug)) {
        slug = enabledProviders[0].slug;
        apiKey = enabledProviders[0].apiKeyEncrypted ? decryptApiKey(enabledProviders[0].apiKeyEncrypted) : undefined;
        baseUrl = enabledProviders[0].baseUrl || undefined;
      } else {
        // Fallback to Google Antigravity CLI or Gemini
        slug = 'antigravity';
      }
    } else {
      const prov = await db.query.aiProviders.findFirst({
        where: eq(schema.aiProviders.slug, slug)
      });
      if (prov) {
        apiKey = prov.apiKeyEncrypted ? decryptApiKey(prov.apiKeyEncrypted) : undefined;
        baseUrl = prov.baseUrl || undefined;
      }
    }

    const adapter = this.getAdapter(slug);
    let result: GenerationResult;
    try {
      result = await adapter.generateText(options, apiKey, baseUrl);
    } catch (err: any) {
      // Check if this error is an exhausted quota (e.g. OpenAI 429 credit_balance_exhausted)
      const errMsg = err.message || '';
      if (
        errMsg.includes('insufficient_quota') ||
        errMsg.includes('credit_balance_exhausted') ||
        errMsg.includes('You have no credits remaining')
      ) {
        this.exhaustedProviders.add(slug);
        console.warn(`[AI Provider Registry] Provider '${slug}' quota is exhausted. Temporarily bypassing '${slug}'.`);
      }

      // When Codex is selected, use it exclusively without silently falling back to other providers
      if (skipCascade || slug === 'codex' || providerSlug === 'codex') {
        throw err;
      }

      // If the primary provider fails, cascade to 5-level fallbacks excluding the failed provider
      console.warn(`[AI Provider Registry] Provider '${slug}' generation failed (${errMsg}). Cascading to 5-level fallbacks...`);
      try {
        const fallbackRes = await this.generateWithFallbacks(taskType, options, [], slug);
        return fallbackRes;
      } catch (cascadeErr: any) {
        throw new Error(`[${adapter.name}] Generation failed: ${errMsg}. Fallbacks error: ${cascadeErr.message}`);
      }
    }

    // Record token usage and cost in database asynchronously
    try {
      await db.insert(schema.usageRecords).values({
        providerSlug: slug,
        modelId: result.model,
        taskType,
        inputTokens: result.inputTokens || 0,
        outputTokens: result.outputTokens || 0,
        estimatedCostUsd: result.estimatedCostUsd || '0.000000',
        durationMs: result.durationMs,
      });
    } catch (e) {
      // Non-blocking log
    }

    return result;
  }

  async generateWithFallbacks(
    taskType: string,
    options: GenerationOptions,
    tiers: Array<{ provider?: string; model?: string }> = [],
    excludeSlug?: string
  ): Promise<GenerationResult & { tierUsed: number; attemptedTiers: string[] }> {
    const attempts: string[] = [];
    let lastError: Error | null = null;

    // Standard default fallback cascade prioritizing local host CLIs and fast zero-cost models
    const fallbackCandidates = [
      { provider: 'antigravity', model: 'automatic' },
      { provider: 'codex', model: 'automatic' },
      { provider: 'gemini', model: 'gemini-3.8-flash' },
      { provider: 'openrouter', model: 'openai/gpt-4o-mini' },
      { provider: 'tgpt', model: 'command-r' },
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'ollama', model: 'llama3' },
    ];

    // Build ordered list of tiers starting with user-provided tiers
    const fallbackTiers: Array<{ provider: string; model?: string }> = [];
    const usedCombos = new Set<string>();

    if (excludeSlug) {
      usedCombos.add(excludeSlug);
    }
    for (const ex of this.exhaustedProviders) {
      usedCombos.add(ex);
    }

    for (const t of tiers) {
      if (t && t.provider && t.provider !== 'none' && !usedCombos.has(t.provider)) {
        const comboKey = `${t.provider}:${t.model || ''}`;
        fallbackTiers.push({ provider: t.provider, model: t.model || options.model });
        usedCombos.add(comboKey);
      }
    }

    // Always pad until at least 5 distinct fallback tiers are present
    for (const cand of fallbackCandidates) {
      if (fallbackTiers.length >= 5) break;
      const comboKey = `${cand.provider}:${cand.model || ''}`;
      if (!usedCombos.has(comboKey) && !usedCombos.has(cand.provider)) {
        fallbackTiers.push(cand);
        usedCombos.add(comboKey);
      }
    }

    for (let i = 0; i < fallbackTiers.length; i++) {
      const tier = fallbackTiers[i];
      const providerSlug = tier.provider || 'gemini';
      const model = tier.model || options.model;
      const attemptLabel = `Tier ${i + 1}: ${providerSlug} (${model || 'default'})`;
      attempts.push(attemptLabel);

      try {
        // Pass skipCascade = true to prevent infinite recursive cascade calls!
        const result = await this.generate(taskType, { ...options, model }, providerSlug, true);
        return {
          ...result,
          tierUsed: i + 1,
          attemptedTiers: attempts,
        };
      } catch (err: any) {
        console.warn(`[AI Fallback Tier ${i + 1} Failed] ${providerSlug}: ${err.message}`);
        lastError = err;
      }
    }

    throw new Error(
      `All ${fallbackTiers.length} AI fallback tiers failed. Attempts: [${attempts.join(' -> ')}]. Last error: ${lastError?.message}`
    );
  }
}

export const providerRegistry = new AIProviderRegistry();
