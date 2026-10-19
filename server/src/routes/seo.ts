import { Router } from 'express';
import { seoService } from '../services/seo/seo-service.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /sitemap.xml
router.get('/sitemap.xml', async (_req, res, next) => {
  try {
    const xml = await seoService.generateSitemapXml();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// GET /rss.xml
router.get('/rss.xml', async (_req, res, next) => {
  try {
    const xml = await seoService.generateRssXml();
    res.header('Content-Type', 'application/rss+xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// GET /robots.txt
router.get('/robots.txt', (_req, res) => {
  const robots = seoService.generateRobotsTxt();
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// POST /api/seo/internal-links
router.post('/internal-links', authenticate, async (req, res, next) => {
  try {
    const { articleId, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required.' });
    }
    const suggestions = await seoService.findInternalLinkSuggestions(articleId || '', content);
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

export default router;
