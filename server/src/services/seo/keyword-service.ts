import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq, desc, ilike } from 'drizzle-orm';

export interface KeywordSuggestion {
  keyword: string;
  intent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  source: 'ai_estimation' | 'google_search_console';
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
  relevanceScore: number;
  relatedQuestions?: string[];
  subtopics?: string[];
}

export interface KeywordCluster {
  clusterName: string;
  primaryKeyword: string;
  intent: string;
  keywords: string[];
  suggestedArticleAngle: string;
}

export class KeywordIntelligenceService {
  /**
   * Expand seed keyword, generate clusters and classify search intent using AI + GSC data
   */
  async analyzeKeyword(seedKeyword: string, articleId?: string): Promise<any> {
    const cleanSeed = seedKeyword.trim();

    // 1. Fetch any actual Search Console queries from cache for grounding
    let gscMatchedQueries: any[] = [];
    try {
      const gscCaches = await db.query.searchConsoleCache.findMany({
        limit: 5,
        orderBy: [desc(schema.searchConsoleCache.createdAt)],
      });

      for (const cache of gscCaches) {
        const data = cache.dataJson as any;
        const queries = data?.queries || data?.rows || [];
        if (Array.isArray(queries)) {
          const matched = queries.filter((q: any) => {
            const queryText = (q.query || q.keys?.[0] || '').toLowerCase();
            return queryText.includes(cleanSeed.toLowerCase()) || cleanSeed.toLowerCase().includes(queryText);
          });
          if (matched.length > 0) {
            gscMatchedQueries = matched.slice(0, 10).map((m: any) => ({
              keyword: m.query || m.keys?.[0],
              intent: this.inferIntent(m.query || m.keys?.[0]),
              source: 'google_search_console' as const,
              impressions: Math.round(m.impressions || 0),
              clicks: Math.round(m.clicks || 0),
              ctr: Number(((m.ctr || 0) * 100).toFixed(1)),
              position: Number((m.position || 0).toFixed(1)),
              relevanceScore: 95,
            }));
            break;
          }
        }
      }
    } catch (gscErr: any) {
      console.warn('[Keyword Service] GSC Cache lookup notice:', gscErr.message);
    }

    // 2. Check for duplicate keyword targeting / cannibalization across existing articles
    const existingArticles = await db.query.articles.findMany({
      where: ilike(schema.articles.title, `%${cleanSeed}%`),
      limit: 5,
    });

    const cannibalizationWarnings = existingArticles
      .filter((a) => !articleId || a.id !== articleId)
      .map((a) => ({
        articleId: a.id,
        title: a.title,
        slug: a.slug,
        status: a.status,
        warning: `Existing article "${a.title}" already targets terms matching "${cleanSeed}".`,
      }));

    // 3. AI Expansion & Semantic Clustering via active AI provider
    let aiKeywords: KeywordSuggestion[] = [];
    let clusters: KeywordCluster[] = [];
    let contentGaps: string[] = [];

    const prompt = `You are a Principal Search Architect and Technical SEO Analyst.
Analyze the seed keyword: "${cleanSeed}".

Return a valid JSON object strictly adhering to this format without markdown code fences:
{
  "primaryIntent": "informational" | "commercial" | "transactional" | "navigational",
  "longTailKeywords": [
    {
      "keyword": "string",
      "intent": "informational" | "commercial" | "transactional" | "navigational",
      "relevanceScore": 70-100,
      "relatedQuestions": ["Question 1?", "Question 2?"],
      "subtopics": ["Subtopic A", "Subtopic B"]
    }
  ],
  "clusters": [
    {
      "clusterName": "string",
      "primaryKeyword": "string",
      "intent": "string",
      "keywords": ["kw1", "kw2", "kw3"],
      "suggestedArticleAngle": "string"
    }
  ],
  "contentGaps": [
    "Identified topic gap where developers and technical buyers lack clear guidance"
  ]
}

Ensure all suggestions represent real technical developer search patterns. Do NOT fabricate numerical search volume or CPC numbers.`;

    try {
      const aiResponse = await providerRegistry.generate('seo_keyword_research', {
        model: 'gemini-2.5-flash',
        prompt,
        temperature: 0.3,
        maxTokens: 1600,
      });
      
      const cleanJson = aiResponse.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      clusters = parsed.clusters || [];
      contentGaps = parsed.contentGaps || [];

      if (Array.isArray(parsed.longTailKeywords)) {
        aiKeywords = parsed.longTailKeywords.map((k: any) => ({
          keyword: k.keyword,
          intent: k.intent || parsed.primaryIntent || 'informational',
          source: 'ai_estimation' as const,
          relevanceScore: k.relevanceScore || 80,
          relatedQuestions: k.relatedQuestions || [],
          subtopics: k.subtopics || [],
        }));
      }
    } catch (aiErr: any) {
      console.warn('[Keyword Service] AI generation fallback:', aiErr.message);
      // Fallback rule-based generation
      clusters = [
        {
          clusterName: `${cleanSeed} Fundamentals`,
          primaryKeyword: cleanSeed,
          intent: 'informational',
          keywords: [`${cleanSeed} architecture`, `how to use ${cleanSeed}`, `what is ${cleanSeed}`],
          suggestedArticleAngle: `Comprehensive Engineering Guide to ${cleanSeed}`,
        },
        {
          clusterName: `${cleanSeed} Comparison & Performance`,
          primaryKeyword: `${cleanSeed} vs alternatives`,
          intent: 'commercial',
          keywords: [`${cleanSeed} benchmarks`, `${cleanSeed} best practices`, `${cleanSeed} production guide`],
          suggestedArticleAngle: `In-depth Benchmark & Production Architecture for ${cleanSeed}`,
        },
      ];

      aiKeywords = [
        { keyword: `${cleanSeed} architecture overview`, intent: 'informational', source: 'ai_estimation', relevanceScore: 90 },
        { keyword: `${cleanSeed} best practices in production`, intent: 'informational', source: 'ai_estimation', relevanceScore: 88 },
        { keyword: `${cleanSeed} vs alternatives comparison`, intent: 'commercial', source: 'ai_estimation', relevanceScore: 85 },
        { keyword: `how to optimize ${cleanSeed} latency`, intent: 'informational', source: 'ai_estimation', relevanceScore: 82 },
      ];

      contentGaps = [
        `Lack of end-to-end production setup tutorials for ${cleanSeed}`,
        `Absence of transparent performance benchmarking and cost calculations`,
      ];
    }

    const combinedKeywords = [...gscMatchedQueries, ...aiKeywords];

    // 4. Save to database for history and reuse
    const [savedRecord] = await db.insert(schema.seoKeywordResearch).values({
      seedKeyword: cleanSeed,
      intent: (aiKeywords[0]?.intent || 'informational') as any,
      clustersJson: clusters,
      keywordsJson: combinedKeywords,
      contentGapsJson: contentGaps,
      mappedArticleId: articleId || null,
      notes: cannibalizationWarnings.length > 0 ? `${cannibalizationWarnings.length} potential cannibalization conflicts detected.` : null,
    }).returning();

    return {
      id: savedRecord.id,
      seedKeyword: cleanSeed,
      intent: savedRecord.intent,
      totalKeywords: combinedKeywords.length,
      gscVerifiedCount: gscMatchedQueries.length,
      aiEstimatedCount: aiKeywords.length,
      keywords: combinedKeywords,
      clusters,
      contentGaps,
      cannibalizationWarnings,
      createdAt: savedRecord.createdAt,
    };
  }

  /**
   * Helper to infer search intent from keyword text
   */
  private inferIntent(keyword: string): 'informational' | 'navigational' | 'commercial' | 'transactional' {
    const lower = keyword.toLowerCase();
    if (lower.includes('buy') || lower.includes('pricing') || lower.includes('cost') || lower.includes('subscribe')) {
      return 'transactional';
    }
    if (lower.includes('vs') || lower.includes('best') || lower.includes('review') || lower.includes('top') || lower.includes('comparison')) {
      return 'commercial';
    }
    if (lower.includes('login') || lower.includes('portal') || lower.includes('docs') || lower.includes('github') || lower.includes('official')) {
      return 'navigational';
    }
    return 'informational';
  }

  /**
   * Retrieve historical keyword research runs
   */
  async getRecentResearch(): Promise<any[]> {
    return db.query.seoKeywordResearch.findMany({
      orderBy: [desc(schema.seoKeywordResearch.createdAt)],
      limit: 20,
    });
  }
}

export const keywordIntelligenceService = new KeywordIntelligenceService();
