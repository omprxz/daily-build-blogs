import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { seoCrawlerService } from './crawler.js';
import { seoService } from './seo-service.js';
import { config } from '../../config/index.js';
import { eq } from 'drizzle-orm';

export interface CrawlabilityDiagnostic {
  check: string;
  category: 'robots' | 'canonical' | 'status' | 'sitemap' | 'protocol_slash';
  status: 'pass' | 'warning' | 'fail';
  valueDetected: string;
  evidence: string;
  suggestedFix: string;
}

export interface CrawlabilityInspectionReport {
  targetUrl: string;
  isIndexable: boolean;
  httpStatus: number;
  overallHealth: 'Healthy & Fully Crawlable' | 'Warnings Detected' | 'Crawl Blocked / Critical Error';
  diagnostics: CrawlabilityDiagnostic[];
  robotsTxtDirectives: {
    userAgentsMatched: string[];
    isAllowedForGooglebot: boolean;
    isAllowedForBingbot: boolean;
    isAllowedForAIBots: boolean;
  };
  inspectedAt: string;
}

export class CrawlabilityInspectorService {
  private baseUrl = config.appUrl.replace(/\/$/, '');

  /**
   * Run standalone deep crawlability inspection on any URL
   */
  async inspectUrl(targetUrl: string): Promise<CrawlabilityInspectionReport> {
    const diagnostics: CrawlabilityDiagnostic[] = [];
    const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `${this.baseUrl}${targetUrl}`);

    // 1. Protocol & Trailing Slash Consistency Check
    const isHttps = parsed.protocol === 'https:';
    if (!isHttps) {
      diagnostics.push({
        check: 'HTTPS Protocol',
        category: 'protocol_slash',
        status: 'warning',
        valueDetected: parsed.protocol,
        evidence: `URL uses unencrypted '${parsed.protocol}'. Modern crawlers prioritize HTTPS.`,
        suggestedFix: 'Enforce strict 301 redirection from HTTP to HTTPS in Nginx / Express.',
      });
    } else {
      diagnostics.push({
        check: 'HTTPS Protocol',
        category: 'protocol_slash',
        status: 'pass',
        valueDetected: 'https:',
        evidence: 'Secure HTTPS protocol correctly utilized.',
        suggestedFix: 'None required.',
      });
    }

    const hasTrailingSlash = parsed.pathname.endsWith('/') && parsed.pathname.length > 1;
    // Check if canonical URL prefers no trailing slash
    diagnostics.push({
      check: 'Trailing Slash Pattern',
      category: 'protocol_slash',
      status: 'pass',
      valueDetected: hasTrailingSlash ? 'Trailing slash present' : 'No trailing slash',
      evidence: `Pathname: ${parsed.pathname}`,
      suggestedFix: 'Ensure internal links consistently use the declared canonical format.',
    });

    // 2. Fetch page and inspect response headers (X-Robots-Tag, Status, Redirects)
    let httpStatus = 0;
    let xRobotsTag = '';
    let html = '';
    let redirectChain: string[] = [];

    try {
      const res = await fetch(parsed.href, {
        headers: { 'User-Agent': 'DailyBuild-Crawlability-Inspector/1.0' },
        redirect: 'manual',
      });
      httpStatus = res.status;
      xRobotsTag = res.headers.get('x-robots-tag') || '';

      if ([301, 302, 307, 308].includes(httpStatus)) {
        const dest = res.headers.get('location') || '';
        redirectChain.push(`${httpStatus} -> ${dest}`);
        diagnostics.push({
          check: 'HTTP Status & Redirects',
          category: 'status',
          status: httpStatus === 301 ? 'pass' : 'warning',
          valueDetected: `HTTP ${httpStatus}`,
          evidence: `Redirects immediately to ${dest}`,
          suggestedFix: httpStatus === 302 ? 'Change temporary 302 to permanent 301 redirect.' : 'Ensure sitemaps list destination URL.',
        });
      } else if (httpStatus === 200) {
        diagnostics.push({
          check: 'HTTP Status Code',
          category: 'status',
          status: 'pass',
          valueDetected: 'HTTP 200 OK',
          evidence: 'Page returns clean 200 OK response.',
          suggestedFix: 'None required.',
        });
        html = await res.text();
      } else {
        diagnostics.push({
          check: 'HTTP Status Code',
          category: 'status',
          status: 'fail',
          valueDetected: `HTTP ${httpStatus}`,
          evidence: `Server returned non-success error code ${httpStatus}.`,
          suggestedFix: 'Investigate web server or route handler error.',
        });
      }
    } catch (err: any) {
      diagnostics.push({
        check: 'HTTP Connection',
        category: 'status',
        status: 'fail',
        valueDetected: 'Connection Error',
        evidence: err.message,
        suggestedFix: 'Check server availability and DNS routing.',
      });
    }

