import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { researchService } from '../research/rss.js';
import { imageService } from '../image/image-service.js';
import { config } from '../../config/index.js';
import { eq, desc, and, or, gte } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';
import { getEditorialVoiceProfile } from '../ai/editorial-voice.js';

export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    nodeType: 'trigger' | 'research' | 'ai' | 'logic' | 'publishing' | 'utility';
    config?: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface StepLog {
  nodeId: string;
  nodeType: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  outputSummary?: string;
  error?: string;
}

export class WorkflowEngine {
  async executeWorkflow(
    workflowId: string,
    triggerSource: string = 'manual',
    sampleInput?: any
  ): Promise<{ executionId: string; status: string; logs: StepLog[]; articleCreated?: any; warning?: string }> {
    // Check Emergency Kill Switch
    if (config.automation.emergencyKillSwitch) {
      throw new Error('Automation Emergency Kill Switch is ACTIVE. All workflow executions are globally paused.');
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, workflowId)
    });

    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found.`);
    }

    const settings: Record<string, any> = (workflow.settingsJson as any) || {};

    // 0. Concurrency Guard: Check if this workflow is currently running to prevent duplicate simultaneous executions
    const runningExecution = await db.query.workflowExecutions.findFirst({
      where: and(
        eq(schema.workflowExecutions.workflowId, workflowId),
        eq(schema.workflowExecutions.status, 'running')
      )
    });

    if (runningExecution) {
      const runDuration = Date.now() - new Date(runningExecution.startedAt).getTime();
      // If running for under 15 minutes, prevent duplicate concurrent run
      if (runDuration < 15 * 60 * 1000) {
        console.warn(`[Workflow Engine] Workflow "${workflow.name}" is already executing (ID: ${runningExecution.id.slice(0, 8)}). Skipping duplicate trigger.`);
        return {
          executionId: runningExecution.id,
          status: 'running',
          logs: (runningExecution.stepLogs as any) || [],
          warning: 'Execution already in progress. Skipped duplicate trigger.',
        };
      } else {
        console.warn(`[Workflow Engine] Cleaning up stale execution ID: ${runningExecution.id.slice(0, 8)} older than 15 minutes.`);
        await db.update(schema.workflowExecutions)
          .set({
            status: 'failed',
            errorMessage: 'Execution timed out after 15 minutes.',
            completedAt: new Date(),
          })
          .where(eq(schema.workflowExecutions.id, runningExecution.id));
      }
    }

    // 1. Check Cooldown / Freeze Stop Base Timing (skip for manual test runs and scheduled cron triggers)
    const cooldownMins = Number(settings.cooldownMins || settings.minIntervalMins || 0);
    if (cooldownMins > 0 && settings.lastExecutedAt) {
      const lastExecTime = new Date(settings.lastExecutedAt).getTime();
      const elapsedMins = (Date.now() - lastExecTime) / (1000 * 60);
      if (elapsedMins < cooldownMins && triggerSource !== 'manual_test_run' && triggerSource !== 'scheduled_cron') {
        throw new Error(
          `Workflow execution cooldown active. Cooldown requires ${cooldownMins}m between runs (elapsed: ${Math.round(elapsedMins)}m). Next trigger available in ${Math.round(cooldownMins - elapsedMins)}m.`
        );
      }
    }

    // Load recent 16 generated articles from database to strictly exclude those topics from this execution
    const recent16Articles = await db.query.articles.findMany({
      orderBy: [desc(schema.articles.createdAt)],
      limit: 16,
      columns: { id: true, title: true, canonicalUrl: true }
    });
    const recent16Titles = recent16Articles.map(a => a.title.trim()).filter(Boolean);
    const recent16TitlesNormalized = recent16Titles.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const recentTitlesExclusionPrompt = recent16Titles.length > 0
      ? `\nCRITICAL TOPIC EXCLUSION CONSTRAINT (MANDATORY):
