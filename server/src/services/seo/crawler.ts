import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';
import { config } from '../../config/index.js';

export interface AuditFindingInput {
  url: string;
  category: 'meta' | 'headings' | 'links' | 'status' | 'canonical' | 'robots' | 'images' | 'content' | 'schema' | 'crawlability';
  severity: 'critical' | 'warning' | 'notice';
  ruleId: string;
  title: string;
  message: string;
  details?: any;
  recommendation: string;
}

export interface CrawlPageResult {
  url: string;
  status: number;
  contentType: string;
  loadTimeMs: number;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robotsMeta?: string;
  xRobotsTag?: string;
  h1Count: number;
  h1s: string[];
  h2Count: number;
  wordCount: number;
  images: { src: string; alt: string; hasAlt: boolean }[];
  internalLinks: { href: string; text: string }[];
  externalLinks: { href: string; text: string }[];
  jsonLdSchemas: any[];
  findings: AuditFindingInput[];
}

export interface AuditConfig {
  maxPages?: number;
  maxDepth?: number;
  concurrency?: number;
  timeoutMs?: number;
  respectRobots?: boolean;
  userAgent?: string;
}

export class SEOCrawlerService {
  private defaultUserAgent = 'DailyBuild-SEO-Audit/1.0 (+https://blogs.dailybuild.tech/robots.txt)';

  /**
   * SSRF Protection: Ensure target URL is safe to fetch
   */
  isSafeUrl(urlString: string): boolean {
    try {
      const parsed = new URL(urlString);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;

      const hostname = parsed.hostname.toLowerCase();
      // Block loopback, internal and metadata endpoints
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        // Allow in development if explicitly querying appUrl
        if (config.env === 'development' && (parsed.port === String(config.port) || hostname === 'localhost')) {
          return true;
        }
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Audit a single page
   */
  async auditSinglePage(targetUrl: string, auditId?: string): Promise<CrawlPageResult> {
    if (!this.isSafeUrl(targetUrl)) {
      throw new Error(`Target URL ${targetUrl} is not permitted for crawling.`);
    }

    const startTime = Date.now();
    const findings: AuditFindingInput[] = [];

    let status = 0;
    let contentType = '';
    let html = '';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': this.defaultUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'manual', // Inspect redirects directly
      });
      clearTimeout(timeout);

      status = res.status;
      contentType = res.headers.get('content-type') || '';
      const xRobotsTag = res.headers.get('x-robots-tag') || undefined;

      // Redirect handling
      if ([301, 302, 307, 308].includes(status)) {
        const location = res.headers.get('location') || '';
        findings.push({
          url: targetUrl,
          category: 'status',
          severity: status === 302 ? 'warning' : 'notice',
          ruleId: 'http-redirect',
          title: `HTTP ${status} Redirect`,
          message: `URL redirects to: ${location}`,
          details: { status, location },
          recommendation: status === 302
            ? 'Consider using a permanent 301 redirect if the relocation is permanent.'
            : 'Ensure internal links point directly to the destination URL to avoid redirect latency.',
        });

        return {
          url: targetUrl,
          status,
          contentType,
          loadTimeMs: Date.now() - startTime,
          h1Count: 0,
          h1s: [],
          h2Count: 0,
          wordCount: 0,
          images: [],
          internalLinks: [],
          externalLinks: [],
          jsonLdSchemas: [],
          findings,
        };
      }

      if (status >= 400) {
        findings.push({
          url: targetUrl,
          category: 'status',
          severity: 'critical',
          ruleId: 'http-error',
          title: `HTTP ${status} Client/Server Error`,
          message: `The server responded with an error status code ${status}.`,
          details: { status },
          recommendation: 'Fix or restore the broken page, or return an intentional 410 Gone / 301 Redirect.',
        });

        return {
          url: targetUrl,
          status,
          contentType,
          loadTimeMs: Date.now() - startTime,
          h1Count: 0,
          h1s: [],
          h2Count: 0,
          wordCount: 0,
          images: [],
          internalLinks: [],
          externalLinks: [],
          jsonLdSchemas: [],
          findings,
        };
      }

      html = await res.text();
    } catch (fetchErr: any) {
      findings.push({
        url: targetUrl,
        category: 'crawlability',
        severity: 'critical',
        ruleId: 'network-fetch-failed',
        title: 'Connection Failed / Timeout',
        message: fetchErr.message || 'Unable to connect to target URL.',
        recommendation: 'Check website server status, DNS resolution, and firewall settings.',
      });

      return {
        url: targetUrl,
        status: 0,
        contentType: '',
        loadTimeMs: Date.now() - startTime,
        h1Count: 0,
        h1s: [],
        h2Count: 0,
        wordCount: 0,
        images: [],
        internalLinks: [],
        externalLinks: [],
        jsonLdSchemas: [],
        findings,
      };
    }