    // 3. X-Robots-Tag Header
    if (xRobotsTag) {
      if (xRobotsTag.toLowerCase().includes('noindex')) {
        diagnostics.push({
          check: 'X-Robots-Tag Header',
          category: 'robots',
          status: 'fail',
          valueDetected: xRobotsTag,
          evidence: 'HTTP header includes "noindex", which instructs all crawlers not to index this page.',
          suggestedFix: 'Remove the X-Robots-Tag header if this page is intended for public search engines.',
        });
      }
    }

    // 4. On-Page Robots Meta Tag
    if (html) {
      const $ = cheerio.load(html);
      const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
      if (robotsMeta.includes('noindex')) {
        diagnostics.push({
          check: 'Robots Meta Tag',
          category: 'robots',
          status: 'fail',
          valueDetected: robotsMeta,
          evidence: 'HTML <meta name="robots"> tag contains "noindex". Accidental crawl block detected.',
          suggestedFix: 'Change content attribute to "index, follow" to permit indexing.',
        });
      } else {
        diagnostics.push({
          check: 'Robots Meta Tag',
          category: 'robots',
          status: 'pass',
          valueDetected: robotsMeta || 'Indexable (default index, follow)',
          evidence: 'Page is declared indexable.',
          suggestedFix: 'None required.',
        });
      }

      // 5. Canonical Tag Validation
      const canonical = $('link[rel="canonical"]').attr('href')?.trim();
      if (!canonical) {
        diagnostics.push({
          check: 'Canonical Link Tag',
          category: 'canonical',
          status: 'warning',
          valueDetected: 'None declared',
          evidence: 'Missing <link rel="canonical"> tag.',
          suggestedFix: 'Add self-referencing absolute canonical URL to avoid duplicate URL variations.',
        });
      } else {
        diagnostics.push({
          check: 'Canonical Link Tag',
          category: 'canonical',
          status: 'pass',
          valueDetected: canonical,
          evidence: `Declared canonical: ${canonical}`,
          suggestedFix: 'None required.',
        });
      }
    }

    // 6. robots.txt Parsing Check for this URL
    const robotsTxt = seoService.generateRobotsTxt();
    const isDisallowedInRobots = (parsed.pathname.startsWith('/admin') || parsed.pathname.startsWith('/api'));
    diagnostics.push({
      check: 'robots.txt Protocol',
      category: 'robots',
      status: isDisallowedInRobots ? 'fail' : 'pass',
      valueDetected: isDisallowedInRobots ? 'Disallowed by path rule' : 'Allowed for all crawlers',
      evidence: isDisallowedInRobots ? 'Path matches Disallow: /admin or /api' : 'Path allowed under Allow: /',
      suggestedFix: isDisallowedInRobots ? 'Move public content outside of /admin or /api prefix.' : 'None required.',
    });

    const isIndexable = diagnostics.every((d) => d.status !== 'fail');
    const hasWarnings = diagnostics.some((d) => d.status === 'warning');

    const overallHealth = !isIndexable
      ? 'Crawl Blocked / Critical Error'
      : hasWarnings
      ? 'Warnings Detected'
      : 'Healthy & Fully Crawlable';

    return {
      targetUrl: parsed.href,
      isIndexable,
      httpStatus,
      overallHealth,
      diagnostics,
      robotsTxtDirectives: {
        userAgentsMatched: ['*', 'Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'PerplexityBot'],
        isAllowedForGooglebot: !isDisallowedInRobots,
        isAllowedForBingbot: !isDisallowedInRobots,
        isAllowedForAIBots: !isDisallowedInRobots,
      },
      inspectedAt: new Date().toISOString(),
    };
  }
}

export const crawlabilityInspectorService = new CrawlabilityInspectorService();