Under NO circumstances write about, outline, cover, or duplicate any of these ${recent16Titles.length} recently published article topics:
${recent16Titles.map((t, idx) => `${idx + 1}. "${t}"`).join('\n')}
You MUST ONLY create content about a completely fresh, distinct, and new technology topic other than these existing ones.\n`
      : '';

    // Create execution record
    const [execution] = await db.insert(schema.workflowExecutions).values({
      workflowId,
      status: 'running',
      triggerSource,
      stepLogs: [],
      startedAt: new Date(),
    }).returning();

    const nodes: WorkflowNode[] = (workflow.nodesJson as any) || [];
    const logs: StepLog[] = [];
    let runtimeContext: Record<string, any> = {
      workflowName: workflow.name,
      triggerInput: sampleInput || {},
      discoveredStories: [],
      headline: sampleInput?.headline || sampleInput?.title,
      outline: null,
      generatedArticle: null,
      featuredImage: null,
      createdArticleId: null,
      publishedStatus: null,
      tokensUsed: 0,
      totalCostUsd: '0.0000',
    };

    try {
      for (const node of nodes) {
        const stepStart = Date.now();
        const stepLog: StepLog = {
          nodeId: node.id,
          nodeType: node.data.nodeType,
          label: node.data.label,
          status: 'running',
          startedAt: new Date().toISOString(),
        };

        // Persist in-progress stepLog to DB for real-time live monitoring
        try {
          await db.update(schema.workflowExecutions)
            .set({ stepLogs: [...logs, stepLog] })
            .where(eq(schema.workflowExecutions.id, execution.id));
        } catch {}

        try {
          const nodeLabel = (node.data.label || '').toLowerCase();
          const nodeConfig = node.data.config || {};

          if (node.data.nodeType === 'trigger') {
            // Trigger node
            const timingDesc = nodeConfig.timing || workflow.cronExpression || settings.cronExpression || 'Immediate';
            stepLog.outputSummary = `Triggered via ${triggerSource} (${timingDesc}). Context verified.`;
          } else if (nodeLabel.includes('rss') || nodeLabel.includes('poll') || node.data.nodeType === 'research') {
            // Use existing discovered items from database; do not fetch all external RSS feeds again during automation
            let newItems = await db.query.discoveredItems.findMany({
              where: eq(schema.discoveredItems.status, 'new'),
              orderBy: [desc(schema.discoveredItems.publishedDate)],
              limit: 30,
            });

            if (newItems.length === 0) {
              newItems = await db.query.discoveredItems.findMany({
                orderBy: [desc(schema.discoveredItems.retrievedAt)],
                limit: 30,
              });
            }

            runtimeContext.discoveredStories = newItems;

            // Pick latest discovered item that doesn't already have an article created
            if (!runtimeContext.headline) {

              for (const item of newItems) {
                const cleanHeadline = (item.headline || '').trim();
                if (!cleanHeadline) continue;

                // Check if this matches any of the recent 16 generated articles
                const isRecentDuplicate = recent16TitlesNormalized.some(rt => {
                  const hNorm = cleanHeadline.toLowerCase().replace(/[^a-z0-9]/g, '');
                  return rt === hNorm || (rt.length > 15 && hNorm.length > 15 && (rt.includes(hNorm) || hNorm.includes(rt)));
                });

                if (isRecentDuplicate) {
                  await db.update(schema.discoveredItems)
                    .set({ status: 'used' })
                    .where(eq(schema.discoveredItems.id, item.id));
                  continue;
                }

                // Check if an article already exists with this headline or canonicalUrl
                const existingArt = await db.query.articles.findFirst({
                  where: or(
                    eq(schema.articles.title, cleanHeadline),
                    item.canonicalUrl ? eq(schema.articles.canonicalUrl, item.canonicalUrl) : eq(schema.articles.title, cleanHeadline)
                  ),
                });

                if (!existingArt) {
                  runtimeContext.headline = cleanHeadline;
                  runtimeContext.discoveredItemId = item.id;
                  runtimeContext.categoryId = item.categoryId;
                  runtimeContext.canonicalUrl = item.canonicalUrl;
                  // Immediately mark as processing to prevent any concurrent execution from picking it
                  await db.update(schema.discoveredItems)
                    .set({ status: 'processing' })
                    .where(eq(schema.discoveredItems.id, item.id));
                  break;
                } else {
                  // Mark as already used
                  await db.update(schema.discoveredItems)
                    .set({ status: 'used' })
                    .where(eq(schema.discoveredItems.id, item.id));
                }
              }
            }

            stepLog.outputSummary = `Discovered items evaluated (${newItems.length} candidate stories). Selected target headline: "${runtimeContext.headline || 'None detected'}".`;
          } else if (nodeLabel.includes('outline')) {
            // AI Outline node with configurable 5-tier fallback cascade
            const headline = runtimeContext.headline || runtimeContext.triggerInput?.headline || 'Architectural Advances in Modern Cloud Systems';
            const selectedProvider = nodeConfig.provider || 'antigravity';
            const selectedModel = nodeConfig.model || (selectedProvider === 'codex' ? 'gpt-6-luna' : 'antigravity-flash');
            const tiers: Array<{ provider: string; model?: string }> = [
              { provider: selectedProvider, model: selectedModel }
            ];
            // Configurable Fallback Tiers 1 to 4 (Levels 2 to 5)
            if (nodeConfig.fallback1Provider && nodeConfig.fallback1Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback1Provider, model: nodeConfig.fallback1Model });
            }
            if (nodeConfig.fallback2Provider && nodeConfig.fallback2Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback2Provider, model: nodeConfig.fallback2Model });
            }
            if (nodeConfig.fallback3Provider && nodeConfig.fallback3Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback3Provider, model: nodeConfig.fallback3Model });
            }
            if (nodeConfig.fallback4Provider && nodeConfig.fallback4Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback4Provider, model: nodeConfig.fallback4Model });
            }

            const outlineVoice = await getEditorialVoiceProfile();
            const aiRes = await providerRegistry.generateWithFallbacks('outline', {
              model: selectedModel,
              prompt: `Create a structured technical outline for a breaking tech story: "${headline}". Break down into 5 key sections: 1. Executive Context, 2. Core Architecture, 3. Implementation Details, 4. Limitations & Bottlenecks, 5. Conclusion & Recommendations.\n\n${outlineVoice.styleDirectives}${recentTitlesExclusionPrompt}`,
              systemInstruction: `You are an elite technology editor for DailyBuild Tech. Produce a high-density, 5-section outline adhering to our active editorial priorities and directives. Strictly exclude and avoid duplicating recent published articles. ${outlineVoice.learnedTone}`,
            }, tiers);

            runtimeContext.outline = aiRes.content;
            runtimeContext.tokensUsed += (aiRes.inputTokens || 0) + (aiRes.outputTokens || 0);
            stepLog.outputSummary = `Outline generated using ${aiRes.attemptedTiers[aiRes.tierUsed - 1]} (${(aiRes.inputTokens || 0) + (aiRes.outputTokens || 0)} tokens).`;
          } else if (
            (node.data.nodeType === 'ai' && !nodeLabel.includes('image') && !nodeLabel.includes('outline') && !nodeLabel.includes('save draft') && !nodeLabel.includes('auto-publish')) ||
            (nodeLabel.includes('article') && !nodeLabel.includes('save draft') && !nodeLabel.includes('auto-publish') && !nodeLabel.includes('outline')) ||
            nodeLabel.includes('full article') ||
            nodeLabel.includes('article draft') ||
            nodeLabel.includes('content generation')
          ) {
            // AI Full Article Generation with configurable 5-tier fallback cascade
            const headline = runtimeContext.headline || runtimeContext.triggerInput?.headline || 'Building Resilient Distributed Systems';
            const outlineContext = runtimeContext.outline ? `\n\nOutline Guide:\n${runtimeContext.outline}` : '';
            const selectedProvider = nodeConfig.provider || 'antigravity';
            const selectedModel = nodeConfig.model || (selectedProvider === 'codex' ? 'gpt-6-luna' : 'antigravity-flash');
            const tiers: Array<{ provider: string; model?: string }> = [
              { provider: selectedProvider, model: selectedModel }
            ];
            // Configurable Fallback Tiers 1 to 4 (Levels 2 to 5)
            if (nodeConfig.fallback1Provider && nodeConfig.fallback1Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback1Provider, model: nodeConfig.fallback1Model });
            }
            if (nodeConfig.fallback2Provider && nodeConfig.fallback2Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback2Provider, model: nodeConfig.fallback2Model });
            }
            if (nodeConfig.fallback3Provider && nodeConfig.fallback3Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback3Provider, model: nodeConfig.fallback3Model });
            }
            if (nodeConfig.fallback4Provider && nodeConfig.fallback4Provider !== 'none') {
              tiers.push({ provider: nodeConfig.fallback4Provider, model: nodeConfig.fallback4Model });
            }

            const editorialVoice = await getEditorialVoiceProfile();

            const articlePrompt = `Write an in-depth, authoritative, and engaging full-length editorial article on: "${headline}".

