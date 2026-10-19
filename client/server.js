import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '4444', 10);
const API_TARGET = process.env.API_TARGET || 'http://localhost:4000';
const APP_URL = (process.env.APP_URL || 'https://blogs.dailybuild.tech').replace(/\/$/, '');

function toAbsoluteImageUrl(imgUrl, baseUrl) {
  if (!imgUrl || !imgUrl.trim()) {
    return `${baseUrl}/og-default.jpg`;
  }
  const trimmed = imgUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

function getImageMimeType(url) {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DIST_CLIENT_DIR = path.resolve(__dirname, 'dist', 'client');
const DIST_SERVER_DIR = path.resolve(__dirname, 'dist', 'server');
const CLIENT_INDEX_HTML_PATH = path.resolve(DIST_CLIENT_DIR, 'index.html');
const SERVER_ENTRY_PATH = path.resolve(DIST_SERVER_DIR, 'entry-server.js');

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// 1. Transparent Proxy for /api and /uploads to Backend Server
function proxyRequest(req, res, targetBaseUrl) {
  try {
    const targetUrl = new URL(req.originalUrl, targetBaseUrl);
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Backend API Proxy Error',
          message: `Unable to reach backend at ${targetBaseUrl}`,
          details: err.message,
        });
      }
    });

    req.pipe(proxyReq);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy request failed', details: err.message });
    }
  }
}

app.use('/api', (req, res) => {
  proxyRequest(req, res, API_TARGET);
});

app.use('/uploads', (req, res) => {
  proxyRequest(req, res, API_TARGET);
});

// 2. Serve Static Assets from dist/client (JS, CSS, images, etc.)
// index: false ensures root '/' is handled by SSR handler below
if (fs.existsSync(DIST_CLIENT_DIR)) {
  app.use(
    express.static(DIST_CLIENT_DIR, {
      index: false,
      maxAge: '1h',
    })
  );
}

// Helper to prefetch article metadata for SSR hydration and SEO
async function fetchArticleMetadata(slug) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_TARGET}/api/articles/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Helper to prefetch homepage dispatches and categories for SSR hydration
async function fetchHomeData() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const [articlesRes, categoriesRes] = await Promise.all([
      fetch(`${API_TARGET}/api/articles?limit=18&status=published`, { signal: controller.signal }),
      fetch(`${API_TARGET}/api/categories`, { signal: controller.signal }),
    ]);
    clearTimeout(timer);
    const articlesData = articlesRes.ok ? await articlesRes.json() : [];
    const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
    const articles = Array.isArray(articlesData) ? articlesData : (articlesData.articles || []);
    const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.categories || []);
    return { articles, categories };
  } catch {
    return { articles: [], categories: [] };
  }
}