    const loadTimeMs = Date.now() - startTime;
    const $ = cheerio.load(html);

    // 1. Meta Title
    const title = $('title').first().text().trim() || undefined;
    if (!title) {
      findings.push({
        url: targetUrl,
        category: 'meta',
        severity: 'critical',
        ruleId: 'missing-title-tag',
        title: 'Missing <title> Tag',
        message: 'The page has no title tag in the <head> section.',
        recommendation: 'Add a concise, compelling title tag between 30 and 60 characters.',
      });
    } else {
      if (title.length < 20) {
        findings.push({
          url: targetUrl,
          category: 'meta',
          severity: 'warning',
          ruleId: 'title-too-short',
          title: 'Title Tag Too Short',
          message: `Title is only ${title.length} characters: "${title}".`,
          details: { length: title.length, title },
          recommendation: 'Expand title with primary keywords and brand context (ideal 30-60 characters).',
        });
      } else if (title.length > 65) {
        findings.push({
          url: targetUrl,
          category: 'meta',
          severity: 'warning',
          ruleId: 'title-too-long',
          title: 'Title Tag Likely Truncated',
          message: `Title is ${title.length} characters and will likely be truncated on Google SERPs.`,
          details: { length: title.length, title },
          recommendation: 'Keep primary keyword near the beginning and trim under 60 characters.',
        });
      }
    }

    // 2. Meta Description
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || undefined;
    if (!metaDescription) {
      findings.push({
        url: targetUrl,
        category: 'meta',
        severity: 'critical',
        ruleId: 'missing-meta-description',
        title: 'Missing Meta Description',
        message: 'Page does not declare a meta description tag.',
        recommendation: 'Provide an actionable summary between 70 and 160 characters describing page content.',
      });
    } else {
      if (metaDescription.length < 50) {
        findings.push({
          url: targetUrl,
          category: 'meta',
          severity: 'warning',
          ruleId: 'meta-description-too-short',
          title: 'Meta Description Too Short',
          message: `Meta description is only ${metaDescription.length} characters.`,
          details: { length: metaDescription.length },
          recommendation: 'Expand description to 120-160 characters to capture user search intent.',
        });
      } else if (metaDescription.length > 165) {
        findings.push({
          url: targetUrl,
          category: 'meta',
          severity: 'notice',
          ruleId: 'meta-description-too-long',
          title: 'Meta Description Exceeds SERP Limit',
          message: `Meta description is ${metaDescription.length} characters; snippet may be clipped.`,
          details: { length: metaDescription.length },
          recommendation: 'Trim meta description so it remains concise under 160 characters.',
        });
      }
    }

    // 3. Headings (H1, H2)
    const h1Elements = $('h1');
    const h1Count = h1Elements.length;
    const h1s: string[] = [];
    h1Elements.each((_, el) => {
      const text = $(el).text().trim();
      if (text) h1s.push(text);
    });

    if (h1Count === 0) {
      findings.push({
        url: targetUrl,
        category: 'headings',
        severity: 'critical',
        ruleId: 'missing-h1',
        title: 'Missing <h1> Heading',
        message: 'The page contains no <h1> heading tag.',
        recommendation: 'Add exactly one descriptive <h1> heading communicating the core topic.',
      });
    } else if (h1Count > 1) {
      findings.push({
        url: targetUrl,
        category: 'headings',
        severity: 'warning',
        ruleId: 'multiple-h1',
        title: `Multiple <h1> Headings Found (${h1Count})`,
        message: `Found ${h1Count} <h1> headings on the page.`,
        details: { h1s },
        recommendation: 'Use a single <h1> heading for the main article title; use <h2> and <h3> for sub-sections.',
      });
    }

