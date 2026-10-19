import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config/index.js';
import { checkDatabaseConnection } from './database/db.js';
import { runMigrations } from './database/migrate.js';
import { runSeed } from './database/seed.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import sharp from 'sharp';
import { handleSsr } from './ssr.js';

// Import Route Handlers
import authRouter from './routes/auth.js';
import articlesRouter from './routes/articles.js';
import categoriesRouter from './routes/categories.js';
import sourcesRouter from './routes/sources.js';
import aiRouter from './routes/ai.js';
import imageRouter from './routes/image.js';
import workflowsRouter from './routes/workflows.js';
import mediaRouter from './routes/media.js';
import seoRouter from './routes/seo.js';
import newsletterRouter from './routes/newsletter.js';
import analyticsRouter from './routes/analytics.js';
import settingsRouter from './routes/settings.js';
import trainingRouter from './routes/training.js';
import automationRouter from './routes/automation.js';
import sitesRouter from './routes/sites.js';

const app = express();

// Trust reverse proxy headers (e.g., Nginx, Cloudflare, PM2) so Express and express-rate-limit
// can accurately determine the client IP address from X-Forwarded-For
app.set('trust proxy', 1);

// 1. Security & Core Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://*.googleapis.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Static Assets
const uploadsDir = config.storage.uploadDir;
const uploadsCacheDir = path.join(uploadsDir, '.cache');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(uploadsCacheDir)) {
  fs.mkdirSync(uploadsCacheDir, { recursive: true });
}

// Optimized dynamic responsive image endpoint
app.get('/uploads/:filename', async (req, res, next) => {
  const { filename } = req.params;
  const w = req.query.w;

  if (!w || typeof w !== 'string') {
    return next();
  }

  const targetWidth = parseInt(w, 10);
  if (isNaN(targetWidth) || targetWidth <= 0 || targetWidth > 2560) {
    return next();
  }

  const sourcePath = path.resolve(uploadsDir, filename);
  // Path traversal prevention
  if (!sourcePath.startsWith(uploadsDir) || !fs.existsSync(sourcePath)) {
    return next();
  }

  const ext = path.extname(filename).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return next();
  }

  const baseName = path.basename(filename, ext);
  const cachedFileName = `${baseName}_w${targetWidth}.webp`;
  const cachedFilePath = path.join(uploadsCacheDir, cachedFileName);

  try {
    if (fs.existsSync(cachedFilePath)) {
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(cachedFilePath);
    }

    await sharp(sourcePath)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(cachedFilePath);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(cachedFilePath);
  } catch (err) {
    console.error(`[Image Resize Error] ${filename}:`, err);
    return next();
  }
});

app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));

// Serve client built static assets in production
const clientDist = path.resolve(process.cwd(), '../client/dist/client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
}

// 3. Root SEO endpoints
app.use('/', seoRouter);

// 4. API Endpoints under /api/*
app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sources', sourcesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/image', imageRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/seo', seoRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/training', trainingRouter);
app.use('/api/automation', automationRouter);
app.use('/api/sites', sitesRouter);

// Explicitly ensure 404 for unmatched /api/* requests (do NOT fall through to SPA!)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `API endpoint '${req.method} ${req.url}' does not exist.`,
  });
});

// 5. Public Website & Admin SPA fallback handled via React SSR engine
app.get('*', handleSsr);

// 6. Centralized Error Handler
app.use(errorHandler);

// 7. Server Initialization & Database Self-Check
async function startServer() {
  console.log(`[DailyBuild Tech] Starting server in ${config.env} mode...`);

  try {
    const dbCheck = await checkDatabaseConnection();
    if (dbCheck.connected) {
      console.log(`[Database] Successfully connected to PostgreSQL ('${config.database.name}')`);

      // Run automatic schema migrations if needed
      try {
        await runMigrations();
      } catch (migErr: any) {
        console.warn(`[Database Migration Notice]: ${migErr.message}`);
      }
      
      // Auto-sync Google Antigravity CLI and OpenAI Codex CLI providers & models
      try {
        const { db } = await import('./database/db.js');
        const schema = await import('./database/schema.js');
        const { eq } = await import('drizzle-orm');
        const { providerRegistry } = await import('./services/ai/provider-registry.js');

        // 1. Antigravity CLI
        const existingAgy = await db.query.aiProviders.findFirst({
          where: eq(schema.aiProviders.slug, 'antigravity')
        });

        if (!existingAgy) {
          await db.insert(schema.aiProviders).values({
            name: 'Google Antigravity CLI (agy)',
            slug: 'antigravity',
            isEnabled: true,
            apiKeyEncrypted: null,
            baseUrl: 'agy-cli',
            isFreeTierAvailable: true,
            rateLimitsInfo: 'Native high-performance Google Antigravity CLI binary with full agentic capabilities.',
            pricingDocUrl: 'https://antigravity.google/docs/cli',
          });
          console.log('[AI Setup] Seeded Google Antigravity CLI (agy) provider.');
        }

        await providerRegistry.testAndDiscover('antigravity');
        console.log('[AI Setup] Verified and synchronized Antigravity CLI models.');

        // 2. OpenAI Codex CLI
        const existingCodex = await db.query.aiProviders.findFirst({
          where: eq(schema.aiProviders.slug, 'codex')
        });

        if (!existingCodex) {
          await db.insert(schema.aiProviders).values({
            name: 'OpenAI Codex CLI (codex)',
            slug: 'codex',
            isEnabled: true,
            apiKeyEncrypted: null,
            baseUrl: 'codex-cli',
            isFreeTierAvailable: true,
            rateLimitsInfo: 'Authenticated OpenAI Codex CLI operating in strict read-only sandbox mode.',
            pricingDocUrl: 'https://openai.com/codex',
          });
          console.log('[AI Setup] Seeded OpenAI Codex CLI (codex) provider.');
        }

        await providerRegistry.testAndDiscover('codex');
        console.log('[AI Setup] Verified and synchronized Codex CLI models.');
      } catch (provErr: any) {
        console.warn(`[AI Setup Warning]: ${provErr.message}`);
      }
    } else {
      console.warn(`[Database Notice] PostgreSQL connection failed: ${dbCheck.error}. Server will start; please configure DATABASE_URL in .env.`);
    }
  } catch (err: any) {
    console.warn(`[Database Check Warning]: ${err.message}`);
  }

  const server = app.listen(config.port, () => {
    console.log(`[DailyBuild Tech] Server is live on port ${config.port}`);
    console.log(`[Public Website] ${config.appUrl}`);
    console.log(`[Admin CMS]     ${config.appUrl}/admin`);
    console.log(`[API Base]      ${config.appUrl}/api`);

    // Initialize background worker daemon (cron scheduler, RSS feed poller, scheduled article publisher)
    if (process.env.DISABLE_WORKER !== 'true') {
      import('./worker.js').catch((err) => {
        console.error('[Worker Daemon Error]:', err.message);
      });
    }
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('\n[DailyBuild Tech] Received shutdown signal. Closing server gracefully...');
    server.close(() => {
      console.log('[DailyBuild Tech] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();

export default app;