// 3. Server-Side Rendering Handler for all HTML routes
app.get('*', async (req, res, next) => {
  const url = req.originalUrl;
  const cleanUrl = url.split('?')[0].replace(/\/$/, '') || '/';

  // Skip static asset requests that weren't found
  if (url.startsWith('/assets/') || url.includes('.')) {
    return next();
  }

  // Verify build artifacts exist
  if (!fs.existsSync(CLIENT_INDEX_HTML_PATH) || !fs.existsSync(SERVER_ENTRY_PATH)) {
    return res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Build Required — Daily Build</title></head>
        <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
          <h2>Production Build Not Found</h2>
          <p>Please build the client and SSR bundle first:</p>
          <pre style="background: #f1f5f9; padding: 1rem; border-radius: 8px; display: inline-block;">npm run build:all</pre>
        </body>
      </html>
    `);
  }

  try {
    // 1. Read index.html template
    let template = fs.readFileSync(CLIENT_INDEX_HTML_PATH, 'utf-8');

    // 2. Dynamic import the SSR entry
    const entryUrl = pathToFileURL(SERVER_ENTRY_PATH).href;
    const { render } = await import(entryUrl);

    // 3. Handle Route-Specific Metadata & Hydration Context
    let headTags = '';
    let hydrationScript = '';
    let ssrContext = undefined;

    const articleMatch = url.match(/^\/article\/([^/?#]+)/);
    if (articleMatch) {
      const slug = articleMatch[1];
      const article = await fetchArticleMetadata(slug);

      if (article) {
        ssrContext = { initialData: { article } };

        // Prepare initial data script for seamless client hydration
        hydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify({ article }).replace(/</g, '\\u003c')};</script>`;

        // Prepare SEO & OpenGraph tags
        const rawTitle = (article.metaTitle || article.title || 'Daily Build').trim();
        const cleanTitle = escapeHtml(rawTitle);
        const pageTitle = `${cleanTitle} — Daily Build`;
        const rawDesc = (article.metaDescription || article.excerpt || '').trim();
        const cleanDesc = escapeHtml(rawDesc);
        const canonical = `${APP_URL}/article/${article.slug}`;
        const socialImageUrl = toAbsoluteImageUrl(article.featuredImage, APP_URL);
        const imageMimeType = getImageMimeType(socialImageUrl);
        const imageAlt = escapeHtml(article.featuredImageAlt || article.title || 'Daily Build');

        headTags = `
    <title>${pageTitle}</title>
    <meta name="description" content="${cleanDesc}" />
    <link rel="canonical" href="${canonical}" />

    <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
    <meta property="og:site_name" content="Daily Build" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta property="og:image:url" content="${socialImageUrl}" />
    ${socialImageUrl.startsWith('https://') ? `<meta property="og:image:secure_url" content="${socialImageUrl}" />` : ''}
    <meta property="og:image:type" content="${imageMimeType}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    ${article.publishedAt ? `<meta property="article:published_time" content="${new Date(article.publishedAt).toISOString()}" />` : ''}
    ${article.updatedAt ? `<meta property="article:modified_time" content="${new Date(article.updatedAt).toISOString()}" />` : ''}
    ${article.category?.name ? `<meta property="article:section" content="${escapeHtml(article.category.name)}" />` : ''}

    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@DailyBuild" />
    <meta name="twitter:title" content="${pageTitle}" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <meta name="twitter:image:alt" content="${imageAlt}" />

    <!-- Schema.org / Microdata -->
    <meta itemprop="name" content="${pageTitle}" />
    <meta itemprop="description" content="${cleanDesc}" />
    <meta itemprop="image" content="${socialImageUrl}" />`;

        // Remove default title and description from template
        template = template.replace(/<title>[\s\S]*?<\/title>/i, '');
        template = template.replace(/<meta\s+name="description"[\s\S]*?>/i, '');
      }
    } else if (cleanUrl === '/') {
      const homeData = await fetchHomeData();
      ssrContext = { initialData: homeData };
      hydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(homeData).replace(/</g, '\\u003c')};</script>`;

      // Preload LCP hero image to maximize Core Web Vitals
      const leadStory = homeData.articles?.[0];
      if (leadStory?.featuredImage) {
        const leadImgUrl = toAbsoluteImageUrl(leadStory.featuredImage, APP_URL);
        headTags += `\n    <link rel="preload" as="image" href="${leadImgUrl}" fetchpriority="high" />`;
      }
    }

    // 4. Render the application for current route with context
    const { html: appHtml } = render(url, ssrContext);

    // 5. Inject SSR content into template
    let finalHtml = template
      .replace('<!--ssr-head-->', headTags)
      .replace('<!--ssr-outlet-->', appHtml);

    if (hydrationScript) {
      finalHtml = finalHtml.replace('</head>', `${hydrationScript}\n</head>`);
    }

    // 6. Send the complete SSR HTML
    res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
  } catch (err) {
    console.error(`[SSR] Rendering error for ${url}:`, err);

    // Graceful fallback to client-side rendering
    try {
      const fallbackHtml = fs.readFileSync(CLIENT_INDEX_HTML_PATH, 'utf-8');
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(fallbackHtml);
    } catch {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Start listening
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Daily Build Client] SSR Express Server running on http://localhost:${PORT}`);
  console.log(`[Daily Build Client] Serving client from ${DIST_CLIENT_DIR}`);
  console.log(`[Daily Build Client] Proxying /api to ${API_TARGET}`);
});

// Graceful termination
const shutdown = () => {
  console.log('[Daily Build Client] Shutting down SSR server...');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
