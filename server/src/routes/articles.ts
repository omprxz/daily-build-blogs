import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';
import { eq, desc, and, or, ilike, sql, gte } from 'drizzle-orm';
import sanitizeHtml from 'sanitize-html';

const router = Router();

// Helper to calculate reading time
function calculateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '');
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// GET /api/articles - List articles with filtering & pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = Math.min(parseInt(req.query.limit as string || '12', 10), 50);
    const offset = (page - 1) * limit;

    const categorySlug = req.query.category as string;
    const tag = req.query.tag as string;
    const search = req.query.search as string;
    const status = (req.query.status as string) || 'published';
    const isFeatured = req.query.featured === 'true';
    const isTrending = req.query.trending === 'true';

    // If searching for all statuses, require auth
    if (status !== 'published') {
      // Must be authenticated to see drafts
      const authHeader = req.headers.authorization || req.cookies?.auth_token;
      if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const conditions: any[] = [];

    if (status !== 'all') {
      conditions.push(eq(schema.articles.status, status));
    }

    if (categorySlug) {
      const cat = await db.query.categories.findFirst({
        where: eq(schema.categories.slug, categorySlug),
      });
      if (cat) {
        conditions.push(eq(schema.articles.categoryId, cat.id));
      }
    }

    if (isFeatured) {
      conditions.push(eq(schema.articles.isFeaturedLead, true));
    }

    if (isTrending) {
      conditions.push(eq(schema.articles.isTrending, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.articles.title, `%${search}%`),
          ilike(schema.articles.excerpt, `%${search}%`),
          ilike(schema.articles.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.query.articles.findMany({
      where: whereClause,
      orderBy: [desc(schema.articles.publishedAt), desc(schema.articles.createdAt)],
      limit,
      offset,
      with: {
        // We will enrich with category and author
      }
    });

    // Populate category and author details
    const enriched = await Promise.all(items.map(async (art) => {
      const cat = await db.query.categories.findFirst({ where: eq(schema.categories.id, art.categoryId) });
      const author = await db.query.users.findFirst({ where: eq(schema.users.id, art.authorId) });
      return {
        ...art,
        category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
        author: author ? { id: author.id, name: author.name, avatarUrl: author.avatarUrl } : null,
      };
    }));

    // Compute total count for pagination and accurate frontend counts
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(schema.articles)
      .where(whereClause);

    const total = Number(totalCount) || 0;

    res.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: offset + enriched.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:slugOrId - Detail view
router.get('/:slugOrId', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);

    const article = await db.query.articles.findFirst({
      where: isUuid
        ? or(eq(schema.articles.slug, slugOrId), eq(schema.articles.id, slugOrId))
        : eq(schema.articles.slug, slugOrId),
    });

    if (!article) {
      return res.status(404).json({ error: 'NotFound', message: 'Article not found.' });
    }

    const cat = await db.query.categories.findFirst({ where: eq(schema.categories.id, article.categoryId) });
    const author = await db.query.users.findFirst({ where: eq(schema.users.id, article.authorId) });
    const sources = await db.query.articleSources.findMany({ where: eq(schema.articleSources.articleId, article.id) });
    const revisions = await db.query.articleRevisions.findMany({
      where: eq(schema.articleRevisions.articleId, article.id),
      orderBy: [desc(schema.articleRevisions.revisionNumber)],
      limit: 10,
    });
    const genImage = await db.query.generatedImages.findFirst({
      where: or(
        eq(schema.generatedImages.articleId, article.id),
        article.featuredImage ? eq(schema.generatedImages.imageUrl, article.featuredImage) : undefined
      )
    }).catch(() => null);

    res.json({
      ...article,
      category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
      author: author ? { id: author.id, name: author.name, avatarUrl: author.avatarUrl, bio: author.bio } : null,
      sources,
      revisions,
      imagePrompt: genImage?.prompt || null,
      imageModel: genImage?.modelId || null,
      imageProvider: genImage?.providerSlug || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/articles/:slugOrId/view - Count exactly 1 view per detail page view/refresh
router.post('/:slugOrId/view', async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);

    const article = await db.query.articles.findFirst({
      where: isUuid
        ? or(eq(schema.articles.slug, slugOrId), eq(schema.articles.id, slugOrId))
        : eq(schema.articles.slug, slugOrId),
    });

    if (!article) {
      return res.status(404).json({ error: 'NotFound', message: 'Article not found.' });
    }

    const [updated] = await db.update(schema.articles)
      .set({ viewsCount: sql`${schema.articles.viewsCount} + 1` })
      .where(eq(schema.articles.id, article.id))
      .returning({ viewsCount: schema.articles.viewsCount });

    res.json({ success: true, viewsCount: updated?.viewsCount ?? (article.viewsCount + 1) });
  } catch (err) {
    next(err);
  }
});

// POST /api/articles - Create article (Editor / Admin / Author)
const articleInputSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).optional(),
  excerpt: z.string().min(5),
  contentHtml: z.string().min(10),
  contentMarkdown: z.string().optional(),
  categoryId: z.string().uuid(),
  featuredImage: z.string().optional().nullable(),
  featuredImageAlt: z.string().optional().nullable(),
  status: z.enum(['draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected']).default('draft'),
  isFeaturedLead: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  sources: z.array(z.object({
    sourceName: z.string(),
    url: z.string(),
    claimExtracted: z.string().optional(),
  })).optional(),
});

