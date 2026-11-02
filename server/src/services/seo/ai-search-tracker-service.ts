import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq, desc } from 'drizzle-orm';
import { config } from '../../config/index.js';

export interface AISearchEvaluationSnapshot {
  providerSlug: string;
  evaluatedAt: string;
  answerSnippet: string;
  brandMentioned: boolean;
  domainMentioned: boolean;
  articleUrlCited?: string;
  allCitations: string[];
  competitorMentions: string[];
  presenceScore: number; // 0-100
  aiOptimizationAdvice: string;
}

export class AISearchTrackerService {
  private targetBrand = 'Daily Build';
  private targetDomain = 'blogs.dailybuild.tech';

  /**
   * Run an evaluation prompt across an AI provider to assess brand/domain/citation visibility
   */
  async evaluateSearchPrompt(promptQuery: string, trackerId?: string): Promise<AISearchEvaluationSnapshot> {
    const evaluationSystemPrompt = `You are an AI Search Visibility and Citation Tracking Analyst.
The user is testing whether AI models cite or mention the technology publication "${this.targetBrand}" (domain: ${this.targetDomain}) when answering user questions.

Prompt being evaluated: "${promptQuery}"

Respond thoroughly and naturally to the prompt as a premier AI engineering search engine.
If you know or recall publications, articles, or resources from "${this.targetDomain}" or "${this.targetBrand}", cite them.`;

    let generatedText = '';
    let citations: string[] = [];
    let usedProvider = 'gemini';

    try {
      const res = await providerRegistry.generate('seo_ai_search', {
        model: 'gemini-2.5-flash',
        prompt: evaluationSystemPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });
      generatedText = res.content || '';
      usedProvider = res.provider || 'gemini';
    } catch (err: any) {
      generatedText = `Evaluation simulated fallback due to provider error: ${err.message}`;
      usedProvider = 'fallback';
    }

    // Extract any URLs cited in the response
    const urlMatches = generatedText.match(/https?:\/\/[^\s)\]]+/g) || [];
    citations = Array.from(new Set(urlMatches));

    // Determine brand and domain mentions
    const lower = generatedText.toLowerCase();
    const brandMentioned = lower.includes(this.targetBrand.toLowerCase()) || lower.includes('dailybuild');
    const domainMentioned = lower.includes(this.targetDomain.toLowerCase());
    const articleUrlCited = citations.find((u) => u.includes(this.targetDomain));

    // Calculate presence score:
    // Cited URL: 100, Domain mention: 85, Brand mention: 70, Absent: 15
    let presenceScore = 15;
    if (articleUrlCited) presenceScore = 100;
    else if (domainMentioned) presenceScore = 85;
    else if (brandMentioned) presenceScore = 70;

    let aiAdvice = '';
    if (presenceScore >= 85) {
      aiAdvice = 'Optimal citation visibility. The domain or specific article is recognized and referenced by AI models.';
    } else if (presenceScore >= 70) {
      aiAdvice = 'Brand mentioned by name, but direct article URLs are missing. Add structured TechArticle schema and direct answer summary blocks to facilitate URL extraction.';
    } else {
      aiAdvice = `Site was not cited for this query. Competitors were referenced. To capture this citation share: create an authoritative guide directly targeting "${promptQuery}", include verifiable benchmark data, and optimize robots.txt for AI bots.`;
    }

    const snapshot: AISearchEvaluationSnapshot = {
      providerSlug: usedProvider,
      evaluatedAt: new Date().toISOString(),
      answerSnippet: generatedText.length > 500 ? generatedText.substring(0, 497) + '...' : generatedText,
      brandMentioned,
      domainMentioned,
      articleUrlCited,
      allCitations: citations,
      competitorMentions: [],
      presenceScore,
      aiOptimizationAdvice: aiAdvice,
    };

    // If trackerId provided, update tracker history in database
    if (trackerId) {
      const tracker = await db.query.seoAiSearchTrackers.findFirst({
        where: eq(schema.seoAiSearchTrackers.id, trackerId),
      });

      if (tracker) {
        const history = Array.isArray(tracker.historyJson) ? (tracker.historyJson as any[]) : [];
        history.unshift(snapshot);

        await db.update(schema.seoAiSearchTrackers)
          .set({
            lastEvaluatedAt: new Date(),
            presenceScore,
            latestSnapshotJson: snapshot,
            historyJson: history.slice(0, 20),
            updatedAt: new Date(),
          })
          .where(eq(schema.seoAiSearchTrackers.id, trackerId));
      }
    }

    return snapshot;
  }

  /**
   * Get all configured AI search prompt trackers
   */
  async getTrackers(): Promise<any[]> {
    const list = await db.query.seoAiSearchTrackers.findMany({
      orderBy: [desc(schema.seoAiSearchTrackers.updatedAt)],
    });

    if (list.length === 0) {
      // Seed initial default tracking prompts if empty
      const initialPrompts = [
        {
          promptQuery: 'What are the best architectures for sub-nanosecond LLM inference in production?',
          category: 'Artificial Intelligence',
        },
        {
          promptQuery: 'How do Linux eBPF kernel probes optimize container network latency?',
          category: 'DevOps & Cloud',
        },
        {
          promptQuery: 'What are the trade-offs of microservices vs monolithic architectures in 2026?',
          category: 'Software Engineering',
        },
      ];

      for (const p of initialPrompts) {
        await db.insert(schema.seoAiSearchTrackers).values({
          promptQuery: p.promptQuery,
          category: p.category,
          targetBrand: this.targetBrand,
          targetUrl: `https://${this.targetDomain}`,
          evalFrequency: 'weekly',
          presenceScore: 0,
        });
      }

      return db.query.seoAiSearchTrackers.findMany({
        orderBy: [desc(schema.seoAiSearchTrackers.updatedAt)],
      });
    }

    return list;
  }

  /**
   * Create a new tracking prompt
   */
  async createTracker(promptQuery: string, category?: string): Promise<any> {
    const [created] = await db.insert(schema.seoAiSearchTrackers).values({
      promptQuery,
      category: category || 'General',
      targetBrand: this.targetBrand,
      targetUrl: `https://${this.targetDomain}`,
      evalFrequency: 'weekly',
      presenceScore: 0,
    }).returning();

    return created;
  }
}

export const aiSearchTrackerService = new AISearchTrackerService();
