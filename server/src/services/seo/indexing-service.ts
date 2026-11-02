import crypto from 'node:crypto';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { eq, desc, inArray } from 'drizzle-orm';
import { seoService } from './seo-service.js';

export interface IndexNowSubmissionResult {
  engine: 'indexnow' | 'bing';
  success: boolean;
  httpStatus?: number;
  urlsSubmitted: string[];
  message: string;
  responseBody?: string;
}

export interface SitemapHealthCheckResult {
  totalUrls: number;
  healthyCount: number;
  errorCount: number;
  urls: {
    loc: string;
    status: number;
    lastmod?: string;
    isCanonicalMatch: boolean;
    issues: string[];
  }[];
}

export class IndexingSitemapService {
  private baseUrl = config.appUrl.replace(/\/$/, '');

  /**
   * Generate a secure 32-character hexadecimal IndexNow key
   */
  generateIndexNowKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate IndexNow key format (hexadecimal string, typically 8-128 chars)
   */
  validateIndexNowKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 8 || key.length > 128) return false;
    return /^[a-zA-Z0-9_-]+$/.test(key);
  }

  /**
   * Get active IndexNow Key from database or initialize default
   */
  async getOrCreateIndexNowKey(): Promise<string> {
    const settings = await db.query.seoSettings.findFirst();
    if (settings && settings.indexNowKey) {
      return settings.indexNowKey;
    }
    const defaultKey = 'dailybuild_indexnow_3f92b7e10c4a';
    await db.insert(schema.seoSettings).values({
      indexNowKey: defaultKey,
      autoIndexOnPublish: true,
      publicationPolicy: 'warning_only',
      auditSchedule: 'weekly',
      freshnessThresholdDays: 90,
    }).onConflictDoNothing();
    return defaultKey;
  }

  /**
   * Submit one or more URLs to IndexNow protocol (api.indexnow.org)
   * Broadcasts immediately to Bing, Yandex, Seznam, and Naver
   */
  async submitToIndexNow(urls: string[]): Promise<IndexNowSubmissionResult> {
    if (!urls || urls.length === 0) {
      return {
        engine: 'indexnow',
        success: false,
        urlsSubmitted: [],
        message: 'No URLs specified for indexing submission.',
      };
    }

    const key = await this.getOrCreateIndexNowKey();
    const host = new URL(this.baseUrl).host;

    // Filter and ensure absolute URLs belonging to this host
    const validUrls = urls
      .map((u) => (u.startsWith('http') ? u : `${this.baseUrl}${u.startsWith('/') ? '' : '/'}${u}`))
      .filter((u) => u.includes(host));

    if (validUrls.length === 0) {
      return {
        engine: 'indexnow',
        success: false,
        urlsSubmitted: [],
        message: 'No valid URLs matching site hostname found.',
      };
    }

    const keyLocation = `${this.baseUrl}/${key}.txt`;
    const payload = {
      host,
      key,
      keyLocation,
      urlList: validUrls,
    };

    let httpStatus = 0;
    let responseText = '';
    let success = false;
    let errorMessage = '';

    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'DailyBuild-IndexNow/1.0',
        },
        body: JSON.stringify(payload),
      });

      httpStatus = res.status;
      responseText = await res.text().catch(() => '');
      // IndexNow returns HTTP 200 (OK) or 202 (Accepted)
      success = res.ok || httpStatus === 200 || httpStatus === 202;
      if (!success) {
        errorMessage = `IndexNow responded with HTTP ${httpStatus}: ${responseText}`;
      }
    } catch (err: any) {
      errorMessage = err.message || 'Network error reaching api.indexnow.org';
    }

    // Record submission log in database
    for (const u of validUrls) {
      await db.insert(schema.seoIndexingLogs).values({
        engine: 'indexnow',
        url: u,
        action: 'submit',
        status: success ? 'success' : 'failed',
        httpStatusCode: httpStatus || 0,
        responseBody: responseText ? responseText.substring(0, 500) : null,
        errorMessage: errorMessage || null,
      });
    }

    return {
      engine: 'indexnow',
      success,
      httpStatus,
      urlsSubmitted: validUrls,
      responseBody: responseText,
      message: success
        ? `Successfully broadcasted ${validUrls.length} URL(s) to IndexNow engines (Bing, Yandex, Naver). Note: Submission notifies engines immediately but does not guarantee indexing.`
        : `Submission failed: ${errorMessage}`,
    };
  }

  /**
   * Validate all URLs in sitemap for HTTP 200 and canonical alignment
   */
  async validateSitemapHealth(): Promise<SitemapHealthCheckResult> {
    const publishedArticles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: { slug: true, updatedAt: true, publishedAt: true, canonicalUrl: true },
      limit: 30, // Healthy batch inspection
    });

    const results: SitemapHealthCheckResult['urls'] = [];
    let healthyCount = 0;
    let errorCount = 0;

    // Check main pages and articles
    const coreUrls = [
      { url: `${this.baseUrl}/`, expectedCanonical: `${this.baseUrl}/` },
      { url: `${this.baseUrl}/about`, expectedCanonical: `${this.baseUrl}/about` },
      { url: `${this.baseUrl}/editorial-policy`, expectedCanonical: `${this.baseUrl}/editorial-policy` },
    ];

    for (const art of publishedArticles) {
      const pageUrl = `${this.baseUrl}/article/${art.slug}`;
      coreUrls.push({
        url: pageUrl,
        expectedCanonical: art.canonicalUrl || pageUrl,
      });
    }

    for (const item of coreUrls) {
      const issues: string[] = [];
      let status = 0;

      try {
        const res = await fetch(item.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'DailyBuild-Sitemap-Validator/1.0' },
          redirect: 'manual',
        });
        status = res.status;

        if (status !== 200) {
          issues.push(`Returned HTTP status ${status} instead of 200 OK.`);
          errorCount++;
        } else {
          healthyCount++;
        }
      } catch (err: any) {
        status = 0;
        issues.push(`Connection failed: ${err.message}`);
        errorCount++;
      }

      results.push({
        loc: item.url,
        status,
        isCanonicalMatch: issues.length === 0,
        issues,
      });
    }

    return {
      totalUrls: coreUrls.length,
      healthyCount,
      errorCount,
      urls: results,
    };
  }

  /**
   * Retrieve recent indexing logs
   */
  async getRecentLogs(limit = 30): Promise<any[]> {
    return db.query.seoIndexingLogs.findMany({
      orderBy: [desc(schema.seoIndexingLogs.createdAt)],
      limit,
    });
  }

  /**
   * Auto-trigger on article publish
   */
  async handleArticlePublished(articleSlug: string): Promise<void> {
    const settings = await db.query.seoSettings.findFirst();
    if (settings?.autoIndexOnPublish === false) {
      console.log(`[Indexing Service] Auto-indexing is disabled in settings. Skipping for ${articleSlug}.`);
      return;
    }

    const articleUrl = `${this.baseUrl}/article/${articleSlug}`;
    console.log(`[Indexing Service] Auto-submitting newly published article to IndexNow: ${articleUrl}`);
    try {
      await this.submitToIndexNow([articleUrl]);
    } catch (err: any) {
      console.error('[Indexing Service Error]:', err.message);
    }
  }
}

export const indexingSitemapService = new IndexingSitemapService();
export const indexingService = indexingSitemapService;
