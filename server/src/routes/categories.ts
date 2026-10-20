import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, asc, sql } from 'drizzle-orm';

const router = Router();

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const list = await db.query.categories.findMany({
      orderBy: [asc(schema.categories.displayOrder)],
    });

    // Compute published article count per category in one query
    const counts = await db
      .select({
        categoryId: schema.articles.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.articles)
      .where(eq(schema.articles.status, 'published'))
      .groupBy(schema.articles.categoryId);

    const countMap = new Map<string, number>();
    for (const row of counts) {
      if (row.categoryId) {
        countMap.set(row.categoryId, Number(row.count) || 0);
      }
    }

    const enriched = list.map((cat) => ({
      ...cat,
      articleCount: countMap.get(cat.id) || 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().optional(),
  publishingPolicy: z.enum(['draft', 'manual', 'auto']).default('manual'),
  defaultProviderId: z.string().uuid().optional().nullable(),
  defaultModelId: z.string().optional().nullable(),
  aiSettings: z.record(z.any()).optional(),
  featuredImage: z.string().optional().nullable(),
  displayOrder: z.number().default(0),
  isEnabled: z.boolean().default(true),
});

router.post('/', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const [inserted] = await db.insert(schema.categories).values(data).returning();
    res.status(201).json(inserted);
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = categorySchema.partial().parse(req.body);
    const [updated] = await db.update(schema.categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.categories.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
