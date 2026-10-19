import Parser from 'rss-parser';
import crypto from 'crypto';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq } from 'drizzle-orm';

const parser = new Parser({
  headers: {
    'User-Agent': 'DailyBuild-NewsBot/1.0 (+https://blogs.dailybuild.tech/editorial-policy)',
  },
  timeout: 10000,
});

export interface DiscoveredStory {
  headline: string;
  canonicalUrl: string;
  summary: string;
  content: string;
  publishedDate: Date;
  sourceName: string;
  sourceId: string;
  categoryId?: string | null;
  duplicateKey: string;
}

export class ResearchService {
  generateDuplicateKey(title: string, url: string): string {
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanUrl = url.split('?')[0].toLowerCase();
    return crypto.createHash('sha256').update(`${cleanTitle}:${cleanUrl}`).digest('hex');
  }

  async pollFeed(source: typeof schema.researchSources.$inferSelect): Promise<number> {
    console.log(`[Research] Polling feed: ${source.name} (${source.feedUrl})`);
    let newItemsCount = 0;

    try {
      const feed = await parser.parseURL(source.feedUrl);

      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const duplicateKey = this.generateDuplicateKey(item.title, item.link);

        // Check if item already discovered
        const existing = await db.query.discoveredItems.findFirst({
          where: eq(schema.discoveredItems.duplicateKey, duplicateKey)
        });

        if (!existing) {
          const publishedDate = item.pubDate ? new Date(item.pubDate) : new Date();

          await db.insert(schema.discoveredItems).values({
            sourceId: source.id,
            headline: item.title,
            canonicalUrl: item.link,
            summary: item.contentSnippet || item.summary || item.title,
            content: item.content || item['content:encoded'] || item.contentSnippet || '',
            publishedDate,
            categoryId: source.categoryId,
            duplicateKey,
            status: 'new',
            relevanceScore: Math.floor(Math.random() * 20) + 75, // 75-95 base score
          });
          newItemsCount++;
        }
      }

      // Update source status
      await db.update(schema.researchSources)
        .set({
          lastFetchedAt: new Date(),
          lastStatus: 'success',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.researchSources.id, source.id));

      console.log(`[Research] ${source.name}: Discovered ${newItemsCount} new stories.`);
      return newItemsCount;
    } catch (err: any) {
      console.error(`[Research Error] Failed to fetch feed ${source.name}:`, err.message);

      await db.update(schema.researchSources)
        .set({
          lastFetchedAt: new Date(),
          lastStatus: 'error',
          errorMessage: err.message,
          updatedAt: new Date(),
        })
        .where(eq(schema.researchSources.id, source.id));

      return 0;
    }
  }

  async pollAllEnabledFeeds(): Promise<{ totalNewStories: number; sourcesPolled: number }> {
    const sources = await db.query.researchSources.findMany({
      where: eq(schema.researchSources.isEnabled, true)
    });

    let totalNew = 0;
    for (const source of sources) {
      const count = await this.pollFeed(source);
      totalNew += count;
    }

    return { totalNewStories: totalNew, sourcesPolled: sources.length };
  }
}

export const researchService = new ResearchService();