    const h2Count = $('h2').length;
    if (h2Count === 0 && h1Count > 0) {
      findings.push({
        url: targetUrl,
        category: 'headings',
        severity: 'notice',
        ruleId: 'no-h2-headings',
        title: 'No <h2> Sub-Headings',
        message: 'The content has no <h2> headings to structure sections.',
        recommendation: 'Break content into logical sections with descriptive <h2> headers.',
      });
    }

    // 4. Canonical URL
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || undefined;
    if (!canonical) {
      findings.push({
        url: targetUrl,
        category: 'canonical',
        severity: 'warning',
        ruleId: 'missing-canonical',
        title: 'Missing Canonical Tag',
        message: 'Page does not declare a <link rel="canonical"> tag.',
        recommendation: 'Add a self-referencing canonical URL to prevent duplicate content indexing issues.',
      });
    } else {
      try {
        const canonicalUrl = new URL(canonical, targetUrl).href;
        if (!canonical.startsWith('http')) {
          findings.push({
            url: targetUrl,
            category: 'canonical',
            severity: 'warning',
            ruleId: 'relative-canonical',
            title: 'Relative Canonical URL',
            message: `Canonical tag specifies relative path '${canonical}'.`,
            recommendation: 'Use absolute canonical URLs including protocol and domain name.',
          });
        }
      } catch {
        findings.push({
          url: targetUrl,
          category: 'canonical',
          severity: 'critical',
          ruleId: 'invalid-canonical-url',
          title: 'Invalid Canonical URL Syntax',
          message: `The canonical URL '${canonical}' is not a valid URI.`,
          recommendation: 'Correct the canonical tag to be a well-formed absolute URL.',
        });
      }
    }

    // 5. Robots Directives
    const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || undefined;
    if (robotsMeta && (robotsMeta.includes('noindex') || robotsMeta.includes('none'))) {
      findings.push({
        url: targetUrl,
        category: 'robots',
        severity: 'warning',
        ruleId: 'accidental-noindex',
        title: 'Page Marked as "noindex"',
        message: `Robots meta tag contains "${robotsMeta}". Search engines will not index this page.`,
        details: { robotsMeta },
        recommendation: 'Verify whether this page is intended to be excluded from public search results.',
      });
    }

    // 6. Word Count & Thin Content
    // Strip scripts, styles, navigations
    $('script, style, noscript, nav, footer, header').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    if (wordCount < 150) {
      findings.push({
        url: targetUrl,
        category: 'content',
        severity: 'critical',
        ruleId: 'thin-content-severe',
        title: 'Severe Thin Content (< 150 words)',
        message: `Extracted only ${wordCount} words from the main content body.`,
        details: { wordCount },
        recommendation: 'Expand content with authoritative, informative text to satisfy search intent.',
      });
    } else if (wordCount < 350) {
      findings.push({
        url: targetUrl,
        category: 'content',
        severity: 'warning',
        ruleId: 'thin-content-moderate',
        title: 'Low Word Count (< 350 words)',
        message: `Extracted ${wordCount} words. May struggle to rank against comprehensive competitor guides.`,
        details: { wordCount },
        recommendation: 'Add deeper technical explanations, examples, or FAQs.',
      });
    }

