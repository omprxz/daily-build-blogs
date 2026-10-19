import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { eq, and, desc, gt } from 'drizzle-orm';

export interface CoreWebVitalMetric {
  name: string;
  acronym: string;
  value: number;
  unit: string;
  displayValue: string;
  status: 'good' | 'needs-improvement' | 'poor';
  thresholds: { good: number; poor: number };
  description: string;
}

export interface AuditOpportunity {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  savingsMs?: number;
  savingsBytes?: number;
}

export interface AuditDiagnostic {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
  score?: number | null;
}

export interface LighthouseAuditResult {
  id?: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;
  coreWebVitals: Record<string, CoreWebVitalMetric>;
  opportunities: AuditOpportunity[];
  diagnostics: AuditDiagnostic[];
  auditedAt: string;
  isCached?: boolean;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

/**
 * Categorize Core Web Vital values according to Google recommendations
 */
function evaluateVital(
  value: number,
  goodMax: number,
  poorMin: number
): 'good' | 'needs-improvement' | 'poor' {
  if (value <= goodMax) return 'good';
  if (value <= poorMin) return 'needs-improvement';
  return 'poor';
}

/**
 * Run a Google PageSpeed Insights Lighthouse audit
 */
export async function runLighthouseAudit(
  targetUrl: string,
  strategy: 'mobile' | 'desktop' = 'mobile',
  options: { forceRefresh?: boolean; siteId?: string } = {}
): Promise<LighthouseAuditResult> {
  let normalizedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // 1. Check database cache if forceRefresh is false
  if (!options.forceRefresh) {
    try {
      const cutoff = new Date(Date.now() - CACHE_TTL_MS);
      const cached = await db.query.lighthouseAudits.findFirst({
        where: and(
          eq(schema.lighthouseAudits.url, normalizedUrl),
          eq(schema.lighthouseAudits.strategy, strategy),
          gt(schema.lighthouseAudits.auditedAt, cutoff)
        ),
        orderBy: [desc(schema.lighthouseAudits.auditedAt)],
      });

      if (cached) {
        return {
          id: cached.id,
          url: cached.url,
          strategy: cached.strategy as 'mobile' | 'desktop',
          performanceScore: cached.performanceScore,
          accessibilityScore: cached.accessibilityScore,
          bestPracticesScore: cached.bestPracticesScore,
          seoScore: cached.seoScore,
          coreWebVitals: (cached.coreWebVitals || {}) as Record<string, CoreWebVitalMetric>,
          opportunities: (cached.opportunities || []) as AuditOpportunity[],
          diagnostics: (cached.diagnostics || []) as AuditDiagnostic[],
          auditedAt: cached.auditedAt.toISOString(),
          isCached: true,
        };
      }
    } catch (dbErr: any) {
      console.warn('[PageSpeed Cache Check Error]:', dbErr.message);
    }
  }

  // 2. Build Google PageSpeed Insights API URL
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  apiUrl.searchParams.set('url', normalizedUrl);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.append('category', 'performance');
  apiUrl.searchParams.append('category', 'accessibility');
  apiUrl.searchParams.append('category', 'best-practices');
  apiUrl.searchParams.append('category', 'seo');

  const apiKey = config.google.pagespeedApiKey;
  if (apiKey) {
    apiUrl.searchParams.set('key', apiKey);
  }

  console.log(`[PageSpeed API] Calling Google Lighthouse for ${normalizedUrl} (${strategy})...`);

  const response = await fetch(apiUrl.toString(), {
    headers: {
      Accept: 'application/json',
    },
    // 60-second timeout for Lighthouse analysis
    signal: AbortSignal.timeout(65000),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as any;
    const errMsg =
      errorData?.error?.message ||
      `Google PageSpeed API responded with HTTP ${response.status} ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = (await response.json()) as any;
  const lhr = data.lighthouseResult;
  if (!lhr) {
    throw new Error('Lighthouse result payload missing from Google PageSpeed response.');
  }

  // 3. Extract Categories Scores (0-100)
  const categories = lhr.categories || {};
  const performanceScore = Math.round((categories.performance?.score || 0) * 100);
  const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);
  const bestPracticesScore = Math.round((categories['best-practices']?.score || 0) * 100);
  const seoScore = Math.round((categories.seo?.score || 0) * 100);

  // 4. Extract Core Web Vitals and Metrics
  const audits = lhr.audits || {};

  // LCP (Largest Contentful Paint) - Good <= 2.5s, Poor > 4.0s
  const lcpAudit = audits['largest-contentful-paint'] || {};
  const lcpValueSec = (lcpAudit.numericValue || 0) / 1000;

  // FCP (First Contentful Paint) - Good <= 1.8s, Poor > 3.0s
  const fcpAudit = audits['first-contentful-paint'] || {};
  const fcpValueSec = (fcpAudit.numericValue || 0) / 1000;

  // CLS (Cumulative Layout Shift) - Good <= 0.1, Poor > 0.25
  const clsAudit = audits['cumulative-layout-shift'] || {};
  const clsValue = clsAudit.numericValue || 0;

  // TBT (Total Blocking Time) - Good <= 200ms, Poor > 600ms
  const tbtAudit = audits['total-blocking-time'] || {};
  const tbtValueMs = tbtAudit.numericValue || 0;

  // Speed Index - Good <= 3.4s, Poor > 5.8s
  const siAudit = audits['speed-index'] || {};
  const siValueSec = (siAudit.numericValue || 0) / 1000;

  // TTFB (Server response time) - Good <= 800ms, Poor > 1800ms
  const ttfbAudit = audits['server-response-time'] || {};
  const ttfbValueMs = ttfbAudit.numericValue || 0;

  // INP / FID representation if present
  const inpAudit = audits['interaction-to-next-paint'] || audits['max-potential-fid'] || {};
  const inpValueMs = inpAudit.numericValue || 0;

  const coreWebVitals: Record<string, CoreWebVitalMetric> = {
    lcp: {
      name: 'Largest Contentful Paint',
      acronym: 'LCP',
      value: parseFloat(lcpValueSec.toFixed(2)),
      unit: 's',
      displayValue: lcpAudit.displayValue || `${lcpValueSec.toFixed(2)} s`,
      status: evaluateVital(lcpValueSec, 2.5, 4.0),
      thresholds: { good: 2.5, poor: 4.0 },
      description: 'Measures loading performance. For a good user experience, LCP should occur within 2.5 seconds of when the page first starts loading.',
    },
    inp: {
      name: inpAudit.title || 'Interaction to Next Paint / FID',
      acronym: 'INP',
      value: Math.round(inpValueMs),
      unit: 'ms',
      displayValue: inpAudit.displayValue || `${Math.round(inpValueMs)} ms`,
      status: evaluateVital(inpValueMs, 200, 500),
      thresholds: { good: 200, poor: 500 },
      description: 'Measures responsiveness. Pages should have an INP of 200 milliseconds or less.',
    },
    cls: {
      name: 'Cumulative Layout Shift',
      acronym: 'CLS',
      value: parseFloat(clsValue.toFixed(3)),
      unit: '',
      displayValue: clsAudit.displayValue || clsValue.toFixed(3),
      status: evaluateVital(clsValue, 0.1, 0.25),
      thresholds: { good: 0.1, poor: 0.25 },
      description: 'Measures visual stability. Pages should maintain a CLS of 0.1 or less.',
    },
    fcp: {
      name: 'First Contentful Paint',
      acronym: 'FCP',
      value: parseFloat(fcpValueSec.toFixed(2)),
      unit: 's',
      displayValue: fcpAudit.displayValue || `${fcpValueSec.toFixed(2)} s`,
      status: evaluateVital(fcpValueSec, 1.8, 3.0),
      thresholds: { good: 1.8, poor: 3.0 },
      description: 'Marks the point at which the browser renders the first piece of DOM content.',
    },
    tbt: {
      name: 'Total Blocking Time',
      acronym: 'TBT',
      value: Math.round(tbtValueMs),
      unit: 'ms',
      displayValue: tbtAudit.displayValue || `${Math.round(tbtValueMs)} ms`,
      status: evaluateVital(tbtValueMs, 200, 600),
      thresholds: { good: 200, poor: 600 },
      description: 'Sum of all time periods between FCP and Time to Interactive when task length exceeded 50ms.',
    },
    ttfb: {
      name: 'Time to First Byte',
      acronym: 'TTFB',
      value: Math.round(ttfbValueMs),
      unit: 'ms',
      displayValue: ttfbAudit.displayValue || `${Math.round(ttfbValueMs)} ms`,
      status: evaluateVital(ttfbValueMs, 800, 1800),
      thresholds: { good: 800, poor: 1800 },
      description: 'Measures the time it takes for the browser to receive the first byte of response data from the server.',
    },
    speedIndex: {
      name: 'Speed Index',
      acronym: 'SI',
      value: parseFloat(siValueSec.toFixed(2)),
      unit: 's',
      displayValue: siAudit.displayValue || `${siValueSec.toFixed(2)} s`,
      status: evaluateVital(siValueSec, 3.4, 5.8),
      thresholds: { good: 3.4, poor: 5.8 },
      description: 'Shows how quickly the contents of a page are visibly populated.',
    },
  };

  // 5. Extract Key Opportunities with estimated savings
  const opportunityIds = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
    'efficient-animated-content',
    'duplicated-javascript',
    'server-response-time',
  ];

  const opportunities: AuditOpportunity[] = [];
  for (const id of opportunityIds) {
    const audit = audits[id];
    if (audit && (audit.score === null || audit.score < 0.9) && audit.details) {
      opportunities.push({
        id,
        title: audit.title,
        description: audit.description || '',
        score: audit.score,
        displayValue: audit.displayValue,
        savingsMs: audit.details?.overallSavingsMs,
        savingsBytes: audit.details?.overallSavingsBytes,
      });
    }
  }

  // 6. Extract Notable Technical Diagnostics
  const diagnosticIds = [
    'dom-size',
    'uses-passive-event-listeners',
    'total-byte-weight',
    'mainthread-work-breakdown',
    'bootup-time',
    'font-display',
    'third-party-summary',
    'critical-request-chains',
    'network-rtt',
  ];

  const diagnostics: AuditDiagnostic[] = [];
  for (const id of diagnosticIds) {
    const audit = audits[id];
    if (audit) {
      diagnostics.push({
        id,
        title: audit.title,
        description: audit.description || '',
        displayValue: audit.displayValue,
        score: audit.score,
      });
    }
  }

  const auditedAtDate = new Date();

  // 7. Store in database
  let savedId: string | undefined;
  try {
    const [inserted] = await db
      .insert(schema.lighthouseAudits)
      .values({
        siteId: options.siteId || null,
        url: normalizedUrl,
        strategy,
        performanceScore,
        accessibilityScore,
        bestPracticesScore,
        seoScore,
        coreWebVitals,
        opportunities,
        diagnostics,
        auditedAt: auditedAtDate,
      })
      .returning();
    savedId = inserted?.id;
  } catch (dbInsertErr: any) {
    console.warn('[PageSpeed DB Insert Warning]:', dbInsertErr.message);
  }

  return {
    id: savedId,
    url: normalizedUrl,
    strategy,
    performanceScore,
    accessibilityScore,
    bestPracticesScore,
    seoScore,
    coreWebVitals,
    opportunities,
    diagnostics,
    auditedAt: auditedAtDate.toISOString(),
    isCached: false,
  };
}

/**
 * Parallel execution for Mobile and Desktop Lighthouse audits
 */
export async function runFullSiteAudit(
  url: string,
  options: { forceRefresh?: boolean; siteId?: string } = {}
): Promise<{
  mobile: LighthouseAuditResult | { error: string };
  desktop: LighthouseAuditResult | { error: string };
}> {
  const [mobileRes, desktopRes] = await Promise.allSettled([
    runLighthouseAudit(url, 'mobile', options),
    runLighthouseAudit(url, 'desktop', options),
  ]);

  return {
    mobile:
      mobileRes.status === 'fulfilled'
        ? mobileRes.value
        : { error: mobileRes.reason?.message || 'Failed to complete mobile Lighthouse audit.' },
    desktop:
      desktopRes.status === 'fulfilled'
        ? desktopRes.value
        : { error: desktopRes.reason?.message || 'Failed to complete desktop Lighthouse audit.' },
  };
}
