import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc, lte } from 'drizzle-orm';

export interface FreshnessReviewQueueItem {
  articleId: string;
  title: string;
  slug: string;
  categoryName?: string;
  publishedAt: Date;
  updatedAt: Date;
  daysSinceLastReview: number;
  freshnessScore: number; // 0-100
  reviewStatus: 'due' | 'in_review' | 'refreshed' | 'deferred';
  detectedOutdatedSignals: {
    type: 'stale_date' | 'version_deprecation' | 'broken_link' | 'traffic_decline';
    description: string;
    evidence: string;
  }[];
  aiSuggestedUpdates: string[];
}

export class ContentFreshnessService {
  /**
   * Scan articles and populate editorial freshness review queue
   */
  async getFreshnessReviewQueue(thresholdDays = 90): Promise<{
    totalAudited: number;
    dueForReviewCount: number;
    staleCount: number;
    items: FreshnessReviewQueueItem[];
  }> {
    const articles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,
        publishedAt: true,
        updatedAt: true,
        contentHtml: true,
      },
      orderBy: [desc(schema.articles.publishedAt)],
    });

    const categories = await db.query.categories.findMany();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const now = Date.now();
    const items: FreshnessReviewQueueItem[] = [];

    for (const art of articles) {
      const pubDate = art.publishedAt || art.updatedAt || new Date();
      const lastReview = art.updatedAt || pubDate;
      const daysSinceReview = Math.floor((now - lastReview.getTime()) / (24 * 60 * 60 * 1000));

      const $ = cheerio.load(art.contentHtml || '');
      const rawText = $('body').text();

      const signals: FreshnessReviewQueueItem['detectedOutdatedSignals'] = [];
      const aiSuggestions: string[] = [];

      // Detect outdated year references (e.g. references to 2023 or 2024 as "this year" or "latest")
      const currentYear = new Date().getFullYear();
      const pastYears = [2021, 2022, 2023, 2024].filter((y) => y < currentYear);
      for (const y of pastYears) {
        if (new RegExp(`(?:in|of|as of)\\s+${y}`, 'i').test(rawText)) {
          signals.push({
            type: 'stale_date',
            description: `Historical year reference (${y}) found in active text.`,
            evidence: `Text references ${y} which may signal dated information to search engines.`,
          });
          aiSuggestions.push(`Verify if ${y} benchmarks, specifications, or market dynamics have been updated in ${currentYear}.`);
          break;
        }
      }

      // Detect potentially deprecated versions or APIs
      const versionMatches = rawText.match(/\b(v0\.\d+|v1\.\d+|Python 3\.8|Node 16|React 17)\b/g);
      if (versionMatches) {
        signals.push({
          type: 'version_deprecation',
          description: `Legacy software versions detected: ${Array.from(new Set(versionMatches)).join(', ')}.`,
          evidence: `Mentions older release lines that may have reached End-of-Life (EOL).`,
        });
        aiSuggestions.push(`Update package versions, deprecation warnings, and migration notes for current LTS versions.`);
      }

      // Freshness score calculation
      let score = 100;
      if (daysSinceReview > thresholdDays) {
        score -= Math.min(40, Math.floor((daysSinceReview - thresholdDays) / 5) * 2);
      }
      score -= signals.length * 15;
      score = Math.max(10, Math.min(100, score));

      const isDue = daysSinceReview >= thresholdDays || score < 70;

      items.push({
        articleId: art.id,
        title: art.title,
        slug: art.slug,
        categoryName: art.categoryId ? catMap.get(art.categoryId) : undefined,
        publishedAt: pubDate,
        updatedAt: lastReview,
        daysSinceLastReview: daysSinceReview,
        freshnessScore: score,
        reviewStatus: isDue ? 'due' : 'refreshed',
        detectedOutdatedSignals: signals,
        aiSuggestedUpdates: aiSuggestions.length > 0 ? aiSuggestions : ['Article content remains current and well-aligned with contemporary standards.'],
      });
    }

    // Sort by lowest freshness score first
    items.sort((a, b) => a.freshnessScore - b.freshnessScore);

    return {
      totalAudited: items.length,
      dueForReviewCount: items.filter((i) => i.reviewStatus === 'due').length,
      staleCount: items.filter((i) => i.freshnessScore < 60).length,
      items,
    };
  }

  /**
   * Mark an article as reviewed and refresh updatedAt timestamp with audit trail
   */
  async approveAndMarkRefreshed(articleId: string, changeSummary: string, userId?: string): Promise<any> {
    const existing = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!existing) throw new Error(`Article ${articleId} not found.`);

    // Record editorial audit revision
    await db.insert(schema.articleRevisions).values({
      articleId,
      title: existing.title,
      contentHtml: existing.contentHtml,
      excerpt: existing.excerpt,
      revisionNumber: 998,
      changeSummary: changeSummary || 'Freshness review completed: validated current technical accuracy',
      userId: userId || existing.authorId,
    });

    const [updated] = await db.update(schema.articles)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(schema.articles.id, articleId))
      .returning();

    return updated;
  }
}

export const contentFreshnessService = new ContentFreshnessService();
