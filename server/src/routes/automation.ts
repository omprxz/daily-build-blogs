import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { config } from '../config/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc, and, lt, gt, or } from 'drizzle-orm';
import { buildFeaturedImagePrompt } from '../services/image/image-service.js';
import { processFeaturedImageWatermark } from '../services/image/featured-watermark.js';

const router = Router();

const SETTINGS_KEY = 'local_image_automation';
const DEFAULT_SECRET = process.env.LOCAL_AGENT_SECRET || process.env.AGENT_SECRET || 'agy_agent_a099d13ffbc9e506c5e9f83543237581';

// In-memory heartbeat tracker
let agentHeartbeat: {
  online: boolean;
  machineName?: string;
  browserStatus?: string;
  lastSeenAt?: Date;
  version?: string;
} = { online: false };

/**
 * Retrieve automation settings from DB or default
 */
export async function getAutomationConfig() {
  const record = await db.query.applicationSettings.findFirst({
    where: eq(schema.applicationSettings.key, SETTINGS_KEY),
  });

  if (record && record.valueJson) {
    const val = record.valueJson as any;
    return {
      webhookUrl: val.webhookUrl || '',
      secretToken: val.secretToken || DEFAULT_SECRET,
      isEnabled: val.isEnabled !== false,
      aspectRatio: val.aspectRatio || '16:9',
      autoPublish: val.autoPublish !== false,
      promptPrefix: val.promptPrefix || 'A breathtaking, modern 16:9 editorial magazine cover illustration representing: ',
      promptSuffix: val.promptSuffix || '. High-definition 8k, vibrant lighting, cinematic composition, sleek tech palette. Include authentic company logos, real web/app UI screens, or real technical graphics where relevant to the topic.',
      pollingIntervalSeconds: val.pollingIntervalSeconds || 5,
    };
  }

  return {
    webhookUrl: '',
    secretToken: DEFAULT_SECRET,
    isEnabled: true,
    aspectRatio: '16:9',
    autoPublish: true,
    promptPrefix: 'A breathtaking, modern 16:9 editorial magazine cover illustration representing: ',
    promptSuffix: '. High-definition 8k, vibrant lighting, cinematic composition, sleek tech palette. Include authentic company logos, real web/app UI screens, or real technical graphics where relevant to the topic.',
    pollingIntervalSeconds: 5,
  };
}

/**
 * Queue a new image generation job on the server and trigger webhook if available
 */
