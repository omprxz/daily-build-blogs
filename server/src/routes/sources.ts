import { Router } from 'express';
import Parser from 'rss-parser';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { researchService } from '../services/research/rss.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/sources - List all RSS feeds & research sources
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sources = await db.query.researchSources.findMany({
      orderBy: [desc(schema.researchSources.priority), desc(schema.researchSources.createdAt)],
    });
    res.json(sources);
  } catch (err) {
    next(err);
  }
});

// POST /api/sources - Add new RSS feed
const sourceInputSchema = z.object({
  name: z.string().min(2).max(150),
  feedUrl: z.string().url(),
  siteUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  priority: z.number().default(1),
  pollingIntervalMins: z.number().default(30),
  isEnabled: z.boolean().default(true),
});

router.post('/', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const input = sourceInputSchema.parse(req.body);
    const [created] = await db.insert(schema.researchSources).values(input).returning();
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sources/:id - Update RSS feed
router.put('/:id', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const input = sourceInputSchema.partial().parse(req.body);

    const [updated] = await db.update(schema.researchSources)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.researchSources.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sources/:id - Remove single RSS feed
router.delete('/:id', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(schema.researchSources).where(eq(schema.researchSources.id, id));
    res.json({ message: 'Source deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sources/bulk-delete - Bulk delete selected RSS feeds
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

router.post('/bulk-delete', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { ids } = bulkDeleteSchema.parse(req.body);
    for (const id of ids) {
      await db.delete(schema.researchSources).where(eq(schema.researchSources.id, id));
    }
    res.json({ message: `Successfully deleted ${ids.length} RSS feeds.`, count: ids.length });
  } catch (err) {
    next(err);
  }
});

// Helper to deduce a human-friendly name from URL/hostname
function formatHostnameAsName(hostname: string): string {
  let clean = hostname.replace(/^www\./i, '');
  const parts = clean.split('.');
  if (parts.length > 1) {
    clean = parts[0];
  }
  return clean
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'RSS Feed';
}

// POST /api/sources/inspect - Auto extract feed title directly from RSS/XML feed poll
const rssInspector = new (Parser as any)({
  headers: {
    'User-Agent': 'DailyBuild-NewsBot/1.0 (+https://blogs.dailybuild.tech/editorial-policy)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
  },
  timeout: 8000,
});

router.post('/inspect', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    let baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    let autoTitle = formatHostnameAsName(parsedUrl.hostname);

    // 1. Primary: Poll & parse the XML content directly using rss-parser
    try {
      const feed = await rssInspector.parseURL(url.trim());
      if (feed && feed.title && feed.title.trim()) {
        autoTitle = feed.title.trim().replace(/\s+/g, ' ');
      }
      if (feed && feed.link) {
        try {
          const feedLinkUrl = new URL(feed.link);
          baseUrl = `${feedLinkUrl.protocol}//${feedLinkUrl.host}`;
        } catch {
          // keep existing baseUrl
        }
      }
    } catch (parseErr) {
      // 2. Fallback: If rss-parser fails, fetch raw XML directly and extract <channel><title> or <feed><title>
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url.trim(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'DailyBuild-NewsBot/1.0',
            'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml',
          },
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const rawText = await resp.text();
          // Strictly look for RSS <channel><title> or Atom <feed><title> in XML content
          const xmlTitleMatch = rawText.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) 
            || rawText.match(/<feed[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          if (xmlTitleMatch && xmlTitleMatch[1]?.trim()) {
            autoTitle = xmlTitleMatch[1].trim().replace(/\s+/g, ' ');
          }
        }
      } catch {
        // Fallback to formatted hostname
      }
    }

    return res.json({
      feedUrl: url.trim(),
      baseUrl,
      title: autoTitle,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sources/bulk - Add multiple RSS feeds at once
const bulkCreateSchema = z.object({
  sources: z.array(z.object({
    name: z.string().min(1).max(150),
    feedUrl: z.string().url(),
    siteUrl: z.string().url().optional(),
    priority: z.number().default(1),
    pollingIntervalMins: z.number().default(30),
    isEnabled: z.boolean().default(true),
  })).min(1),
});

router.post('/bulk', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { sources } = bulkCreateSchema.parse(req.body);
    const createdList = [];

    for (const item of sources) {
      // Avoid duplicate insert errors if feedUrl already exists
      const existing = await db.query.researchSources.findFirst({
        where: eq(schema.researchSources.feedUrl, item.feedUrl)
      });
      if (!existing) {
        const [created] = await db.insert(schema.researchSources).values(item).returning();
        createdList.push(created);
      }
    }

    res.status(201).json({
      message: `Successfully added ${createdList.length} new RSS feeds.`,
      created: createdList,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sources/:id/poll - Test / manually poll a single source
router.post('/:id/poll', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const source = await db.query.researchSources.findFirst({
      where: eq(schema.researchSources.id, id)
    });

    if (!source) {
      return res.status(404).json({ error: 'NotFound', message: 'Source not found.' });
    }

    const newItems = await researchService.pollFeed(source);
    res.json({ message: `Successfully polled ${source.name}.`, newItems });
  } catch (err) {
    next(err);
  }
});

// POST /api/sources/poll-all - Manually poll all enabled feeds
router.post('/poll-all', authenticate, async (req, res, next) => {
  try {
    const result = await researchService.pollAllEnabledFeeds();
    res.json({ message: 'Polled all feeds successfully.', ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/sources/discovered - List discovered news items
router.get('/discovered', authenticate, async (req, res, next) => {
  try {
    const items = await db.query.discoveredItems.findMany({
      orderBy: [desc(schema.discoveredItems.retrievedAt)],
      limit: 50,
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;
