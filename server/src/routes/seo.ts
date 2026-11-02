import { Router } from 'express';
import * as cheerio from 'cheerio';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { seoService } from '../services/seo/seo-service.js';
import { seoCrawlerService } from '../services/seo/crawler.js';
import { keywordIntelligenceService } from '../services/seo/keyword-service.js';
import { onPageOptimizerService } from '../services/seo/on-page-service.js';
import { aeoGeoAnalyzerService } from '../services/seo/aeo-geo-service.js';
import { internalLinkingService } from '../services/seo/internal-linking-service.js';
import { schemaValidatorService } from '../services/seo/schema-validator-service.js';
import { indexingSitemapService } from '../services/seo/indexing-service.js';
import { contentDecayDetectorService } from '../services/seo/content-decay-service.js';
import { duplicateContentService } from '../services/seo/duplicate-content-service.js';
import { contentQualityService } from '../services/seo/content-quality-service.js';
import { serpPreviewService } from '../services/seo/serp-preview-service.js';
import { topicalAuthorityService } from '../services/seo/topical-authority-service.js';
import { contentFreshnessService } from '../services/seo/content-freshness-service.js';
import { crawlabilityInspectorService } from '../services/seo/crawlability-service.js';
import { aiSearchTrackerService } from '../services/seo/ai-search-tracker-service.js';
import { publicationGateService } from '../services/seo/publication-gate-service.js';
import { config } from '../config/index.js';

const router = Router();

