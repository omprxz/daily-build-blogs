import { Router } from 'express';
import { z } from 'zod';
import os from 'os';
import { db, checkDatabaseConnection } from '../database/db.js';
import * as schema from '../database/schema.js';
import { config } from '../config/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { desc } from 'drizzle-orm';

const router = Router();

// GET /api/settings/appearance - Admin appearance customization
router.get('/appearance', async (_req, res, next) => {
  try {
    let settings = await db.query.appearanceSettings.findFirst();
    if (!settings) {
      const [inserted] = await db.insert(schema.appearanceSettings).values({
        accentColor: '#4F46E5',
        sidebarColor: '#0F172A',
        surfaceColor: '#FFFFFF',
        borderStyle: 'subtle',
        themeMode: 'system',
        density: 'comfortable',
        sidebarCollapsed: false,
      }).returning();
      settings = inserted;
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/appearance - Update appearance settings
const appearanceSchema = z.object({
  accentColor: z.string().optional(),
  sidebarColor: z.string().optional(),
  surfaceColor: z.string().optional(),
  borderStyle: z.string().optional(),
  themeMode: z.string().optional(),
  density: z.string().optional(),
  sidebarCollapsed: z.boolean().optional(),
});

router.put('/appearance', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const input = appearanceSchema.parse(req.body);
    const existing = await db.query.appearanceSettings.findFirst();

    if (existing) {
      const [updated] = await db.update(schema.appearanceSettings)
        .set({ ...input, updatedAt: new Date() })
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db.insert(schema.appearanceSettings)
        .values(input as any)
        .returning();
      res.json(inserted);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/system - System health & VPS statistics
router.get('/system', authenticate, async (_req, res) => {
  const dbHealth = await checkDatabaseConnection();
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const uptimeSeconds = Math.round(os.uptime());

  res.json({
    status: 'online',
    appName: config.appName,
    environment: config.env,
    database: {
      name: config.database.name,
      connected: dbHealth.connected,
      error: dbHealth.error,
    },
    vps: {
      platform: os.platform(),
      cpus: os.cpus().length,
      freeMemoryMb: freeMemMb,
      totalMemoryMb: totalMemMb,
      memoryUsagePercent: Math.round(((totalMemMb - freeMemMb) / totalMemMb) * 100),
      uptimeHours: (uptimeSeconds / 3600).toFixed(1),
    },
    emergencyKillSwitchActive: config.automation.emergencyKillSwitch,
  });
});

// GET /api/settings/kill-switch - Check Global Emergency Auto-Publish Kill Switch
router.get('/kill-switch', authenticate, requireRole(['admin']), async (_req, res) => {
  res.json({
    active: config.automation.emergencyKillSwitch,
  });
});

// POST /api/settings/kill-switch - Toggle Global Emergency Auto-Publish Kill Switch
router.post('/kill-switch', authenticate, requireRole(['admin']), async (req, res) => {
  const { active } = req.body;
  config.automation.emergencyKillSwitch = Boolean(active);
  res.json({
    message: `Emergency Kill Switch is now ${config.automation.emergencyKillSwitch ? 'ACTIVE (All auto-publishing paused)' : 'INACTIVE (Normal operation)'}`,
    active: config.automation.emergencyKillSwitch,
  });
});

// GET /api/settings/audit-logs
router.get('/audit-logs', authenticate, requireRole(['admin']), async (_req, res, next) => {
  try {
    const logs = await db.query.auditLogs.findMany({
      orderBy: [desc(schema.auditLogs.createdAt)],
      limit: 50,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