router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const input = articleInputSchema.parse(req.body);

    // Generate slug if not provided
    const slug = input.slug || input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString(36)}`;

    const readingTimeMins = calculateReadingTime(input.contentHtml);
    const sanitizedHtml = sanitizeHtml(input.contentHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'pre', 'code', 'blockquote']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'id'],
        'img': ['src', 'alt', 'title', 'loading'],
        'a': ['href', 'target', 'rel'],
      },
    });

    const isPublished = input.status === 'published';

    // Deduplication check: if a draft with the identical title was created by this author within the last 120 seconds
    // (e.g. from featured image auto-save or quick double-click), update that draft instead of inserting a duplicate!
    const twoMinutesAgo = new Date(Date.now() - 120 * 1000);
    const existingRecentDraft = await db.query.articles.findFirst({
      where: and(
        eq(schema.articles.authorId, req.user!.userId),
        eq(schema.articles.title, input.title),
        eq(schema.articles.status, 'draft'),
        gte(schema.articles.createdAt, twoMinutesAgo)
      ),
    });

    if (existingRecentDraft) {
      const [updated] = await db.update(schema.articles)
        .set({
          excerpt: input.excerpt,
          contentHtml: sanitizedHtml,
          contentMarkdown: input.contentMarkdown || null,
          categoryId: input.categoryId,
          featuredImage: input.featuredImage || existingRecentDraft.featuredImage,
          featuredImageAlt: input.featuredImageAlt || existingRecentDraft.featuredImageAlt,
          status: input.status,
          readingTimeMins,
          isFeaturedLead: input.isFeaturedLead,
          isTrending: input.isTrending,
          metaTitle: input.metaTitle || input.title,
          metaDescription: input.metaDescription || input.excerpt,
          canonicalUrl: input.canonicalUrl || null,
          tags: input.tags,
          publishedAt: isPublished ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.articles.id, existingRecentDraft.id))
        .returning();

      return res.status(200).json(updated);
    }

    const [article] = await db.insert(schema.articles).values({
      title: input.title,
      slug,
      excerpt: input.excerpt,
      contentHtml: sanitizedHtml,
      contentMarkdown: input.contentMarkdown || null,
      categoryId: input.categoryId,
      authorId: req.user!.userId,
      featuredImage: input.featuredImage || null,
      featuredImageAlt: input.featuredImageAlt || input.title,
      status: input.status,
      readingTimeMins,
      isFeaturedLead: input.isFeaturedLead,
      isTrending: input.isTrending,
      metaTitle: input.metaTitle || input.title,
      metaDescription: input.metaDescription || input.excerpt,
      canonicalUrl: input.canonicalUrl || null,
      tags: input.tags,
      publishedAt: isPublished ? new Date() : null,
    }).returning();

    // Create initial revision
    await db.insert(schema.articleRevisions).values({
      articleId: article.id,
      title: article.title,
      contentHtml: article.contentHtml,
      excerpt: article.excerpt,
      revisionNumber: 1,
      changeSummary: 'Initial creation',
      userId: req.user!.userId,
    });

    // Insert sources if provided
    if (input.sources && input.sources.length > 0) {
      for (const s of input.sources) {
        await db.insert(schema.articleSources).values({
          articleId: article.id,
          sourceName: s.sourceName,
          url: s.url,
          claimExtracted: s.claimExtracted || null,
        });
      }
    }

    res.status(201).json(article);
  } catch (err) {
    next(err);
  }
});

// PUT /api/articles/:id - Update article
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const input = articleInputSchema.partial().parse(req.body);

    const existing = await db.query.articles.findFirst({
      where: eq(schema.articles.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Article not found.' });
    }

    // Role check: Authors can only edit their own articles unless Editor/Admin
    if (req.user!.role === 'author' && existing.authorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only edit your own articles.' });
    }

    const updateData: any = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.contentHtml) {
      updateData.readingTimeMins = calculateReadingTime(input.contentHtml);
      updateData.contentHtml = sanitizeHtml(input.contentHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'pre', 'code', 'blockquote']),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          '*': ['class', 'id'],
          'img': ['src', 'alt', 'title', 'loading'],
        },
      });
    }

    if (input.status === 'published' && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const [updated] = await db.update(schema.articles)
      .set(updateData)
      .where(eq(schema.articles.id, id))
      .returning();

    // Create a new revision
    const prevRevisionsCount = await db.query.articleRevisions.findMany({
      where: eq(schema.articleRevisions.articleId, id),
    });

    await db.insert(schema.articleRevisions).values({
      articleId: id,
      title: updated.title,
      contentHtml: updated.contentHtml,
      excerpt: updated.excerpt,
      revisionNumber: prevRevisionsCount.length + 1,
      changeSummary: req.body.changeSummary || 'Updated article content',
      userId: req.user!.userId,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/articles/:id
router.delete('/:id', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    // Explicitly clean up any associated generated images or automation jobs to prevent FK constraint failures
    await db.delete(schema.generatedImages).where(eq(schema.generatedImages.articleId, id));
    await db.delete(schema.imageAutomationJobs).where(eq(schema.imageAutomationJobs.articleId, id));
    await db.delete(schema.articles).where(eq(schema.articles.id, id));
    res.json({ message: 'Article successfully deleted.' });
  } catch (err) {
    next(err);
  }
});

export default router;