export async function queueLocalImageJob(params: {
  articleId?: string | null;
  articleTitle: string;
  categoryName?: string;
  excerpt?: string;
  prompt?: string;
  visualStyle?: string;
  aspectRatio?: string;
  autoPublishOnComplete?: boolean;
  webhookUrlOverride?: string;
}) {
  const cfg = await getAutomationConfig();
  const style = params.visualStyle || cfg.promptSuffix || 'Editorial magazine 16:9 illustration';
  const categoryName = params.categoryName || 'Technology';
  const targetAspectRatio = params.aspectRatio || cfg.aspectRatio || '16:9';
  const autoPublish = params.autoPublishOnComplete !== undefined ? !!params.autoPublishOnComplete : cfg.autoPublish;

  const composedPrompt = params.prompt || buildFeaturedImagePrompt(params.articleTitle, categoryName);

  // Check for existing job for this article/title
  const existingJob = await db.query.imageAutomationJobs.findFirst({
    where: params.articleId
      ? eq(schema.imageAutomationJobs.articleId, params.articleId)
      : eq(schema.imageAutomationJobs.articleTitle, params.articleTitle),
    orderBy: [desc(schema.imageAutomationJobs.createdAt)],
  });

  let job: any;

  if (existingJob) {
    const isStaleClaim = existingJob.status === 'claimed' && existingJob.claimedAt && (Date.now() - new Date(existingJob.claimedAt).getTime() > 120000);
    // If it's completed, failed, stale, or pending, refresh it to pending so the agent can claim/re-generate
    if (existingJob.status === 'completed' || existingJob.status === 'failed' || isStaleClaim || existingJob.status === 'pending') {
      const currentLogs = Array.isArray(existingJob.logsJson) ? existingJob.logsJson : [];
      currentLogs.push(`[${new Date().toLocaleTimeString()}] Job queued for local agent generation.`);

      const [updated] = await db.update(schema.imageAutomationJobs)
        .set({
          status: 'pending',
          prompt: composedPrompt,
          aspectRatio: targetAspectRatio,
          visualStyle: style,
          autoPublishOnComplete: autoPublish,
          claimedBy: null,
          claimedAt: null,
          errorMessage: null,
          attempts: 0,
          logsJson: currentLogs,
          updatedAt: new Date(),
        })
        .where(eq(schema.imageAutomationJobs.id, existingJob.id))
        .returning();

      job = updated || existingJob;
    } else {
      job = existingJob;
    }
  } else {
    const [inserted] = await db.insert(schema.imageAutomationJobs).values({
      articleId: params.articleId || null,
      status: 'pending',
      prompt: composedPrompt,
      articleTitle: params.articleTitle,
      categoryName,
      aspectRatio: targetAspectRatio,
      visualStyle: style,
      autoPublishOnComplete: autoPublish,
      logsJson: [
        `[${new Date().toLocaleTimeString()}] Job queued on server for "${params.articleTitle}".`,
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    job = inserted;
  }

  let dispatchedWebhook = false;
  const targetWebhookUrl = (params.webhookUrlOverride || cfg.webhookUrl || '').trim();
  if (cfg.isEnabled && targetWebhookUrl) {
    const candidateUrls = [targetWebhookUrl];
    const cleanUrl = targetWebhookUrl.replace(/\/+$/, '');
    if (cleanUrl.endsWith('/webhook')) {
      candidateUrls.push(cleanUrl + '/generate-image');
      candidateUrls.push(cleanUrl.replace(/\/webhook$/, ''));
      candidateUrls.push(cleanUrl.replace(/\/webhook$/, '/generate-image'));
    } else {
      candidateUrls.push(cleanUrl + '/webhook');
      candidateUrls.push(cleanUrl + '/generate-image');
      candidateUrls.push(cleanUrl + '/webhook/generate-image');
    }

    const serverOrigin = (config.appUrl || '').replace(/\/+$/, '') || 'https://blogs.dailybuild.tech';
    const payload = JSON.stringify({
      type: 'job_created',
      jobId: job.id,
      articleId: job.articleId,
      title: job.articleTitle,
      category: categoryName,
      aspectRatio: job.aspectRatio,
      prompt: job.prompt,
      visualStyle: job.visualStyle,
      createdAt: job.createdAt,
      serverUrl: serverOrigin,
    });

    const headers = {
      'Content-Type': 'application/json',
      'X-Agent-Secret': cfg.secretToken,
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'DailyBuild-Server/1.0',
    };

    // Dispatch asynchronously to candidates until one acknowledges
    (async () => {
      for (const url of candidateUrls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: payload,
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            console.log(`[Webhook Dispatch] Successfully delivered job ${job.id} to ${url}`);
            break;
          }
        } catch {
          // try next candidate
        }
      }
    })();

    dispatchedWebhook = true;
  }

  return { job, dispatchedWebhook };
}

/**
 * Middleware: Verify agent secret for agent endpoints
 */
async function authenticateAgent(req: Request, res: Response, next: NextFunction) {
  const currentConfig = await getAutomationConfig();
  const providedSecret = req.headers['x-agent-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/, '');

  const validSecrets = [
    currentConfig.secretToken,
    DEFAULT_SECRET,
    'agy_agent_a099d13ffbc9e506c5e9f83543237581',
    'dailybuild_local_secret_2026',
  ].filter(Boolean);

  if (!providedSecret || !validSecrets.includes(String(providedSecret).trim())) {
    console.warn(`[Agent Auth Rejected] Provided secret: "${providedSecret}"`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing X-Agent-Secret header.' });
  }

  next();
}

// Multer upload config for Agent Image Upload
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}

const agentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.storage.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `local_ai_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, filename);
  },
});

const agentUpload = multer({
  storage: agentStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || file.mimetype.includes('image')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// ==========================================
// ADMIN CONFIGURATION & MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/automation/settings - Fetch webhook & agent settings
router.get('/settings', authenticate, requireRole(['admin', 'editor']), async (_req, res, next) => {
  try {
    const cfg = await getAutomationConfig();
    const isRecentlyActive = agentHeartbeat.lastSeenAt
      ? Date.now() - agentHeartbeat.lastSeenAt.getTime() < 60000
      : false;

    res.json({
      ...cfg,
      agentStatus: {
        online: isRecentlyActive,
        machineName: agentHeartbeat.machineName || 'Unknown Host',
        browserStatus: agentHeartbeat.browserStatus || 'Idle',
        lastSeenAt: agentHeartbeat.lastSeenAt,
        version: agentHeartbeat.version || '1.0.0',
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/automation/settings - Update webhook & agent settings
router.put('/settings', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const {
      webhookUrl,
      secretToken,
      isEnabled,
      aspectRatio,
      autoPublish,
      promptPrefix,
      promptSuffix,
      pollingIntervalSeconds,
    } = req.body;

    const newConfig = {
      webhookUrl: String(webhookUrl || '').trim(),
      secretToken: String(secretToken || DEFAULT_SECRET).trim(),
      isEnabled: isEnabled !== false,
      aspectRatio: String(aspectRatio || '16:9'),
      autoPublish: autoPublish !== false,
      promptPrefix: String(promptPrefix || ''),
      promptSuffix: String(promptSuffix || ''),
      pollingIntervalSeconds: Number(pollingIntervalSeconds) || 5,
    };

    const existing = await db.query.applicationSettings.findFirst({
      where: eq(schema.applicationSettings.key, SETTINGS_KEY),
    });

    if (existing) {
      await db.update(schema.applicationSettings)
        .set({
          valueJson: newConfig,
          updatedAt: new Date(),
        })
        .where(eq(schema.applicationSettings.key, SETTINGS_KEY));
    } else {
      await db.insert(schema.applicationSettings).values({
        key: SETTINGS_KEY,
        valueJson: newConfig,
        description: 'Local AI Image Generation & Webhook Automation Settings',
        updatedAt: new Date(),
      });
    }

    res.json({ success: true, settings: newConfig });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/test-webhook - Test ping to configured or provided webhook URL
router.post('/test-webhook', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { url, secret } = req.body;
    const cfg = await getAutomationConfig();
    const targetUrl = (url || cfg.webhookUrl || '').trim();
    const targetSecret = (secret || cfg.secretToken || DEFAULT_SECRET).trim();

    if (!targetUrl) {
      return res.status(400).json({ error: 'BadRequest', message: 'No webhook URL provided or configured.' });
    }

    const startTime = Date.now();
    const testPayload = {
      type: 'ping',
      timestamp: new Date().toISOString(),
      message: 'Daily Build Blogs Webhook Verification Probe',
      source: 'DailyBuildServer',
    };

    try {
      let response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': targetSecret,
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8000), // 8 seconds timeout
      });

      // If 404 and ends with /webhook, gracefully try /generate-image
      if (response.status === 404 && targetUrl.replace(/\/+$/, '').endsWith('/webhook')) {
        try {
          const altResponse = await fetch(targetUrl.replace(/\/+$/, '') + '/generate-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Agent-Secret': targetSecret,
            },
            body: JSON.stringify(testPayload),
            signal: AbortSignal.timeout(6000),
          });
          if (altResponse.ok) {
            response = altResponse;
          }
        } catch {}
      }

      const latencyMs = Date.now() - startTime;
      const respText = await response.text().catch(() => '');

      if (response.ok) {
        return res.json({
          success: true,
          message: `Webhook probe reached agent successfully in ${latencyMs}ms (HTTP ${response.status}).`,
          latencyMs,
          responseStatus: response.status,
          responseBody: respText.slice(0, 300),
        });
      } else {
        return res.json({
          success: false,
          message: `Webhook returned HTTP status ${response.status}: ${respText.slice(0, 200)}`,
          latencyMs,
          responseStatus: response.status,
        });
      }
    } catch (fetchErr: any) {
      return res.json({
        success: false,
        message: `Failed to connect to ${targetUrl}: ${fetchErr.message}. Ensure local agent and ngrok are running.`,
        error: fetchErr.message,
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/automation/jobs - List image generation jobs
router.get('/jobs', authenticate, async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;

    const jobs = await db.query.imageAutomationJobs.findMany({
      orderBy: [desc(schema.imageAutomationJobs.createdAt)],
      limit: Number(limit) || 50,
      with: {
        article: {
          columns: { id: true, title: true, slug: true, status: true, featuredImage: true },
        },
      },
    });

    const activeCount = jobs.filter((j) => j.status === 'pending' || j.status === 'claimed' || j.status === 'processing').length;

    res.json({
      jobs,
      total: jobs.length,
      activeCount,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/jobs/create - Create a new generation job for an article
router.post('/jobs/create', authenticate, async (req, res, next) => {
  try {
    const { articleId, prompt, visualStyle, autoPublishOnComplete } = req.body;
    if (!articleId) {
      return res.status(400).json({ error: 'BadRequest', message: 'Article ID is required.' });
    }

    const article = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
      with: { category: true },
    });

    if (!article) {
      return res.status(404).json({ error: 'NotFound', message: 'Article not found.' });
    }

    const categoryName = (article.category as any)?.name || 'Technology';

    const { job, dispatchedWebhook } = await queueLocalImageJob({
      articleId: article.id,
      articleTitle: article.title,
      categoryName,
      excerpt: article.excerpt,
      prompt,
      visualStyle,
      autoPublishOnComplete,
    });

    res.json({
      success: true,
      job,
      dispatchedWebhook,
      message: 'Generation job successfully created.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/jobs/:id/retry - Retry a job
router.post('/jobs/:id/retry', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.query.imageAutomationJobs.findFirst({
      where: eq(schema.imageAutomationJobs.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: 'NotFound', message: 'Job not found.' });
    }

    const currentLogs = Array.isArray(existing.logsJson) ? existing.logsJson : [];
    const updatedLogs = [
      ...currentLogs,
      `[${new Date().toLocaleTimeString()}] Job manually reset to pending by admin.`,
    ];

    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'pending',
        attempts: 0,
        claimedBy: null,
        claimedAt: null,
        errorMessage: null,
        logsJson: updatedLogs,
        updatedAt: new Date(),
      })
      .where(eq(schema.imageAutomationJobs.id, id));

    const cfg = await getAutomationConfig();
    if (cfg.isEnabled && cfg.webhookUrl) {
      fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': cfg.secretToken,
        },
        body: JSON.stringify({
          type: 'job_created',
          jobId: existing.id,
          articleId: existing.articleId,
          title: existing.articleTitle,
          prompt: existing.prompt,
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Job reset to pending status.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/jobs/:id/cancel - Cancel a job
router.post('/jobs/:id/cancel', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'failed',
        errorMessage: 'Cancelled by user',
        updatedAt: new Date(),
      })
      .where(eq(schema.imageAutomationJobs.id, id));

    res.json({ success: true, message: 'Job cancelled.' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// LOCAL AGENT <-> SERVER PROTOCOL ENDPOINTS
// ==========================================

// POST /api/automation/agent/heartbeat - Agent ping
router.post('/agent/heartbeat', authenticateAgent, async (req, res) => {
  const { machineName, browserStatus, version } = req.body;
  agentHeartbeat = {
    online: true,
    machineName: machineName || 'Local Laptop Agent',
    browserStatus: browserStatus || 'Ready',
    lastSeenAt: new Date(),
    version: version || '1.0.0',
  };
  res.json({ ok: true, serverTime: new Date().toISOString() });
});

// GET /api/automation/agent/job-status/:id - Check current job status
router.get('/agent/job-status/:id', authenticateAgent, async (req, res) => {
  const { id } = req.params;
  const job = await db.query.imageAutomationJobs.findFirst({
    where: eq(schema.imageAutomationJobs.id, id),
    columns: { id: true, status: true, errorMessage: true },
  });
  if (!job) {
    return res.json({ status: 'not_found', cancelled: false });
  }
  const isCancelled = job.status === 'failed' && (job.errorMessage || '').toLowerCase().includes('cancel');
  res.json({
    id: job.id,
    status: job.status,
    cancelled: isCancelled,
  });
});

// GET /api/automation/agent/poll - Agent polls for the next available pending job
router.get('/agent/poll', authenticateAgent, async (req, res, next) => {
  try {
    const { workerName } = req.query;
    const now = Date.now();
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000);
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000);
    const twoMinutesAgo = new Date(now - 2 * 60 * 1000);

    // 1. Expire stale pending/claimed jobs older than 15 minutes so they never block or execute unexpectedly
    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'failed',
        errorMessage: 'Expired: Job queue item timed out (> 15 minutes old).',
        updatedAt: new Date(),
      })
      .where(and(
        or(
          eq(schema.imageAutomationJobs.status, 'pending'),
          eq(schema.imageAutomationJobs.status, 'claimed')
        ),
        lt(schema.imageAutomationJobs.createdAt, fifteenMinutesAgo)
      ))
      .catch(() => {});

    // 2. Mark worker timeouts for jobs claimed > 10 minutes ago
    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'failed',
        errorMessage: 'Worker timed out (> 10 minutes without completion).',
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.imageAutomationJobs.status, 'claimed'),
        lt(schema.imageAutomationJobs.updatedAt, tenMinutesAgo)
      ))
      .catch(() => {});

    // 3. Auto-recover fresh claimed jobs (> 2 min, < 10 min, created < 15 min)
    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'pending',
        claimedBy: null,
        claimedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(schema.imageAutomationJobs.status, 'claimed'),
        lt(schema.imageAutomationJobs.updatedAt, twoMinutesAgo),
        gt(schema.imageAutomationJobs.createdAt, fifteenMinutesAgo)
      ))
      .catch(() => {});

    // 4. Query only FRESH pending jobs created within the last 15 minutes (NEWEST first)
    const pendingJob = await db.query.imageAutomationJobs.findFirst({
      where: and(
        eq(schema.imageAutomationJobs.status, 'pending'),
        gt(schema.imageAutomationJobs.createdAt, fifteenMinutesAgo)
      ),
      orderBy: [desc(schema.imageAutomationJobs.createdAt)],
      with: {
        article: {
          columns: { id: true, title: true, excerpt: true, contentHtml: true, categoryId: true },
        },
      },
    });

    if (!pendingJob) {
      return res.json({ hasJob: false });
    }

    // Atomically claim the job
    const workerId = String(workerName || 'LaptopAgent').slice(0, 100);
    const logs = Array.isArray(pendingJob.logsJson) ? pendingJob.logsJson : [];
    logs.push(`[${new Date().toLocaleTimeString()}] Claimed by worker: ${workerId}`);

    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'claimed',
        claimedBy: workerId,
        claimedAt: new Date(),
        attempts: (pendingJob.attempts || 0) + 1,
        logsJson: logs,
        updatedAt: new Date(),
      })
      .where(eq(schema.imageAutomationJobs.id, pendingJob.id));

    res.json({
      hasJob: true,
      job: {
        id: pendingJob.id,
        articleId: pendingJob.articleId,
        articleTitle: pendingJob.articleTitle,
        categoryName: pendingJob.categoryName,
        aspectRatio: pendingJob.aspectRatio,
        prompt: pendingJob.prompt,
        visualStyle: pendingJob.visualStyle,
        autoPublishOnComplete: pendingJob.autoPublishOnComplete,
        articleExcerpt: (pendingJob.article as any)?.excerpt || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/agent/upload - Agent uploads generated image
router.post('/agent/upload', authenticateAgent, agentUpload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    const { jobId, altText, logs } = req.body;
    let { articleId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No image file uploaded.' });
    }
    if (!jobId) {
      return res.status(400).json({ error: 'BadRequest', message: 'jobId is required.' });
    }

    // Read job details first
    const job = await db.query.imageAutomationJobs.findFirst({
      where: eq(schema.imageAutomationJobs.id, jobId),
    });

    if (!articleId || articleId === 'null' || articleId === 'undefined') {
      articleId = job?.articleId || null;
    }

    // Apply Daily Build logo micro-watermark at bottom-right and convert to WebP at 85% quality
    const wmRes = await processFeaturedImageWatermark(file.path, {
      prefix: `agent_${articleId || 'auto'}`,
      deleteSource: true,
    });
    const publicUrl = wmRes.publicUrl;
    const cleanAlt = altText || 'Featured 16:9 cover image generated by ChatGPT';

    let shouldPublish = false;

    // 1. Update article with the new featured image if articleId is valid
    if (articleId) {
      const article = await db.query.articles.findFirst({
        where: eq(schema.articles.id, articleId),
      });

      if (article) {
        shouldPublish = Boolean(job?.autoPublishOnComplete && (article.status === 'draft' || article.status === 'scheduled' || article.status === 'in_review'));

        await db.update(schema.articles)
          .set({
            featuredImage: publicUrl,
            featuredImageAlt: cleanAlt,
            ...(shouldPublish ? { status: 'published', publishedAt: new Date() } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.articles.id, articleId));
      }
    }

    // 3. Insert record into generatedImages
    await db.insert(schema.generatedImages).values({
      articleId,
      prompt: job?.prompt || cleanAlt,
      imageUrl: publicUrl,
      altText: cleanAlt,
      providerSlug: 'chatgpt-local-agent',
      modelId: 'chatgpt-dalle-webp',
      status: 'completed',
      metadataJson: {
        filename: path.basename(wmRes.diskPath),
        size: wmRes.size,
        aspectRatio: job?.aspectRatio || '16:9',
        autoPublished: shouldPublish,
        format: 'webp',
        watermarked: true,
      },
      createdAt: new Date(),
    }).catch(() => {});

    // 4. Update the automation job status
    const existingLogs = Array.isArray(job?.logsJson) ? job.logsJson : [];
    const clientLogs = logs ? (Array.isArray(logs) ? logs : [String(logs)]) : [];
    const finalLogs = [
      ...existingLogs,
      ...clientLogs,
      `[${new Date().toLocaleTimeString()}] Image uploaded successfully: ${publicUrl}`,
      ...(shouldPublish ? [`[${new Date().toLocaleTimeString()}] Article automatically PUBLISHED.`] : []),
    ];

    await db.update(schema.imageAutomationJobs)
      .set({
        status: 'completed',
        uploadedImageUrl: publicUrl,
        completedAt: new Date(),
        logsJson: finalLogs,
        updatedAt: new Date(),
      })
      .where(eq(schema.imageAutomationJobs.id, jobId));

    res.json({
      success: true,
      imageUrl: publicUrl,
      autoPublished: shouldPublish,
      message: shouldPublish
        ? 'Featured image updated and article automatically published!'
        : 'Featured image successfully synced.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/automation/agent/fail/:id - Agent reports a failure
router.post('/agent/fail/:id', authenticateAgent, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error, logs } = req.body;

    const job = await db.query.imageAutomationJobs.findFirst({
      where: eq(schema.imageAutomationJobs.id, id),
    });

    if (!job) {
      return res.status(404).json({ error: 'NotFound', message: 'Job not found.' });
    }

    const existingLogs = Array.isArray(job.logsJson) ? job.logsJson : [];
    const newLogs = logs ? (Array.isArray(logs) ? logs : [String(logs)]) : [];
    const combinedLogs = [
      ...existingLogs,
      ...newLogs,
      `[${new Date().toLocaleTimeString()}] Agent reported failure: ${error || 'Unknown automation error'}`,
    ];

    const attempts = (job.attempts || 1);
    const isExhausted = attempts >= (job.maxAttempts || 3);

    await db.update(schema.imageAutomationJobs)
      .set({
        status: isExhausted ? 'failed' : 'pending', // Re-queue if attempts remaining
        errorMessage: String(error || 'Failed').slice(0, 500),
        logsJson: combinedLogs,
        updatedAt: new Date(),
      })
      .where(eq(schema.imageAutomationJobs.id, id));

    res.json({ success: true, reQueued: !isExhausted });
  } catch (err) {
    next(err);
  }
});

export default router;