// ==========================================
// 1. PUBLIC ROOT ENDPOINTS (XML, TXT, INDEXNOW)
// ==========================================

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
router.get('/robots.txt', async (_req, res) => {
  try {
    const settings = await db.query.seoSettings.findFirst();
    if (settings?.customRobotsTxt && settings.customRobotsTxt.trim().length > 0) {
      res.header('Content-Type', 'text/plain');
      return res.send(settings.customRobotsTxt);
    }
  } catch {
    // fallback to dynamic generator
  }
  const robots = seoService.generateRobotsTxt();
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// GET /:key.txt - IndexNow Key Verification Endpoint
router.get('/:keyFile.txt', async (req, res, next) => {
  const { keyFile } = req.params;
  try {
    const activeKey = await indexingSitemapService.getOrCreateIndexNowKey();
    if (keyFile === activeKey) {
      res.header('Content-Type', 'text/plain');
      return res.send(activeKey);
    }
  } catch {
    // continue
  }
  next();
});

// ==========================================
// 2. SEO SUITE UNIFIED OVERVIEW & SETTINGS
// ==========================================

// GET /api/seo/overview
router.get('/overview', authenticate, async (_req, res, next) => {
  try {
    const [latestAudit] = await db.query.seoAudits.findMany({
      orderBy: [desc(schema.seoAudits.startedAt)],
      limit: 1,
    });

    const [publishedCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.articles)
      .where(eq(schema.articles.status, 'published'));

    const publishedCount = Number(publishedCountRes?.count) || 0;

    const [totalKeywordsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.seoKeywordResearch);

    const [indexingLogsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.seoIndexingLogs);

    const linkGraph = await internalLinkingService.getSiteLinkGraphOverview();
    const freshness = await contentFreshnessService.getFreshnessReviewQueue(90);
    const topical = await topicalAuthorityService.analyzeTopicalAuthority();
    const settings = await db.query.seoSettings.findFirst();

    res.json({
      siteUrl: config.appUrl,
      publishedArticlesCount: publishedCount,
      latestAudit: latestAudit ? {
        id: latestAudit.id,
        score: latestAudit.score,
        pagesCrawled: latestAudit.pagesCrawled,
        issuesCount: latestAudit.issuesCount,
        completedAt: latestAudit.completedAt,
        status: latestAudit.status,
      } : null,
      internalLinksHealth: {
        orphanPagesCount: linkGraph.orphanPages.length,
        underlinkedPagesCount: linkGraph.underlinkedPages.length,
        pillarPagesCount: linkGraph.pillarPages.length,
      },
      freshnessHealth: {
        dueForReviewCount: freshness.dueForReviewCount,
        staleCount: freshness.staleCount,
      },
      topicalAuthority: {
        overallScore: topical.overallAuthorityScore,
        totalClusters: topical.totalClusters,
        totalGapsIdentified: topical.totalGapsIdentified,
      },
      indexing: {
        totalSubmissions: Number(indexingLogsRes?.count) || 0,
        indexNowKeyConfigured: Boolean(settings?.indexNowKey),
        autoIndexOnPublish: settings?.autoIndexOnPublish ?? true,
      },
      keywordsTracked: Number(totalKeywordsRes?.count) || 0,
      publicationPolicy: settings?.publicationPolicy || 'warning_only',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/settings
router.get('/settings', authenticate, async (_req, res, next) => {
  try {
    let settings = await db.query.seoSettings.findFirst();
    if (!settings) {
      const defaultKey = 'dailybuild_indexnow_3f92b7e10c4a';
      [settings] = await db.insert(schema.seoSettings).values({
        indexNowKey: defaultKey,
        autoIndexOnPublish: true,
        publicationPolicy: 'warning_only',
        auditSchedule: 'weekly',
        freshnessThresholdDays: 90,
      }).returning();
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/seo/settings
router.put('/settings', authenticate, async (req, res, next) => {
  try {
    const {
      indexNowKey,
      autoIndexOnPublish,
      publicationPolicy,
      auditSchedule,
      freshnessThresholdDays,
      bingApiKey,
      customRobotsTxt,
    } = req.body;

    const existing = await db.query.seoSettings.findFirst();

    if (existing) {
      const [updated] = await db.update(schema.seoSettings)
        .set({
          indexNowKey: indexNowKey ?? existing.indexNowKey,
          autoIndexOnPublish: typeof autoIndexOnPublish === 'boolean' ? autoIndexOnPublish : existing.autoIndexOnPublish,
          publicationPolicy: publicationPolicy ?? existing.publicationPolicy,
          auditSchedule: auditSchedule ?? existing.auditSchedule,
          freshnessThresholdDays: freshnessThresholdDays ? Number(freshnessThresholdDays) : existing.freshnessThresholdDays,
          bingApiKey: bingApiKey !== undefined ? bingApiKey : existing.bingApiKey,
          customRobotsTxt: customRobotsTxt !== undefined ? customRobotsTxt : existing.customRobotsTxt,
          updatedAt: new Date(),
        })
        .where(eq(schema.seoSettings.id, existing.id))
        .returning();

      return res.json({ success: true, settings: updated });
    }

    const [created] = await db.insert(schema.seoSettings).values({
      indexNowKey: indexNowKey || 'dailybuild_indexnow_3f92b7e10c4a',
      autoIndexOnPublish: autoIndexOnPublish ?? true,
      publicationPolicy: publicationPolicy || 'warning_only',
      auditSchedule: auditSchedule || 'weekly',
      freshnessThresholdDays: freshnessThresholdDays ? Number(freshnessThresholdDays) : 90,
      bingApiKey: bingApiKey || null,
      customRobotsTxt: customRobotsTxt || null,
    }).returning();

    res.json({ success: true, settings: created });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. TOOL 1: SEO AUDIT & SITE CRAWLER
// ==========================================

// POST /api/seo/audit/single
router.post('/audit/single', authenticate, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Target URL is required.' });

    const auditResult = await seoCrawlerService.auditSinglePage(url);
    const criticalCount = (auditResult.findings || []).filter((f) => f.severity === 'critical').length;
    const warningCount = (auditResult.findings || []).filter((f) => f.severity === 'warning').length;
    const noticeCount = (auditResult.findings || []).filter((f) => f.severity === 'notice').length;
    const penalty = (criticalCount * 12) + (warningCount * 4) + (noticeCount * 1);
    const overallScore = Math.max(15, Math.min(100, 100 - penalty));

    const auditData = {
      id: 'single-page',
      overallScore,
      pagesCrawled: 1,
      criticalCount,
      warningCount,
      noticeCount,
      startedAt: new Date(),
      completedAt: new Date(),
      status: 'completed',
      url,
      auditType: 'single_page',
    };

    res.json({
      ...auditResult,
      audit: auditData,
      findings: auditResult.findings || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/audit/site
router.post('/audit/site', authenticate, async (req, res, next) => {
  try {
    const { url = config.appUrl, maxPages = 40, maxDepth = 3 } = req.body;
    const auditId = await seoCrawlerService.runSiteAudit(url, { maxPages, maxDepth });
    res.json({
      success: true,
      auditId,
      message: `Audit initiated for ${url}. Crawling up to ${maxPages} pages with depth ${maxDepth}.`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/audit/history
router.get('/audit/history', authenticate, async (_req, res, next) => {
  try {
    const audits = await db.query.seoAudits.findMany({
      orderBy: [desc(schema.seoAudits.startedAt)],
      limit: 20,
    });
    res.json(audits);
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/audit/:id
router.get('/audit/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const audit = await db.query.seoAudits.findFirst({
      where: eq(schema.seoAudits.id, id),
    });

    if (!audit) return res.status(404).json({ error: 'Audit run not found.' });

    const findings = await db.query.seoAuditFindings.findMany({
      where: eq(schema.seoAuditFindings.auditId, id),
      orderBy: [desc(schema.seoAuditFindings.severity)],
    });

    const issuesCount = audit.issuesCount as any || {};
    const criticalCount = issuesCount.critical ?? findings.filter((f) => f.severity === 'critical').length;
    const warningCount = issuesCount.warning ?? findings.filter((f) => f.severity === 'warning').length;
    const noticeCount = issuesCount.notice ?? findings.filter((f) => f.severity === 'notice').length;

    const auditData = {
      id: audit.id,
      overallScore: audit.score,
      pagesCrawled: audit.pagesCrawled,
      criticalCount,
      warningCount,
      noticeCount,
      startedAt: audit.startedAt,
      completedAt: audit.completedAt,
      status: audit.status,
      url: audit.url,
      auditType: audit.auditType,
    };

    res.json({ ...audit, audit: auditData, findings });
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/audit/:id/export
router.get(['/audit/:id/export', '/audit/:id/export.csv'], authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || (req.path.endsWith('.csv') ? 'csv' : 'csv');

    if (format === 'csv') {
      const csv = await seoCrawlerService.exportAuditToCsv(id);
      res.header('Content-Type', 'text/csv');
      res.attachment(`seo-audit-${id}.csv`);
      return res.send(csv);
    }

    const audit = await db.query.seoAudits.findFirst({ where: eq(schema.seoAudits.id, id) });
    const findings = await db.query.seoAuditFindings.findMany({ where: eq(schema.seoAuditFindings.auditId, id) });
    res.json({ ...audit, findings });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. TOOL 2: KEYWORD & SEARCH INTENT ANALYZER
// ==========================================

// POST /api/seo/keywords/analyze
router.post('/keywords/analyze', authenticate, async (req, res, next) => {
  try {
    const { keyword, articleId } = req.body;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required.' });

    const result = await keywordIntelligenceService.analyzeKeyword(keyword, articleId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/keywords/history
router.get('/keywords/history', authenticate, async (_req, res, next) => {
  try {
    const history = await keywordIntelligenceService.getRecentResearch();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. TOOL 3: ON-PAGE SEO OPTIMIZER
// ==========================================

// POST /api/seo/on-page/analyze
router.post('/on-page/analyze', authenticate, async (req, res, next) => {
  try {
    const { articleId, title, slug, excerpt, contentHtml, content, metaTitle, metaDescription, targetKeyword } = req.body;
    const bodyContent = contentHtml || content;
    if (!title && !bodyContent && !articleId) {
      return res.status(400).json({ error: 'Article ID or content is required.' });
    }

    // If articleId provided without content, fetch from database
    let articleData = { title, slug, excerpt, contentHtml: bodyContent, metaTitle, metaDescription };
    if (articleId && !bodyContent) {
      const art = await db.query.articles.findFirst({ where: eq(schema.articles.id, articleId) });
      if (art) {
        articleData = {
          title: art.title,
          slug: art.slug,
          excerpt: art.excerpt,
          contentHtml: art.contentHtml,
          metaTitle: art.metaTitle || art.title,
          metaDescription: art.metaDescription || art.excerpt,
        };
      }
    }

    const result = await onPageOptimizerService.analyzeArticle({
      articleId,
      ...articleData,
      targetKeyword,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/on-page/apply-fix
router.post('/on-page/apply-fix', authenticate, async (req, res, next) => {
  try {
    const { articleId, fixes } = req.body;
    if (!articleId || !fixes) return res.status(400).json({ error: 'articleId and fixes are required.' });

    const updated = await onPageOptimizerService.applyFixesToArticle(articleId, fixes);
    res.json({ success: true, article: updated });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. TOOL 4: AEO / GEO READINESS ANALYZER
// ==========================================

// POST /api/seo/aeo/analyze
router.post('/aeo/analyze', authenticate, async (req, res, next) => {
  try {
    const { articleId, title, contentHtml, content, excerpt, authorName } = req.body;
    let evalTitle = title;
    let evalContent = contentHtml || content;
    let evalExcerpt = excerpt;

    if (articleId && !evalContent) {
      const art = await db.query.articles.findFirst({ where: eq(schema.articles.id, articleId) });
      if (art) {
        evalTitle = art.title;
        evalContent = art.contentHtml;
        evalExcerpt = art.excerpt;
      }
    }

    const report = await aeoGeoAnalyzerService.analyzeArticle({
      articleId,
      title: evalTitle || 'Untitled Publication',
      contentHtml: evalContent || '',
      excerpt: evalExcerpt,
      authorName,
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. TOOL 5: INTERNAL LINKING INTELLIGENCE
// ==========================================

// GET /api/seo/internal-links/graph & /api/seo/internal-links/overview
router.get(['/internal-links/graph', '/internal-links/overview'], authenticate, async (_req, res, next) => {
  try {
    const graph = await internalLinkingService.getSiteLinkGraphOverview();
    res.json(graph);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/internal-links & /api/seo/internal-links/analyze
router.post(['/internal-links', '/internal-links/analyze'], authenticate, async (req, res, next) => {
  try {
    const { articleId, contentHtml, content } = req.body;
    const bodyHtml = contentHtml || content || '';
    if (!articleId) {
      const allArticles = await db.query.articles.findMany({
        where: eq(schema.articles.status, 'published'),
        columns: { id: true, title: true, slug: true, tags: true },
      });
      const recommendations: any[] = [];
      const $ = cheerio.load(bodyHtml);
      const bodyText = $('body').text() || bodyHtml;
      for (const target of allArticles) {
        const titleKeywords = target.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length > 3);
        for (const phrase of titleKeywords) {
          const regex = new RegExp(`\\b(${phrase})\\b`, 'i');
          const match = bodyText.match(regex);
          if (match && match.index !== undefined) {
            const start = Math.max(0, match.index - 40);
            const end = Math.min(bodyText.length, match.index + phrase.length + 40);
            recommendations.push({
              targetArticleId: target.id,
              targetTitle: target.title,
              targetSlug: target.slug,
              recommendedAnchorText: match[0],
              contextSnippet: `...${bodyText.substring(start, end).trim()}...`,
              relevanceScore: 80,
              alreadyLinked: false,
            });
            break;
          }
        }
      }
      return res.json({
        articleId: '',
        articleTitle: 'Draft',
        outboundLinksCount: 0,
        inboundLinksCount: 0,
        isOrphanPage: false,
        isUnderlinked: false,
        isPillarPageCandidate: false,
        repetitiveLinks: [],
        recommendations,
      });
    }

    const report = await internalLinkingService.analyzeArticle(articleId, bodyHtml);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/internal-links/apply & /api/seo/internal-links/apply-link
router.post(['/internal-links/apply', '/internal-links/apply-link'], authenticate, async (req, res, next) => {
  try {
    const { articleId, anchorText, targetSlug } = req.body;
    if (!articleId || !anchorText || !targetSlug) {
      return res.status(400).json({ error: 'articleId, anchorText, and targetSlug are required.' });
    }

    const updatedHtml = await internalLinkingService.applyInternalLink(articleId, anchorText, targetSlug);
    res.json({ success: true, updatedHtml });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 8. TOOL 6: SCHEMA & STRUCTURED DATA VALIDATOR
// ==========================================

// POST /api/seo/schema/generate
router.post('/schema/generate', authenticate, async (req, res, next) => {
  try {
    const { articleId, authorName, categoryName } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required.' });

    const article = await db.query.articles.findFirst({ where: eq(schema.articles.id, articleId) });
    if (!article) return res.status(404).json({ error: 'Article not found.' });

    const jsonLd = schemaValidatorService.generateArticleSchema(article, categoryName, authorName);
    const validation = schemaValidatorService.validateSchema(jsonLd, {
      title: article.title,
      author: authorName,
      publishedAt: article.publishedAt || undefined,
    });

    res.json({ jsonLd, validation });
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/schema/validate
router.post('/schema/validate', authenticate, async (req, res, next) => {
  try {
    const { jsonLd, jsonLdString, visibleTitle, visibleAuthor } = req.body;
    const targetJsonLd = jsonLd || jsonLdString;
    if (!targetJsonLd) return res.status(400).json({ error: 'jsonLd or jsonLdString is required.' });

    const result = schemaValidatorService.validateSchema(targetJsonLd, {
      title: visibleTitle,
      author: visibleAuthor,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 9. TOOL 7: INDEXING & SITEMAP MANAGER
// ==========================================

// GET /api/seo/indexing/status
router.get('/indexing/status', authenticate, async (_req, res, next) => {
  try {
    const key = await indexingSitemapService.getOrCreateIndexNowKey();
    const logs = await indexingSitemapService.getRecentLogs(25);
    res.json({
      indexNowKey: key,
      keyLocationUrl: `${config.appUrl.replace(/\/$/, '')}/${key}.txt`,
      supportedEngines: ['Bing', 'Yandex', 'Naver', 'Seznam'],
      recentLogs: logs,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/indexing/submit & /api/seo/indexing/indexnow/submit
router.post(['/indexing/submit', '/indexing/indexnow/submit'], authenticate, async (req, res, next) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'urls array is required.' });
    }

    const result = await indexingSitemapService.submitToIndexNow(urls);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/seo/indexing/sitemap-health & /api/seo/indexing/sitemap/validate
router.get(['/indexing/sitemap-health', '/indexing/sitemap/validate'], authenticate, async (_req, res, next) => {
  try {
    const health = await indexingSitemapService.validateSitemapHealth();
    res.json(health);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 10. TOOL 8: RANKING OPPORTUNITIES & DECAY
// ==========================================

// GET /api/seo/opportunities & /api/seo/opportunities/decay-and-rankings
router.get(['/opportunities', '/opportunities/decay-and-rankings'], authenticate, async (_req, res, next) => {
  try {
    const report = await contentDecayDetectorService.detectDecayAndOpportunities();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 11. TOOL 9: DUPLICATE CONTENT & CANNIBALIZATION
// ==========================================

// GET /api/seo/duplicates/scan & /api/seo/duplicate-content/scan
router.get(['/duplicates/scan', '/duplicate-content/scan'], authenticate, async (_req, res, next) => {
  try {
    const report = await duplicateContentService.scanForDuplicates();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 12. TOOL 10: CONTENT QUALITY & VERIFICATION
// ==========================================

// POST /api/seo/content-quality/verify
router.post('/content-quality/verify', authenticate, async (req, res, next) => {
  try {
    const { articleId, title, contentHtml, content } = req.body;
    let evalTitle = title;
    let evalContent = contentHtml || content;

    if (articleId && !evalContent) {
      const art = await db.query.articles.findFirst({ where: eq(schema.articles.id, articleId) });
      if (art) {
        evalTitle = art.title;
        evalContent = art.contentHtml;
      }
    }

    const report = await contentQualityService.verifyArticleContent({
      articleId,
      title: evalTitle || 'Untitled Publication',
      contentHtml: evalContent || '',
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 13. TOOL 11: SERP PREVIEW & CTR OPTIMIZER
// ==========================================

// GET /api/seo/serp/preview/:articleId & /api/seo/serp/preview?articleId=...
router.get(['/serp/preview/:articleId', '/serp/preview'], authenticate, async (req, res, next) => {
  try {
    const articleId = (req.params.articleId || req.query.articleId) as string;
    if (!articleId) return res.status(400).json({ error: 'articleId is required.' });
    const previewData = await serpPreviewService.getPreviewAndVariants(articleId);
    res.json(previewData);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/serp/apply-variant
router.post('/serp/apply-variant', authenticate, async (req, res, next) => {
  try {
    const { articleId, metaTitle, metaDescription } = req.body;
    if (!articleId || !metaTitle) {
      return res.status(400).json({ error: 'articleId and metaTitle are required.' });
    }

    const updated = await serpPreviewService.applyVariant(articleId, metaTitle, metaDescription || '');
    res.json({ success: true, article: updated });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 14. TOOL 12: TOPICAL AUTHORITY & CONTENT GAPS
// ==========================================

// GET /api/seo/topical-authority
router.get('/topical-authority', authenticate, async (req, res, next) => {
  try {
    const categoryId = req.query.categoryId as string;
    const report = await topicalAuthorityService.analyzeTopicalAuthority(categoryId);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 15. TOOL 13: CONTENT FRESHNESS SCHEDULER
// ==========================================

// GET /api/seo/freshness/queue
router.get('/freshness/queue', authenticate, async (req, res, next) => {
  try {
    const thresholdDays = req.query.olderThanDays
      ? parseInt(req.query.olderThanDays as string, 10)
      : (req.query.days ? parseInt(req.query.days as string, 10) : 90);
    const queue = await contentFreshnessService.getFreshnessReviewQueue(thresholdDays);
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/freshness/mark-refreshed
router.post('/freshness/mark-refreshed', authenticate, async (req, res, next) => {
  try {
    const { articleId, changeSummary } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required.' });

    const updated = await contentFreshnessService.approveAndMarkRefreshed(articleId, changeSummary);
    res.json({ success: true, article: updated });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 16. TOOL 14: CRAWLABILITY INSPECTOR
// ==========================================

// POST /api/seo/crawlability/inspect
router.post('/crawlability/inspect', authenticate, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required.' });

    const inspection = await crawlabilityInspectorService.inspectUrl(url);
    res.json(inspection);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 17. TOOL 15: AI SEARCH CITATION TRACKER
// ==========================================

// GET /api/seo/ai-search/trackers
router.get('/ai-search/trackers', authenticate, async (_req, res, next) => {
  try {
    const trackers = await aiSearchTrackerService.getTrackers();
    res.json(trackers);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/ai-search/trackers
router.post('/ai-search/trackers', authenticate, async (req, res, next) => {
  try {
    const { promptQuery, category } = req.body;
    if (!promptQuery) return res.status(400).json({ error: 'promptQuery is required.' });

    const created = await aiSearchTrackerService.createTracker(promptQuery, category);
    res.json(created);
  } catch (err) {
    next(err);
  }
});

// POST /api/seo/ai-search/evaluate
router.post('/ai-search/evaluate', authenticate, async (req, res, next) => {
  try {
    const { promptQuery, trackerId } = req.body;
    if (!promptQuery) return res.status(400).json({ error: 'promptQuery is required.' });

    const snapshot = await aiSearchTrackerService.evaluateSearchPrompt(promptQuery, trackerId);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 18. PUBLICATION GATE & PRE-FLIGHT VERIFIER
// ==========================================

// POST /api/seo/publication-gate/evaluate
router.post('/publication-gate/evaluate', authenticate, async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      contentHtml: req.body.contentHtml || req.body.content || '',
    };
    const evaluation = await publicationGateService.evaluateArticleBeforePublication(payload);
    res.json(evaluation);
  } catch (err) {
    next(err);
  }
});

export default router;