Editorial Voice & Perspective Directives:
${editorialVoice.styleDirectives}

Content Requirements & Required Sections:
1. Executive Summary & Context: A compelling opening examining the current technological landscape and problem statement.
2. Technical Architecture & Core Mechanisms: Detailed technical explanations of the underlying mechanisms, protocols, and data structures.
3. Practical Applications & Implementation Examples: Concrete real-world use cases, architectural patterns, and practical explanations. Minimize code blocks—favor conceptual analysis, workflows, and concise snippets only when strictly necessary.
4. Trade-offs, Limitations & Edge Cases: Critical evaluation of performance bottlenecks, scalability considerations, operational costs, and known limitations.
5. Strategic Outlook & Conclusions: Forward-looking summary with practical recommendations and future outlook.

Formatting Guidelines:
- Use clean semantic HTML tags: <h2> for main sections, <h3> for subheadings, <p> for paragraphs, <ul>/<li> for comparisons and key points, and <blockquote> for key insights.
- Minimize Code Blocks: Significantly decrease code blocks (<pre><code>). Focus on rigorous written explanations, mechanisms, and architectural tradeoffs; use code blocks only sparingly for brief, essential snippets.
- Provide rigorous, informative explanations with zero robotic fluff.
- MANDATORY: Generate genuine, complete article content. NEVER output placeholder text, apologies, or compilation notices.${outlineContext}${recentTitlesExclusionPrompt}`;

            const aiRes = await providerRegistry.generateWithFallbacks('article', {
              model: nodeConfig.model || 'antigravity-flash',
              prompt: articlePrompt,
              systemInstruction: `You are a Principal Systems Architect and Lead Technology Editor for DailyBuild Tech. You write authoritative, rigorous, and beautifully formatted technical journalism. Never repeat recent article topics. ${editorialVoice.styleDirectives}`,
            }, tiers);

            const rawContent = (aiRes.content || '').trim();
            const textOnly = rawContent.replace(/<[^>]*>/g, '').trim();

            if (textOnly.length < 200 || rawContent.includes('Technical report under compilation by Daily Build') || rawContent.toLowerCase().includes('placeholder text')) {
              throw new Error('Generated article failed editorial quality validation: output is too short or contains placeholder text.');
            }

            runtimeContext.generatedArticle = {
              title: headline,
              content: rawContent,
            };
            runtimeContext.tokensUsed += (aiRes.inputTokens || 0) + (aiRes.outputTokens || 0);
            stepLog.outputSummary = `Full article generated via ${aiRes.attemptedTiers[aiRes.tierUsed - 1]} (${aiRes.durationMs}ms, ${(aiRes.inputTokens || 0) + (aiRes.outputTokens || 0)} tokens).`;
          } else if (nodeLabel.includes('image') || (node.data.nodeType as any) === 'image') {
            // Featured Visual generation with 3-Level Fallback Cascade
            const title = runtimeContext.generatedArticle?.title || runtimeContext.headline || 'High-Performance Cloud Infrastructure';
            const categoryName = runtimeContext.categoryName || 'Technology';
            const visualStyle = nodeConfig.style || '16:9 Editorial illustration, sleek dark mode palette';

            // Tier 1: Primary
            const primaryProvider = nodeConfig.provider || 'antigravity';
            const primaryModel = nodeConfig.model || (primaryProvider === 'codex' ? 'gpt-6-luna' : primaryProvider === 'gemini' ? 'imagen-3.0-generate-002' : 'gemini-3.8-flash');

            // Tier 2: Secondary Fallback
            const secondaryProvider = nodeConfig.fallback1Provider || (primaryProvider === 'codex' ? 'antigravity' : 'codex');
            const secondaryModel = nodeConfig.fallback1Model || (secondaryProvider === 'codex' ? 'gpt-6-luna' : 'gemini-3.8-flash');

            // Tier 3: Tertiary Fallback
            const tertiaryProvider = nodeConfig.fallback2Provider || (primaryProvider === 'gemini' ? 'antigravity' : 'gemini');
            const tertiaryModel = nodeConfig.fallback2Model || (tertiaryProvider === 'gemini' ? 'imagen-3.0-generate-002' : 'gemini-3.8-flash');

            const visualTiers = [
              { level: 1, label: 'Primary', provider: primaryProvider, model: primaryModel },
              { level: 2, label: 'Level 2 Fallback', provider: secondaryProvider, model: secondaryModel },
              { level: 3, label: 'Level 3 Fallback', provider: tertiaryProvider, model: tertiaryModel },
            ].filter((t) => t.provider && t.provider !== 'none');

            let visualResult: any = null;
            const tierLogs: string[] = [];

            try {
              for (const tier of visualTiers) {
                try {
                  console.log(`[Workflow Engine] Attempting Image Tier ${tier.level} (${tier.provider} • ${tier.model}) for "${title}"`);

                  if (tier.provider === 'local_agent' || tier.provider === 'webhook' || tier.provider === 'chatgpt_local') {
                    const { queueLocalImageJob } = await import('../../routes/automation.js');
                    const { job, dispatchedWebhook } = await queueLocalImageJob({
                      articleId: runtimeContext.createdArticleId || null,
                      articleTitle: title,
                      categoryName,
                      excerpt: runtimeContext.generatedArticle?.content?.slice(0, 200),
                      visualStyle,
                      aspectRatio: nodeConfig.aspectRatio || '16:9',
                      autoPublishOnComplete: nodeConfig.autoPublish !== false,
                      webhookUrlOverride: nodeConfig.webhookUrlOverride,
                    });
                    runtimeContext.pendingImageJob = job;

                    if (dispatchedWebhook) {
                      tierLogs.push(`Tier ${tier.level} (${tier.provider}): Dispatched webhook for Job #${job.id.slice(0, 8)}.`);
                      visualResult = {
                        imageUrl: job.uploadedImageUrl || `/uploads/gen_local_agent_${Date.now()}.svg`,
                        providerSlug: 'local_agent',
                        modelId: 'chatgpt-web',
                        isPendingAgent: true,
                      };
                      break;
                    } else {
                      tierLogs.push(`Tier ${tier.level} (${tier.provider}): Webhook not reachable, falling through to next tier.`);
                      continue;
                    }
                  } else {
                    const imgRes = await imageService.generateFeaturedImage({
                      topic: title,
                      title,
                      category: categoryName,
                      provider: tier.provider,
                      modelId: tier.model,
                      visualStyle,
                    });

                    if (imgRes && imgRes.imageUrl) {
                      visualResult = imgRes;
                      tierLogs.push(`Tier ${tier.level} (${tier.provider}): Successfully synthesized ${imgRes.imageUrl}`);
                      break;
                    }
                  }
                } catch (tierErr: any) {
                  console.warn(`[Workflow Engine] Visual Tier ${tier.level} (${tier.provider}) failed: ${tierErr.message}`);
                  tierLogs.push(`Tier ${tier.level} (${tier.provider}) failed: ${tierErr.message}`);
                }
              }

              // Safety fail-safe if all tiers failed
              if (!visualResult) {
                console.warn('[Workflow Engine] All configured visual tiers failed. Attempting SVG fallback.');
                try {
                  const fallbackRes = await imageService.generateFeaturedImage({
                    topic: title,
                    title,
                    category: categoryName,
                    provider: 'antigravity',
                    visualStyle,
                  });
                  visualResult = fallbackRes;
                  tierLogs.push(`Safety Fallback: Vector SVG generated at ${fallbackRes?.imageUrl}`);
                } catch (fallbackErr: any) {
                  console.warn('[Workflow Engine] Fallback image generation also failed:', fallbackErr.message);
                }
              }
            } catch (outerImgErr: any) {
              console.warn('[Workflow Engine] Visual step error:', outerImgErr.message);
              tierLogs.push(`Visual step error: ${outerImgErr.message}`);
            }

            // If image generation failed, timed out, or returns no usable image, continue publishing without an image
            runtimeContext.featuredImage = visualResult || null;
            stepLog.outputSummary = visualResult
              ? `Visual synthesized via ${visualResult.providerSlug} (${visualResult.imageUrl}) [${tierLogs.join(' | ')}]`
              : `Visual generation skipped/failed [${tierLogs.join(' | ')}]. Continuing workflow without image.`;
          } else if (
            node.data.nodeType === 'publishing' ||
            nodeLabel.includes('auto-publish') ||
            nodeLabel.includes('publish article') ||
            nodeLabel.includes('save draft') ||
            nodeLabel.includes('save as draft') ||
            nodeLabel === 'publish' ||
            nodeLabel === 'auto-publish'
          ) {
            // Publishing / Auto-Publish node: writes directly to articles database
            const title = runtimeContext.generatedArticle?.title || runtimeContext.headline || 'Breaking Tech Architecture Dispatch';
            const content = runtimeContext.generatedArticle?.content;

            if (!content || content.includes('Technical report under compilation by Daily Build') || content.trim().length < 200) {
              throw new Error('Cannot publish article: No complete, genuine content was produced in previous workflow steps.');
            }
            // If the node config explicitly sets autoPublish, use it. Otherwise, if workflow settings has autoPublishEnabled, check that.
            const autoPublishActive = nodeConfig.autoPublish !== undefined
              ? Boolean(nodeConfig.autoPublish)
              : (settings.autoPublishEnabled !== false && !nodeLabel.includes('save draft'));
            const targetStatus = autoPublishActive ? 'published' : 'draft';

            // Find default category and author
            const category = runtimeContext.categoryId
              ? await db.query.categories.findFirst({ where: eq(schema.categories.id, runtimeContext.categoryId) })
              : await db.query.categories.findFirst();

            const author = await db.query.users.findFirst({
              where: eq(schema.users.role, 'admin'),
            });

            if (!author || !category) {
              throw new Error('Cannot publish: Admin author or category not found.');
            }

            const slug = title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') + `-${Date.now().toString(36)}`;

            const cleanHtml = sanitizeHtml(content, {
              allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'pre', 'code', 'blockquote']),
              allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                '*': ['class', 'id'],
                'img': ['src', 'alt', 'title', 'loading'],
                'a': ['href', 'target', 'rel'],
              },
            });

            const excerpt = cleanHtml.replace(/<[^>]*>/g, '').slice(0, 180) + '...';

            let createdArticle: any = null;

            // Check if article was already created in this workflow execution context or in DB
            if (runtimeContext.createdArticleId) {
              const [updated] = await db.update(schema.articles)
                .set({
                  title,
                  excerpt,
                  contentHtml: cleanHtml,
                  contentMarkdown: content,
                  categoryId: category.id,
                  featuredImage: runtimeContext.featuredImage?.imageUrl || undefined,
                  featuredImageAlt: title,
                  status: targetStatus,
                  readingTimeMins: Math.max(1, Math.round(cleanHtml.length / 1000)),
                  metaTitle: title,
                  metaDescription: excerpt,
                  publishedAt: autoPublishActive ? new Date() : undefined,
                  updatedAt: new Date(),
                })
                .where(eq(schema.articles.id, runtimeContext.createdArticleId))
                .returning();
              createdArticle = updated;
            } else {
              // Deduplication check: check if an article with identical title or canonicalUrl already exists
              const existingArticle = await db.query.articles.findFirst({
                where: or(
                  eq(schema.articles.title, title),
                  runtimeContext.canonicalUrl ? eq(schema.articles.canonicalUrl, runtimeContext.canonicalUrl) : eq(schema.articles.title, title)
                ),
              });

              if (existingArticle) {
                console.log(`[Workflow Engine] Article "${title}" already exists (ID: ${existingArticle.id}). Updating instead of creating duplicate.`);
                const [updated] = await db.update(schema.articles)
                  .set({
                    excerpt,
                    contentHtml: cleanHtml,
                    contentMarkdown: content,
                    categoryId: category.id,
                    featuredImage: runtimeContext.featuredImage?.imageUrl || existingArticle.featuredImage || undefined,
                    featuredImageAlt: title,
                    status: targetStatus,
                    readingTimeMins: Math.max(1, Math.round(cleanHtml.length / 1000)),
                    publishedAt: autoPublishActive && !existingArticle.publishedAt ? new Date() : undefined,
                    updatedAt: new Date(),
                  })
                  .where(eq(schema.articles.id, existingArticle.id))
                  .returning();
                createdArticle = updated;
              } else {
                const [inserted] = await db.insert(schema.articles).values({
                  title,
                  slug,
                  excerpt,
                  contentHtml: cleanHtml,
                  contentMarkdown: content,
                  categoryId: category.id,
                  authorId: author.id,
                  featuredImage: runtimeContext.featuredImage?.imageUrl || null,
                  featuredImageAlt: title,
                  status: targetStatus,
                  readingTimeMins: Math.max(1, Math.round(cleanHtml.length / 1000)),
                  isFeaturedLead: false,
                  isTrending: true,
                  metaTitle: title,
                  metaDescription: excerpt,
                  canonicalUrl: runtimeContext.canonicalUrl || null,
                  tags: ['Automation', 'AI', 'System Architecture'],
                  publishedAt: autoPublishActive ? new Date() : null,
                }).returning();
                createdArticle = inserted;
              }
            }

            // Link discovered item if any to prevent re-processing
            if (runtimeContext.discoveredItemId) {
              await db.update(schema.discoveredItems)
                .set({ status: 'used' })
                .where(eq(schema.discoveredItems.id, runtimeContext.discoveredItemId));
            }

            // Link pending Local AI Agent image job if generated in previous step
            if (runtimeContext.pendingImageJob?.id) {
              await db.update(schema.imageAutomationJobs)
                .set({
                  articleId: createdArticle.id,
                  updatedAt: new Date(),
                })
                .where(eq(schema.imageAutomationJobs.id, runtimeContext.pendingImageJob.id));
            }

            runtimeContext.createdArticleId = createdArticle.id;
            runtimeContext.publishedStatus = targetStatus;

            // Trigger Outbound Webhook if configured in workflow settings
            const outboundWebhookUrl = settings.outboundWebhookUrl || nodeConfig.webhookUrl;
            if (outboundWebhookUrl) {
              try {
                await fetch(outboundWebhookUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'article.auto_published',
                    articleId: createdArticle.id,
                    title: createdArticle.title,
                    slug: createdArticle.slug,
                    status: targetStatus,
                    publishedAt: createdArticle.publishedAt,
                    workflowId: workflow.id,
                  }),
                });
              } catch (hookErr: any) {
                console.warn(`[Outbound Webhook Warning]: ${hookErr.message}`);
              }
            }

            stepLog.outputSummary = `Article "${title}" ${targetStatus.toUpperCase()} successfully (ID: ${createdArticle.id}, Slug: /article/${createdArticle.slug}).`;
          } else {
            // Generic step
            stepLog.outputSummary = `Executed step ${node.data.label} with status OK.`;
          }

          stepLog.status = 'success';
          stepLog.completedAt = new Date().toISOString();
          stepLog.durationMs = Date.now() - stepStart;
        } catch (nodeErr: any) {
          stepLog.status = 'failed';
          stepLog.error = nodeErr.message;
          stepLog.completedAt = new Date().toISOString();
          stepLog.durationMs = Date.now() - stepStart;
          logs.push(stepLog);
          try {
            await db.update(schema.workflowExecutions)
              .set({ stepLogs: logs, status: 'failed', errorMessage: nodeErr.message })
              .where(eq(schema.workflowExecutions.id, execution.id));
          } catch {}
          throw nodeErr;
        }

        logs.push(stepLog);
        try {
          await db.update(schema.workflowExecutions)
            .set({ stepLogs: logs })
            .where(eq(schema.workflowExecutions.id, execution.id));
        } catch {}
      }

      // Update Workflow Settings state persistence (remember last generated items & timestamp)
      const updatedSettings = {
        ...settings,
        lastExecutedAt: new Date().toISOString(),
        lastGeneratedArticleTitle: runtimeContext.generatedArticle?.title || runtimeContext.headline || null,
        lastGeneratedArticleId: runtimeContext.createdArticleId,
        lastGeneratedTimestamp: Date.now(),
      };

      await db.update(schema.workflows)
        .set({
          settingsJson: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(schema.workflows.id, workflow.id));

      // Update execution as completed
      await db.update(schema.workflowExecutions)
        .set({
          status: 'completed',
          completedAt: new Date(),
          stepLogs: logs,
          tokensUsed: runtimeContext.tokensUsed,
        })
        .where(eq(schema.workflowExecutions.id, execution.id));

      return {
        executionId: execution.id,
        status: 'completed',
        logs,
        articleCreated: runtimeContext.createdArticleId ? {
          id: runtimeContext.createdArticleId,
          status: runtimeContext.publishedStatus,
        } : null,
      };
    } catch (err: any) {
      await db.update(schema.workflowExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: err.message,
          stepLogs: logs,
        })
        .where(eq(schema.workflowExecutions.id, execution.id));

      return { executionId: execution.id, status: 'failed', logs };
    }
  }
}

export const workflowEngine = new WorkflowEngine();
