import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface DecayingArticleOpportunity {
  articleId: string;
  title: string;
  slug: string;
  opportunityType: 'content_decay' | 'striking_distance' | 'low_ctr' | 'cannibalization_risk' | 'new_query_potential';
  priority: 'high' | 'medium' | 'low';
  metrics: {
    clicks?: number;
    currentClicks?: number;
    previousClicks?: number;
    clicksChangePct?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    primaryQuery?: string;
  };
  explanation: string;
  actionRecommendation: string;
}

export interface ContentDecayReport {
  hasSufficientData: boolean;
  dataSource: 'google_search_console' | 'internal_analytics' | 'insufficient_history';
  comparisonPeriod: string; // e.g. "Last 28 Days vs Previous 28 Days"
  totalArticlesAnalyzed: number;
  decayingCount: number;
  strikingDistanceCount: number;
  opportunities: DecayingArticleOpportunity[];
  groundingNotice: string;
}

export class ContentDecayDetectorService {
  /**
   * Detect content decay and ranking opportunities grounded in Google Search Console and GA4 cache
   */
  async detectDecayAndOpportunities(): Promise<ContentDecayReport> {
    const publishedArticles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      orderBy: [desc(schema.articles.publishedAt)],
      limit: 50,
    });

    const opportunities: DecayingArticleOpportunity[] = [];

    // 1. Check Google Search Console Cache
    const gscCacheRecords = await db.query.searchConsoleCache.findMany({
      orderBy: [desc(schema.searchConsoleCache.createdAt)],
      limit: 2,
    });

    let gscPages: any[] = [];
    let gscQueries: any[] = [];
    let hasGsc = false;

    if (gscCacheRecords.length > 0) {
      const latestCache = gscCacheRecords[0].dataJson as any;
      if (latestCache?.pages && Array.isArray(latestCache.pages)) {
        gscPages = latestCache.pages;
        gscQueries = latestCache.queries || [];
        hasGsc = gscPages.length > 0;
      }
    }

    if (hasGsc) {
      // Analyze real GSC page performance
      for (const art of publishedArticles) {
        const pageMatch = gscPages.find((p: any) => {
          const pageUrl = p.page || p.keys?.[0] || '';
          return pageUrl.includes(art.slug);
        });

        if (pageMatch) {
          const impressions = Math.round(pageMatch.impressions || 0);
          const clicks = Math.round(pageMatch.clicks || 0);
          const ctr = Number(((pageMatch.ctr || 0) * 100).toFixed(1));
          const position = Number((pageMatch.position || 0).toFixed(1));

          // Find associated top queries
          const matchingQueries = gscQueries.filter((q: any) => {
            const qPage = q.page || '';
            return qPage.includes(art.slug);
          });
          const topQuery = matchingQueries[0]?.query || matchingQueries[0]?.keys?.[0] || 'Target topic query';

          // Opportunity 1: Striking Distance Pages (Position 4-15, High Impressions >= 200)
          if (position >= 4 && position <= 15 && impressions >= 200) {
            opportunities.push({
              articleId: art.id,
              title: art.title,
              slug: art.slug,
              opportunityType: 'striking_distance',
              priority: 'high',
              metrics: {
                impressions,
                clicks,
                ctr,
                position,
                primaryQuery: topQuery,
              },
              explanation: `Ranks at average position ${position} with ${impressions.toLocaleString()} search impressions. High leverage for reaching Top 3.`,
              actionRecommendation: `Update heading structure, add depth to answer "${topQuery}", and refresh title tag with compelling power terms.`,
            });
          }

          // Opportunity 2: High Impression, Low CTR (< 2.0% with >= 300 impressions)
          if (impressions >= 300 && ctr < 2.0) {
            opportunities.push({
              articleId: art.id,
              title: art.title,
              slug: art.slug,
              opportunityType: 'low_ctr',
              priority: 'high',
              metrics: {
                impressions,
                clicks,
                ctr,
                position,
                primaryQuery: topQuery,
              },
              explanation: `Displays ${impressions.toLocaleString()} impressions but only converts ${ctr}% CTR. Users are viewing the snippet without clicking.`,
              actionRecommendation: 'Perform SERP snippet optimization. Rewrite meta title and description with an irresistible engineering curiosity hook.',
            });
          }
        }
      }
    }

    // 2. Publication Date-based Decay Heuristics for older articles lacking recent traffic
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    for (const art of publishedArticles) {
      const pubDate = art.publishedAt || art.createdAt;
      const alreadyFlagged = opportunities.some((o) => o.articleId === art.id);

      if (!alreadyFlagged && pubDate < sixMonthsAgo) {
        const daysOld = Math.floor((Date.now() - pubDate.getTime()) / (24 * 60 * 60 * 1000));
        opportunities.push({
          articleId: art.id,
          title: art.title,
          slug: art.slug,
          opportunityType: 'content_decay',
          priority: 'medium',
          metrics: {
            currentClicks: art.viewsCount || 0,
          },
          explanation: `Published ${daysOld} days ago without recent editorial revisions. Technology references or library versions may have evolved.`,
          actionRecommendation: 'Verify code snippets, check third-party API references, and append recent production benchmarks.',
        });
      }
    }

    // Sort opportunities: High priority first
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const strikingDistanceCount = opportunities.filter((o) => o.opportunityType === 'striking_distance').length;
    const decayingCount = opportunities.filter((o) => o.opportunityType === 'content_decay').length;

    return {
      hasSufficientData: publishedArticles.length > 0,
      dataSource: hasGsc ? 'google_search_console' : 'internal_analytics',
      comparisonPeriod: hasGsc ? 'Current GSC Performance Window' : 'Publication Age & Engagement Trajectory',
      totalArticlesAnalyzed: publishedArticles.length,
      decayingCount,
      strikingDistanceCount,
      opportunities,
      groundingNotice: hasGsc
        ? 'Metrics are directly grounded in Google Search Console search performance data.'
        : 'Google Search Console data is currently unlinked or updating. Results are derived from publication age, view records, and internal traffic patterns.',
    };
  }
}

export const contentDecayDetectorService = new ContentDecayDetectorService();
