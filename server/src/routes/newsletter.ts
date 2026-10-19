import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// POST /api/newsletter/subscribe
const subscribeSchema = z.object({
  email: z.string().email(),
});

router.post('/subscribe', async (req, res, next) => {
  try {
    const { email } = subscribeSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query.newsletterSubscribers.findFirst({
      where: eq(schema.newsletterSubscribers.email, normalizedEmail),
    });

    if (existing) {
      if (existing.status === 'unsubscribed') {
        await db.update(schema.newsletterSubscribers)
          .set({ status: 'subscribed', updatedAt: new Date() })
          .where(eq(schema.newsletterSubscribers.id, existing.id));
      }
      return res.json({ message: 'You are subscribed to DailyBuild Tech updates!' });
    }

    const unsubscribeToken = crypto.randomBytes(24).toString('hex');

    await db.insert(schema.newsletterSubscribers).values({
      email: normalizedEmail,
      status: 'subscribed',
      consentTimestamp: new Date(),
      unsubscribeToken,
    });

    res.status(201).json({ message: 'Thank you for subscribing to DailyBuild Tech!' });
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/unsubscribe?token=...
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Unsubscribe token is required.' });
    }

    const subscriber = await db.query.newsletterSubscribers.findFirst({
      where: eq(schema.newsletterSubscribers.unsubscribeToken, token),
    });

    if (!subscriber) {
      return res.status(404).json({ error: 'Invalid or expired unsubscribe link.' });
    }

    await db.update(schema.newsletterSubscribers)
      .set({ status: 'unsubscribed', updatedAt: new Date() })
      .where(eq(schema.newsletterSubscribers.id, subscriber.id));

    res.json({ message: 'You have been successfully unsubscribed from DailyBuild Tech updates.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/subscribers - Admin list
router.get('/subscribers', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const list = await db.query.newsletterSubscribers.findMany({
      orderBy: [desc(schema.newsletterSubscribers.createdAt)],
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/newsletter/export - CSV export
router.get('/export', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const list = await db.query.newsletterSubscribers.findMany({
      where: eq(schema.newsletterSubscribers.status, 'subscribed'),
    });

    let csv = 'email,status,consent_timestamp\n';
    for (const sub of list) {
      csv += `"${sub.email}","${sub.status}","${sub.consentTimestamp.toISOString()}"\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.attachment('dailybuild_subscribers.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/newsletter/subscribers/:id/status - Admin toggle unsubscribe / subscribe
const updateStatusSchema = z.object({
  status: z.enum(['subscribed', 'unsubscribed']),
});

router.patch('/subscribers/:id/status', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const updated = await db.update(schema.newsletterSubscribers)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.newsletterSubscribers.id, id))
      .returning();

    if (!updated.length) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ message: `Subscriber marked as ${status}`, subscriber: updated[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/newsletter/subscribers/:id - Admin delete subscriber
router.delete('/subscribers/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.id, id))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ message: 'Subscriber deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