    // 7. Images & Alt Attributes
    const images: { src: string; alt: string; hasAlt: boolean }[] = [];
    let missingAltCount = 0;

    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt');
      const hasAlt = typeof alt === 'string' && alt.trim().length > 0;
      if (!hasAlt) missingAltCount++;
      images.push({ src, alt: alt || '', hasAlt });
    });

    if (missingAltCount > 0) {
      findings.push({
        url: targetUrl,
        category: 'images',
        severity: missingAltCount > 3 ? 'critical' : 'warning',
        ruleId: 'missing-image-alt',
        title: `${missingAltCount} Image(s) Missing Alt Text`,
        message: `${missingAltCount} out of ${images.length} images on the page lack descriptive alt attributes.`,
        details: { totalImages: images.length, missingAltCount },
        recommendation: 'Add descriptive alt text to all editorial images for accessibility and image search indexing.',
      });
    }

    // 8. Links (Internal & External)
    const internalLinks: { href: string; text: string }[] = [];
    const externalLinks: { href: string; text: string }[] = [];

    const parsedTarget = new URL(targetUrl);

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim() || '';
      const linkText = $(el).text().trim();
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

      try {
        const fullUrl = new URL(rawHref, targetUrl);
        if (fullUrl.hostname === parsedTarget.hostname) {
          internalLinks.push({ href: fullUrl.href, text: linkText });
        } else {
          externalLinks.push({ href: fullUrl.href, text: linkText });
        }
      } catch {
        // malformed link
      }
    });

    if (internalLinks.length === 0) {
      findings.push({
        url: targetUrl,
        category: 'links',
        severity: 'warning',
        ruleId: 'no-internal-links',
        title: 'Zero Outbound Internal Links',
        message: 'This page does not link to any other internal pages on your website.',
        recommendation: 'Add 2-5 contextual links pointing to related topics or categories to facilitate crawl paths.',
      });
    }

    // 9. Structured Data (JSON-LD)
    const jsonLdSchemas: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const rawJson = $(el).html()?.trim();
      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          jsonLdSchemas.push(parsed);
        } catch (jsonErr: any) {
          findings.push({
            url: targetUrl,
            category: 'schema',
            severity: 'critical',
            ruleId: 'invalid-json-ld-syntax',
            title: 'Corrupted JSON-LD Schema Syntax',
            message: `JSON-LD structured data block has parse error: ${jsonErr.message}`,
            recommendation: 'Correct syntax formatting and validate with Schema Validator.',
          });
        }
      }
    });

    if (jsonLdSchemas.length === 0) {
      findings.push({
        url: targetUrl,
        category: 'schema',
        severity: 'warning',
        ruleId: 'no-structured-data',
        title: 'No JSON-LD Structured Data Detected',
        message: 'The page lacks Schema.org JSON-LD markup.',
        recommendation: 'Add Article, NewsArticle, or WebPage schema markup to enhance search appearance.',
      });
    }

    // 10. Performance / Response Latency notice
    if (loadTimeMs > 2500) {
      findings.push({
        url: targetUrl,
        category: 'crawlability',
        severity: 'warning',
        ruleId: 'slow-html-response',
        title: `Slow Server Response Time (${(loadTimeMs / 1000).toFixed(2)}s)`,
        message: `Time-to-first-byte / HTML download took ${loadTimeMs}ms, exceeding the 2.5s recommended crawl limit.`,
        details: { loadTimeMs },
        recommendation: 'Optimize server SSR rendering, database queries, and caching.',
      });
    }

    // If an auditId is provided, persist findings directly
    if (auditId && findings.length > 0) {
      for (const f of findings) {
        await db.insert(schema.seoAuditFindings).values({
          auditId,
          url: f.url,
          category: f.category,
          severity: f.severity,
          ruleId: f.ruleId,
          title: f.title,
          message: f.message,
          detailsJson: f.details || {},
          recommendation: f.recommendation,
          resolved: false,
        });
      }
    }

    return {
      url: targetUrl,
      status,
      contentType,
      loadTimeMs,
      title,
      metaDescription,
      canonical,
      robotsMeta,
      h1Count,
      h1s,
      h2Count,
      wordCount,
      images,
      internalLinks,
      externalLinks,
      jsonLdSchemas,
      findings,
    };
  }

  /**
   * Run full-site crawl audit starting from seed URL
   */
  async runSiteAudit(seedUrl: string, configOverrides: AuditConfig = {}): Promise<string> {
    const maxPages = Math.min(configOverrides.maxPages || 50, 150);
    const maxDepth = configOverrides.maxDepth || 3;
    const concurrency = Math.min(configOverrides.concurrency || 3, 5);

    // Create Audit record
    const [auditRecord] = await db.insert(schema.seoAudits).values({
      url: seedUrl,
      auditType: 'full_site',
      status: 'running',
      score: 0,
      pagesCrawled: 0,
      issuesCount: { critical: 0, warning: 0, notice: 0 },
      summaryJson: {},
      configJson: { maxPages, maxDepth, concurrency },
      startedAt: new Date(),
    }).returning();

    const auditId = auditRecord.id;

    // Run crawler asynchronously in background
    (async () => {
      try {
        const queue: { url: string; depth: number }[] = [{ url: seedUrl, depth: 0 }];
        const visited = new Set<string>();
        const seedOrigin = new URL(seedUrl).origin;

        let totalCritical = 0;
        let totalWarning = 0;
        let totalNotice = 0;
        const pageResults: { url: string; status: number; title?: string; issues: number }[] = [];

        while (queue.length > 0 && visited.size < maxPages) {
          const batch = queue.splice(0, concurrency);
          const promises = batch.map(async (item) => {
            const cleanUrl = item.url.split('#')[0].replace(/\/$/, '');
            if (visited.has(cleanUrl)) return;
            visited.add(cleanUrl);

            try {
              const res = await this.auditSinglePage(item.url, auditId);
              
              for (const f of res.findings) {
                if (f.severity === 'critical') totalCritical++;
                else if (f.severity === 'warning') totalWarning++;
                else totalNotice++;
              }

              pageResults.push({
                url: item.url,
                status: res.status,
                title: res.title,
                issues: res.findings.length,
              });

              // Discover next links if depth allows
              if (item.depth < maxDepth && visited.size < maxPages) {
                for (const link of res.internalLinks) {
                  try {
                    const parsed = new URL(link.href);
                    if (parsed.origin === seedOrigin) {
                      const cleanNext = link.href.split('#')[0].replace(/\/$/, '');
                      if (!visited.has(cleanNext) && !queue.some((q) => q.url === cleanNext)) {
                        queue.push({ url: cleanNext, depth: item.depth + 1 });
                      }
                    }
                  } catch {
                    // skip
                  }
                }
              }
            } catch (pageErr: any) {
              console.error(`[Crawler] Error auditing ${item.url}:`, pageErr.message);
            }
          });

          await Promise.all(promises);
        }

        // Calculate weighted health score: starts at 100
        // -10 for each critical issue per page average, -3 for warnings, -1 for notices
        const pagesCrawled = Math.max(1, visited.size);
        const penalty = ((totalCritical * 12) + (totalWarning * 4) + (totalNotice * 1)) / pagesCrawled;
        const calculatedScore = Math.max(15, Math.min(100, Math.round(100 - penalty)));

        await db.update(schema.seoAudits)
          .set({
            status: 'completed',
            score: calculatedScore,
            pagesCrawled: visited.size,
            issuesCount: { critical: totalCritical, warning: totalWarning, notice: totalNotice },
            summaryJson: {
              pagesAudited: pageResults,
              crawlDepthReached: maxDepth,
              concurrencyUsed: concurrency,
            },
            completedAt: new Date(),
          })
          .where(eq(schema.seoAudits.id, auditId));

        console.log(`[Crawler] Audit ${auditId} completed: ${visited.size} pages crawled, score: ${calculatedScore}`);
      } catch (runErr: any) {
        console.error(`[Crawler] Full site audit ${auditId} failed:`, runErr.message);
        await db.update(schema.seoAudits)
          .set({
            status: 'failed',
            errorMessage: runErr.message,
            completedAt: new Date(),
          })
          .where(eq(schema.seoAudits.id, auditId));
      }
    })();

    return auditId;
  }

  /**
   * Export audit report to CSV format
   */
  async exportAuditToCsv(auditId: string): Promise<string> {
    const findings = await db.query.seoAuditFindings.findMany({
      where: eq(schema.seoAuditFindings.auditId, auditId),
      orderBy: [desc(schema.seoAuditFindings.severity)],
    });

    const headers = ['URL', 'Severity', 'Category', 'Rule ID', 'Title', 'Message', 'Recommendation'];
    const rows = findings.map((f) => [
      `"${f.url.replace(/"/g, '""')}"`,
      `"${f.severity}"`,
      `"${f.category}"`,
      `"${f.ruleId}"`,
      `"${f.title.replace(/"/g, '""')}"`,
      `"${f.message.replace(/"/g, '""')}"`,
      `"${f.recommendation.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const seoCrawlerService = new SEOCrawlerService();
