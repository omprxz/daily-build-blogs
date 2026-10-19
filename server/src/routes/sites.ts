import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { config } from '../config/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc, and } from 'drizzle-orm';
import { runLighthouseAudit, runFullSiteAudit } from '../services/google/pagespeed.js';
import {
  getGoogleAuthUrl,
  exchangeOAuthCode,
  getSearchConsoleStatus,
  disconnectSearchConsole,
  getVerifiedProperties,
  querySearchAnalytics,
} from '../services/google/search-console.js';
import {
  getGA4AuthUrl,
  exchangeGA4OAuthCode,
  getGA4Status,
  disconnectGA4,
  getGA4Properties,
  selectGA4Property,
  queryGA4Analytics,
} from '../services/google/analytics-ga4.js';
import { generateSiteAIInsights } from '../services/google/ai-insights.js';

const router = Router();

// ============================================================================
// 1. PUBLIC / OAUTH CALLBACK (Needs to be accessible without Bearer token)
// ============================================================================

/**
 * Google OAuth 2.0 Callback handler for Search Console
 * Google redirects here with ?code=...&state=...
 */
router.get('/gsc/oauth-callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  const appBase = config.appUrl || `${req.protocol}://${req.get('host')}`;

  // If callback was initiated by GA4 auth flow, delegate to GA4 exchange
  if (state === 'sites_ga4_auth') {
    if (error) {
      return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=error&msg=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=error&msg=No+authorization+code+received`);
    }
    try {
      const exchange = await exchangeGA4OAuthCode(code);
      return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=success&email=${encodeURIComponent(exchange.email)}`);
    } catch (err: any) {
      return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=error&msg=${encodeURIComponent(err.message || 'GA4 Token exchange failed')}`);
    }
  }

  if (error) {
    console.warn('[GSC OAuth Error from Google]:', error);
    return res.redirect(`${appBase}/admin/sites?gsc=error&msg=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${appBase}/admin/sites?gsc=error&msg=No+authorization+code+received`);
  }

  try {
    const exchange = await exchangeOAuthCode(code);
    console.log(`[GSC OAuth Success] Connected Google account: ${exchange.email}`);
    return res.redirect(`${appBase}/admin/sites?gsc=success&email=${encodeURIComponent(exchange.email)}`);
  } catch (err: any) {
    console.error('[GSC OAuth Callback Exchange Failed]:', err.message);
    return res.redirect(
      `${appBase}/admin/sites?gsc=error&msg=${encodeURIComponent(err.message || 'Token exchange failed')}`
    );
  }
});

/**
 * Google OAuth 2.0 Callback handler for Google Analytics 4 (GA4)
 */
router.get('/ga4/oauth-callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;

  const appBase = config.appUrl || `${req.protocol}://${req.get('host')}`;

  if (error) {
    console.warn('[GA4 OAuth Error from Google]:', error);
    return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=error&msg=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=error&msg=No+authorization+code+received`);
  }

  try {
    const exchange = await exchangeGA4OAuthCode(code);
    console.log(`[GA4 OAuth Success] Connected Google Analytics account: ${exchange.email}`);
    return res.redirect(`${appBase}/admin/sites?tab=ga4&ga4=success&email=${encodeURIComponent(exchange.email)}`);
  } catch (err: any) {
    console.error('[GA4 OAuth Callback Exchange Failed]:', err.message);
    return res.redirect(
      `${appBase}/admin/sites?tab=ga4&ga4=error&msg=${encodeURIComponent(err.message || 'GA4 Token exchange failed')}`
    );
  }
});

// ============================================================================
// PROTECTED API ENDPOINTS (Require Admin or Editor role)
// ============================================================================
router.use(authenticate, requireRole(['admin', 'editor']));

// ----------------------------------------------------------------------------
// SITES CRUD
// ----------------------------------------------------------------------------

/**
 * List all managed sites
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sites = await db.query.managedSites.findMany({
      orderBy: [desc(schema.managedSites.isDefault), desc(schema.managedSites.createdAt)],
    });

    res.json({ sites });
  } catch (err) {
    next(err);
  }
});

/**
 * Add a new managed site
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, url, gscPropertyUrl, ga4PropertyId, ga4MeasurementId, isDefault, notes } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required.' });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.update(schema.managedSites).set({ isDefault: false });
    }

    const [site] = await db
      .insert(schema.managedSites)
      .values({
        name: name.trim(),
        url: normalizedUrl,
        gscPropertyUrl: gscPropertyUrl?.trim() || null,
        ga4PropertyId: ga4PropertyId?.trim() || null,
        ga4MeasurementId: ga4MeasurementId?.trim() || null,
        isDefault: !!isDefault,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({ site, message: 'Site added successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Update managed site
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, url, gscPropertyUrl, ga4PropertyId, ga4MeasurementId, isDefault, notes } = req.body;

    const existing = await db.query.managedSites.findFirst({
      where: eq(schema.managedSites.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    if (isDefault) {
      await db.update(schema.managedSites).set({ isDefault: false });
    }

    let normalizedUrl = url ? url.trim() : existing.url;
    if (url && !/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const [updated] = await db
      .update(schema.managedSites)
      .set({
        name: name !== undefined ? name.trim() : existing.name,
        url: normalizedUrl,
        gscPropertyUrl: gscPropertyUrl !== undefined ? (gscPropertyUrl?.trim() || null) : existing.gscPropertyUrl,
        ga4PropertyId: ga4PropertyId !== undefined ? (ga4PropertyId?.trim() || null) : existing.ga4PropertyId,
        ga4MeasurementId: ga4MeasurementId !== undefined ? (ga4MeasurementId?.trim() || null) : existing.ga4MeasurementId,
        isDefault: isDefault !== undefined ? !!isDefault : existing.isDefault,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(schema.managedSites.id, id))
      .returning();

    res.json({ site: updated, message: 'Site updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete managed site
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.delete(schema.managedSites).where(eq(schema.managedSites.id, id));
    res.json({ success: true, message: 'Site deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * Get site combined overview (latest mobile + desktop audit & site config)
 */
router.get('/:id/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const site = await db.query.managedSites.findFirst({
      where: eq(schema.managedSites.id, id),
    });

    if (!site) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    // Get latest mobile and desktop audits
    const mobileAudit = await db.query.lighthouseAudits.findFirst({
      where: and(
        eq(schema.lighthouseAudits.url, site.url),
        eq(schema.lighthouseAudits.strategy, 'mobile')
      ),
      orderBy: [desc(schema.lighthouseAudits.auditedAt)],
    });

    const desktopAudit = await db.query.lighthouseAudits.findFirst({
      where: and(
        eq(schema.lighthouseAudits.url, site.url),
        eq(schema.lighthouseAudits.strategy, 'desktop')
      ),
      orderBy: [desc(schema.lighthouseAudits.auditedAt)],
    });

    const gscStatus = await getSearchConsoleStatus();
    const ga4Status = await getGA4Status();

    res.json({
      site,
      mobileAudit,
      desktopAudit,
      gscStatus,
      ga4Status,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 2. LIGHTHOUSE / PAGESPEED INSIGHTS ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * Trigger Lighthouse audit for a URL (mobile, desktop, or both in parallel)
 */
router.post('/lighthouse/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, strategy = 'both', forceRefresh = false, siteId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Target URL is required for Lighthouse audit.' });
    }

    if (strategy === 'both') {
      const results = await runFullSiteAudit(url, { forceRefresh, siteId });
      return res.json({
        success: true,
        url,
        results,
      });
    }

    const singleResult = await runLighthouseAudit(url, strategy, { forceRefresh, siteId });
    res.json({
      success: true,
      url,
      result: singleResult,
    });
  } catch (err: any) {
    console.error('[Lighthouse Audit Error]:', err.message);
    res.status(500).json({
      error: 'LighthouseAuditFailed',
      message: err.message || 'Failed to complete Google PageSpeed audit.',
    });
  }
});

/**
 * Get historical audits for a URL or siteId
 */
router.get('/lighthouse/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url = req.query.url as string;
    const siteId = req.query.siteId as string;
    const limit = parseInt((req.query.limit as string) || '15', 10);

    const conditions = [];
    if (url) conditions.push(eq(schema.lighthouseAudits.url, url));
    if (siteId) conditions.push(eq(schema.lighthouseAudits.siteId, siteId));

    const audits = await db.query.lighthouseAudits.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.lighthouseAudits.auditedAt)],
      limit,
    });

    res.json({ audits });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// 3. GOOGLE SEARCH CONSOLE ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * Check Google Search Console connection & credentials status
 */
router.get('/gsc/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getSearchConsoleStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * Generate Google OAuth 2.0 Authorization URL
 */
router.get('/gsc/auth-url', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const url = getGoogleAuthUrl();
    res.json({ authUrl: url });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Disconnect Google Search Console Account
 */
router.post('/gsc/disconnect', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await disconnectSearchConsole();
    res.json({ success: true, message: 'Google Search Console disconnected successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * List verified properties in the connected Google Search Console account
 */
router.get('/gsc/properties', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const properties = await getVerifiedProperties();
    res.json({ properties });
  } catch (err) {
    next(err);
  }
});

/**
 * Select active Search Console property for site
 */
router.post('/gsc/select-property', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyUrl, siteId } = req.body;
    if (!propertyUrl) {
      return res.status(400).json({ error: 'propertyUrl is required.' });
    }

    const cleanPropertyUrl = propertyUrl.trim();

    if (siteId) {
      await db
        .update(schema.managedSites)
        .set({
          gscPropertyUrl: cleanPropertyUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.managedSites.id, siteId));
    }

    // Invalidate old cache for this property
    try {
      await db
        .delete(schema.searchConsoleCache)
        .where(eq(schema.searchConsoleCache.siteUrl, cleanPropertyUrl));
    } catch (cacheErr: any) {
      console.warn('[GSC Clear Cache Warning]:', cacheErr.message);
    }

    res.json({ success: true, propertyUrl: cleanPropertyUrl });
  } catch (err) {
    next(err);
  }
});

/**
 * Query Search Analytics data for a property
 */
router.post('/gsc/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyUrl, startDate, endDate, compare = true, forceRefresh = false } = req.body;

    let targetProperty = (propertyUrl || '').trim();
    if (!targetProperty) {
      const defaultSite = await db.query.managedSites.findFirst({
        where: eq(schema.managedSites.isDefault, true),
      });
      targetProperty = defaultSite?.gscPropertyUrl || defaultSite?.url || 'https://blogs.dailybuild.tech';
    }

    // Default to last 28 days ending today if not provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 28 * 86400 * 1000).toISOString().split('T')[0];

    const data = await querySearchAnalytics(targetProperty, {
      startDate: start,
      endDate: end,
      compare: !!compare,
      forceRefresh: !!forceRefresh,
    });

    res.json(data);
  } catch (err: any) {
    console.error('[GSC Analytics Endpoint Error]:', err.message);
    res.status(500).json({
      error: 'SearchAnalyticsQueryFailed',
      message: err.message || 'Failed to query Google Search Console data.',
    });
  }
});

// ----------------------------------------------------------------------------
// 4. GOOGLE ANALYTICS 4 (GA4) DATA API & ADMIN API
// ----------------------------------------------------------------------------

/**
 * Get GA4 OAuth connection status
 */
router.get('/ga4/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await getGA4Status();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * Get GA4 OAuth authorization URL
 */
router.get('/ga4/auth-url', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const authUrl = getGA4AuthUrl('sites_ga4_auth');
    res.json({ authUrl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Disconnect GA4 account
 */
router.post('/ga4/disconnect', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await disconnectGA4();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * List GA4 properties accessible via Admin API
 */
router.get('/ga4/properties', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const properties = await getGA4Properties();
    res.json({ properties });
  } catch (err: any) {
    console.error('[GA4 Properties Endpoint Error]:', err.message);
    res.status(500).json({
      error: 'GA4PropertiesFetchFailed',
      message: err.message || 'Failed to list Google Analytics 4 properties.',
    });
  }
});

/**
 * Select active GA4 property for account or site
 */
router.post('/ga4/select-property', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, displayName, siteId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required.' });
    }

    const result = await selectGA4Property(propertyId, displayName, siteId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Query GA4 Analytics Data (runReport)
 */
router.post('/ga4/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { propertyId, startDate, endDate, compare = true, forceRefresh = false } = req.body;

    const data = await queryGA4Analytics({
      propertyId,
      startDate,
      endDate,
      compare: !!compare,
      forceRefresh: !!forceRefresh,
    });

    res.json(data);
  } catch (err: any) {
    console.error('[GA4 Analytics Endpoint Error]:', err.message);
    res.status(500).json({
      error: 'GA4AnalyticsQueryFailed',
      message: err.message || 'Failed to query Google Analytics 4 data.',
    });
  }
});

// ----------------------------------------------------------------------------
// 5. AI AGENT GUIDANCE (Joint Lighthouse + Search Console + GA4 analysis)
// ----------------------------------------------------------------------------

/**
 * Generate joint AI-driven recommendations
 */
router.post('/ai/generate-insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      siteUrl,
      mobileLighthouse,
      desktopLighthouse,
      searchConsole,
      googleAnalytics,
      providerSlug,
      modelId,
    } = req.body;

    if (!siteUrl) {
      return res.status(400).json({ error: 'siteUrl is required.' });
    }

    const report = await generateSiteAIInsights({
      siteUrl,
      mobileLighthouse,
      desktopLighthouse,
      searchConsole,
      googleAnalytics,
      providerSlug,
      modelId,
    });

    res.json(report);
  } catch (err: any) {
    console.error('[AI Insights Generation Error]:', err.message);
    res.status(500).json({
      error: 'AIInsightsFailed',
      message: err.message || 'Failed to generate joint AI guidance.',
    });
  }
});

// ----------------------------------------------------------------------------
// 6. INTERACTIVE API SETUP GUIDE & CREDENTIALS VERIFIER
// ----------------------------------------------------------------------------

/**
 * Returns dynamic checklist of APIs, credential status, callback URLs, and documentation links
 */
router.get('/setup/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const protocol = req.protocol;
    const host = req.get('host');
    const dynamicOrigin = `${protocol}://${host}`;
    const configuredAppUrl = config.appUrl;
    const deploymentGscCallbackUrl = `${dynamicOrigin}/api/sites/gsc/oauth-callback`;
    const deploymentGa4CallbackUrl = `${dynamicOrigin}/api/sites/ga4/oauth-callback`;

    const gscStatus = await getSearchConsoleStatus();
    const ga4Status = await getGA4Status();
    const hasPageSpeedKey = !!config.google.pagespeedApiKey;
    const hasGeminiKey = !!config.ai.geminiKey;

    const setupItems = [
      {
        id: 'pagespeed_api',
        name: 'Google PageSpeed Insights API',
        type: 'google_cloud_api',
        purpose: 'Runs automated Lighthouse audits for mobile and desktop performance, accessibility, SEO, and Core Web Vitals.',
        documentationUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
        cloudConsoleUrl: 'https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com',
        envVarName: 'GOOGLE_PAGESPEED_API_KEY (or PAGESPEED_API_KEY)',
        isEnabled: hasPageSpeedKey,
        isConfigured: hasPageSpeedKey,
        statusNote: hasPageSpeedKey
          ? 'API key detected and active. Quota enabled.'
          : 'Works in public tier, but setting GOOGLE_PAGESPEED_API_KEY provides higher quota.',
        requiredAction: hasPageSpeedKey ? 'None' : 'Enable PageSpeed Insights API in Google Cloud Console and add API Key to .env',
      },
      {
        id: 'analytics_data_api',
        name: 'Google Analytics Data API (v1beta)',
        type: 'google_cloud_api',
        purpose: 'Retrieves GA4 metrics: active users, sessions, pageviews, engagement rate, average engagement time, bounce rate, traffic channels, and conversions.',
        documentationUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
        cloudConsoleUrl: 'https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com',
        envVarName: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
        isEnabled: ga4Status.isConfigured,
        isConfigured: ga4Status.isConnected,
        statusNote: ga4Status.isConnected
          ? `Connected to Google Analytics: ${ga4Status.email}${ga4Status.selectedPropertyName ? ` (${ga4Status.selectedPropertyName})` : ''}`
          : ga4Status.isConfigured
          ? 'OAuth Client configured. Click "Connect Google Analytics 4" to authorize properties.'
          : 'OAuth Client ID or Client Secret missing in .env.',
        requiredAction: ga4Status.isConnected
          ? 'None'
          : !ga4Status.isConfigured
          ? 'Enable Google Analytics Data API in Google Cloud Console and configure OAuth 2.0 credentials'
          : 'Click Connect Google Analytics in the GA4 tab',
      },
      {
        id: 'analytics_admin_api',
        name: 'Google Analytics Admin API (v1beta)',
        type: 'google_cloud_api',
        purpose: 'Discovers and lists all Google Analytics accounts and GA4 property summaries automatically.',
        documentationUrl: 'https://developers.google.com/analytics/devguides/config/admin/v1',
        cloudConsoleUrl: 'https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com',
        envVarName: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
        isEnabled: ga4Status.isConfigured,
        isConfigured: ga4Status.isConnected,
        statusNote: ga4Status.isConnected
          ? 'GA4 Admin API active and authorized.'
          : 'Required to automatically discover and select GA4 properties.',
        requiredAction: ga4Status.isConnected
          ? 'None'
          : 'Enable Google Analytics Admin API in Google Cloud Console',
      },
      {
        id: 'search_console_api',
        name: 'Google Search Console API',
        type: 'google_cloud_api',
        purpose: 'Retrieves organic search telemetry: clicks, impressions, CTR, average rank, top queries, and landing pages.',
        documentationUrl: 'https://developers.google.com/webmaster-tools/v1/searchanalytics/query',
        cloudConsoleUrl: 'https://console.cloud.google.com/apis/library/searchconsole.googleapis.com',
        envVarName: 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET',
        isEnabled: gscStatus.isConfigured,
        isConfigured: gscStatus.isConnected,
        statusNote: gscStatus.isConnected
          ? `Connected to Google Account: ${gscStatus.email}`
          : gscStatus.isConfigured
          ? 'OAuth Client configured. Click "Connect Google Account" to authorize properties.'
          : 'OAuth Client ID or Client Secret missing in .env.',
        requiredAction: gscStatus.isConnected
          ? 'None'
          : !gscStatus.isConfigured
          ? 'Enable Search Console API in Google Cloud Console and configure OAuth 2.0 credentials'
          : 'Click Connect Google Account in the Search Console tab',
      },
      {
        id: 'oauth_credentials',
        name: 'Google Cloud OAuth 2.0 Web Client',
        type: 'oauth_credentials',
        purpose: 'Provides secure user authorization to inspect GA4 and Search Console without sharing master Google passwords.',
        documentationUrl: 'https://developers.google.com/identity/protocols/oauth2/web-server',
        cloudConsoleUrl: 'https://console.cloud.google.com/apis/credentials',
        envVarName: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI',
        isEnabled: gscStatus.clientIdConfigured && gscStatus.clientSecretConfigured,
        isConfigured: gscStatus.clientIdConfigured && gscStatus.clientSecretConfigured,
        requiredScopes: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/webmasters.readonly',
          'openid',
          'email',
          'profile',
        ],
        callbackUrls: [
          deploymentGa4CallbackUrl,
          deploymentGscCallbackUrl,
          `${configuredAppUrl}/api/sites/ga4/oauth-callback`,
          `${configuredAppUrl}/api/sites/gsc/oauth-callback`,
          'http://localhost:4000/api/sites/ga4/oauth-callback',
          'http://localhost:4000/api/sites/gsc/oauth-callback',
        ],
        statusNote: gscStatus.isConfigured
          ? 'OAuth Client ID & Client Secret configured.'
          : 'Generate "OAuth 2.0 Client ID" with Web Application type in Google Cloud Console.',
      },
      {
        id: 'gemini_ai_api',
        name: 'Google Gemini / AI Guidance Provider',
        type: 'ai_engine',
        purpose: 'Synthesizes joint performance, search insights, and GA4 telemetry into actionable next steps.',
        documentationUrl: 'https://ai.google.dev/docs',
        cloudConsoleUrl: 'https://aistudio.google.com/',
        envVarName: 'GEMINI_API_KEY',
        isEnabled: hasGeminiKey,
        isConfigured: hasGeminiKey,
        statusNote: hasGeminiKey
          ? 'Gemini API key is configured. AI Guidance engine ready.'
          : 'Gemini API key missing. System will fall back to local rule-guided analysis.',
        requiredAction: hasGeminiKey ? 'None' : 'Add GEMINI_API_KEY to server/.env',
      },
    ];

    res.json({
      environment: config.env,
      appUrl: configuredAppUrl,
      dynamicOrigin,
      deploymentCallbackUrl: deploymentGa4CallbackUrl,
      setupItems,
      allReady: hasPageSpeedKey && (gscStatus.isConnected || ga4Status.isConnected) && hasGeminiKey,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
