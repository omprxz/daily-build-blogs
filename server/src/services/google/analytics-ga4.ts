import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { encryptApiKey, decryptApiKey } from '../../utils/security.js';
import { eq, desc, and, gt } from 'drizzle-orm';

export interface GA4PropertySummary {
  propertyId: string;       // e.g. "properties/431289123" or "431289123"
  cleanId: string;          // numeric ID e.g. "431289123"
  displayName: string;
  account: string;          // e.g. "accounts/123456"
  accountName: string;
}

export interface GA4MetricOverview {
  activeUsers: number;
  totalUsers: number;
  sessions: number;
  pageViews: number;
  engagementRate: number;      // e.g. 64.2 (%)
  averageSessionDuration: number; // in seconds
  bounceRate: number;          // e.g. 35.8 (%)
  conversions: number;
  comparison?: {
    activeUsers: number;
    totalUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversions: number;
    activeUsersDeltaPct: number;
    totalUsersDeltaPct: number;
    sessionsDeltaPct: number;
    pageViewsDeltaPct: number;
    engagementRateDeltaPct: number;
    avgDurationDeltaPct: number;
    bounceRateDeltaPct: number;
    conversionsDeltaPct: number;
  };
  timeSeries: Array<{
    date: string;
    formattedDate: string;
    activeUsers: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
  }>;
  trafficSources: Array<{
    channel: string;
    sessions: number;
    activeUsers: number;
    engagementRate: number;
    percentage: number;
  }>;
  topPages: Array<{
    path: string;
    pageViews: number;
    activeUsers: number;
    averageEngagementTime: number; // in seconds
  }>;
  topCountries: Array<{
    country: string;
    countryName: string;
    activeUsers: number;
    sessions: number;
    percentage: number;
  }>;
  devices: Array<{
    device: string;
    activeUsers: number;
    sessions: number;
    percentage: number;
  }>;
  topEvents: Array<{
    eventName: string;
    eventCount: number;
    totalUsers: number;
  }>;
  connected: boolean;
  isDemoData?: boolean;
  selectedProperty?: {
    propertyId: string;
    displayName: string;
  } | null;
}

const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid',
  'email',
  'profile',
];

/**
 * Generate Google OAuth 2.0 Authorization URL for Google Analytics 4
 */
export function getGA4AuthUrl(state: string = 'sites_ga4_auth'): string {
  const clientId = config.google.clientId;
  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured in GOOGLE_CLIENT_ID environment variable.');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', config.google.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GA4_SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', state);

  return authUrl.toString();
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens (GA4)
 */
export async function exchangeGA4OAuthCode(code: string): Promise<{ email: string; success: boolean }> {
  const clientId = config.google.clientId;
  const clientSecret = config.google.clientSecret;
  const redirectUri = config.google.redirectUri;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID or Client Secret is missing.');
  }

  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err.error_description || err.error || `OAuth token exchange failed with HTTP ${response.status}`);
  }

  const tokenData = (await response.json()) as any;
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresIn = tokenData.expires_in || 3600;
  const expiryDate = new Date(Date.now() + (expiresIn - 60) * 1000);

  // Fetch authorized Google user email
  let userEmail = 'authenticated-ga4-user';
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userData = (await userRes.json()) as any;
      if (userData.email) userEmail = userData.email;
    }
  } catch (userErr: any) {
    console.warn('[GA4 UserInfo Warning]:', userErr.message);
  }

  const encryptedRefresh = refreshToken ? encryptApiKey(refreshToken) : null;

  // Save or update token in database
  const existing = await db.query.googleAnalyticsTokens.findFirst({
    orderBy: [desc(schema.googleAnalyticsTokens.createdAt)],
  });

  if (existing) {
    await db
      .update(schema.googleAnalyticsTokens)
      .set({
        email: userEmail,
        accessToken,
        refreshToken: encryptedRefresh || existing.refreshToken,
        tokenExpiry: expiryDate,
        scopes: tokenData.scope || GA4_SCOPES.join(' '),
        isConnected: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleAnalyticsTokens.id, existing.id));
  } else {
    await db.insert(schema.googleAnalyticsTokens).values({
      email: userEmail,
      accessToken,
      refreshToken: encryptedRefresh,
      tokenExpiry: expiryDate,
      scopes: tokenData.scope || GA4_SCOPES.join(' '),
      isConnected: true,
    });
  }

  // Pre-fetch and auto-select first property if none selected yet
  try {
    const properties = await fetchGA4AccountSummaries(accessToken);
    if (properties.length > 0) {
      const firstProp = properties[0];
      await db
        .update(schema.googleAnalyticsTokens)
        .set({
          selectedPropertyId: firstProp.cleanId,
          selectedPropertyName: firstProp.displayName,
          updatedAt: new Date(),
        })
        .where(eq(schema.googleAnalyticsTokens.email, userEmail));
    }
  } catch (propErr: any) {
    console.warn('[GA4 Auto-Select Property Notice]:', propErr.message);
  }

  return { email: userEmail, success: true };
}

/**
 * Retrieve a valid GA4 Google Access Token (auto-refreshing if near expiration)
 */
export async function getValidGA4AccessToken(): Promise<string | null> {
  const tokenRecord = await db.query.googleAnalyticsTokens.findFirst({
    where: eq(schema.googleAnalyticsTokens.isConnected, true),
    orderBy: [desc(schema.googleAnalyticsTokens.updatedAt)],
  });

  if (!tokenRecord) {
    return null;
  }

  const now = new Date();
  const expiry = tokenRecord.tokenExpiry ? new Date(tokenRecord.tokenExpiry) : null;

  // If token is valid for at least 2 minutes, return it
  if (expiry && expiry.getTime() - now.getTime() > 120000) {
    return tokenRecord.accessToken;
  }

  // Otherwise, refresh token
  if (!tokenRecord.refreshToken) {
    return tokenRecord.accessToken;
  }

  const plainRefreshToken = decryptApiKey(tokenRecord.refreshToken);
  if (!plainRefreshToken) {
    return tokenRecord.accessToken;
  }

  try {
    const clientId = config.google.clientId;
    const clientSecret = config.google.clientSecret;

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: plainRefreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!refreshRes.ok) {
      console.warn('[GA4 Token Refresh Failed]:', await refreshRes.text());
      return tokenRecord.accessToken;
    }

    const refreshed = (await refreshRes.json()) as any;
    const newAccessToken = refreshed.access_token;
    const expiresIn = refreshed.expires_in || 3600;
    const newExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);

    await db
      .update(schema.googleAnalyticsTokens)
      .set({
        accessToken: newAccessToken,
        tokenExpiry: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleAnalyticsTokens.id, tokenRecord.id));

    return newAccessToken;
  } catch (err: any) {
    console.error('[GA4 Refresh Token Error]:', err.message);
    return tokenRecord.accessToken;
  }
}

/**
 * Check current GA4 Connection Status
 */
export async function getGA4Status(): Promise<{
  isConnected: boolean;
  email: string | null;
  isConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUri: string;
  selectedPropertyId: string | null;
  selectedPropertyName: string | null;
}> {
  const clientId = config.google.clientId;
  const clientSecret = config.google.clientSecret;
  const isConfigured = Boolean(clientId && clientSecret);

  const tokenRecord = await db.query.googleAnalyticsTokens.findFirst({
    where: eq(schema.googleAnalyticsTokens.isConnected, true),
    orderBy: [desc(schema.googleAnalyticsTokens.updatedAt)],
  });

  return {
    isConnected: Boolean(tokenRecord && tokenRecord.isConnected),
    email: tokenRecord?.email || null,
    isConfigured,
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    redirectUri: config.google.redirectUri,
    selectedPropertyId: tokenRecord?.selectedPropertyId || null,
    selectedPropertyName: tokenRecord?.selectedPropertyName || null,
  };
}

/**
 * Disconnect GA4
 */
export async function disconnectGA4(): Promise<{ success: boolean; message: string }> {
  await db
    .update(schema.googleAnalyticsTokens)
    .set({
      isConnected: false,
      accessToken: '',
      refreshToken: null,
      updatedAt: new Date(),
    });

  // Invalidate GA4 cache
  try {
    await db.delete(schema.ga4AnalyticsCache);
  } catch (err) {
    // ignore
  }

  return { success: true, message: 'Google Analytics 4 account disconnected successfully.' };
}

/**
 * Private helper to query Google Analytics Admin API accountSummaries
 */
async function fetchGA4AccountSummaries(accessToken: string): Promise<GA4PropertySummary[]> {
  const url = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Analytics Admin API responded with HTTP ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as any;
  const summaries: GA4PropertySummary[] = [];

  if (Array.isArray(data.accountSummaries)) {
    for (const acc of data.accountSummaries) {
      const accountName = acc.displayName || acc.account || 'GA Account';
      const accountId = acc.account || '';

      if (Array.isArray(acc.propertySummaries)) {
        for (const prop of acc.propertySummaries) {
          const rawId = prop.property || ''; // e.g. "properties/431289123"
          const cleanId = rawId.replace(/^properties\//, '');
          summaries.push({
            propertyId: rawId,
            cleanId,
            displayName: prop.displayName || `Property ${cleanId}`,
            account: accountId,
            accountName,
          });
        }
      }
    }
  }

  return summaries;
}

/**
 * Retrieve GA4 Properties accessible to the authenticated user
 */
export async function getGA4Properties(): Promise<GA4PropertySummary[]> {
  const token = await getValidGA4AccessToken();
  if (!token) {
    return [];
  }

  try {
    return await fetchGA4AccountSummaries(token);
  } catch (err: any) {
    console.error('[getGA4Properties Error]:', err.message);
    throw err;
  }
}

/**
 * Update selected GA4 Property
 */
export async function selectGA4Property(
  propertyId: string,
  displayName?: string,
  siteId?: string
): Promise<{ success: boolean; propertyId: string; displayName?: string }> {
  const cleanId = propertyId.replace(/^properties\//, '');
  
  // Update token record
  const tokenRecord = await db.query.googleAnalyticsTokens.findFirst({
    where: eq(schema.googleAnalyticsTokens.isConnected, true),
    orderBy: [desc(schema.googleAnalyticsTokens.updatedAt)],
  });

  if (tokenRecord) {
    await db
      .update(schema.googleAnalyticsTokens)
      .set({
        selectedPropertyId: cleanId,
        selectedPropertyName: displayName || tokenRecord.selectedPropertyName,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleAnalyticsTokens.id, tokenRecord.id));
  }

  // If siteId provided, link to managed_sites as well
  if (siteId) {
    await db
      .update(schema.managedSites)
      .set({
        ga4PropertyId: cleanId,
        updatedAt: new Date(),
      })
      .where(eq(schema.managedSites.id, siteId));
  }

  // Clear any existing cache for this property so fresh data is retrieved
  await db
    .delete(schema.ga4AnalyticsCache)
    .where(eq(schema.ga4AnalyticsCache.propertyId, cleanId))
    .catch(() => {});

  return { success: true, propertyId: cleanId, displayName };
}

/**
 * Run a GA4 Data API Report using runReport
 */
async function callGA4RunReport(
  accessToken: string,
  cleanPropertyId: string,
  body: any
): Promise<any> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GA4 Data API error (${res.status}): ${errorText}`);
  }

  return await res.json();
}

/**
 * Query GA4 Analytics Data with caching and period comparison
 */
export async function queryGA4Analytics(params: {
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  compare?: boolean;
  forceRefresh?: boolean;
}): Promise<GA4MetricOverview> {
  const { startDate, endDate, compare = true, forceRefresh = false } = params;

  // Resolve property ID
  let propertyId = params.propertyId?.replace(/^properties\//, '').trim();

  const tokenRecord = await db.query.googleAnalyticsTokens.findFirst({
    where: eq(schema.googleAnalyticsTokens.isConnected, true),
    orderBy: [desc(schema.googleAnalyticsTokens.updatedAt)],
  });

  if (!propertyId && tokenRecord?.selectedPropertyId) {
    propertyId = tokenRecord.selectedPropertyId;
  }

  // If a valid real propertyId was supplied and tokenRecord exists, update selectedPropertyId if not set
  if (propertyId && propertyId !== 'demo-property' && tokenRecord && tokenRecord.selectedPropertyId !== propertyId) {
    await db
      .update(schema.googleAnalyticsTokens)
      .set({ selectedPropertyId: propertyId, updatedAt: new Date() })
      .where(eq(schema.googleAnalyticsTokens.id, tokenRecord.id))
      .catch((e) => console.warn('[GA4 Update Selected Property Notice]:', e.message));
  }

  const token = await getValidGA4AccessToken();
  const isConnected = Boolean(token && tokenRecord?.isConnected);

  // Default to rolling 24-hour window ending today if dates are not provided
  const now = new Date();
  const defaultEnd = now.toISOString().split('T')[0];
  const defaultStart = new Date(now.getTime() - 1 * 86400 * 1000).toISOString().split('T')[0];

  const actualStartDate = startDate || defaultStart;
  const actualEndDate = endDate || defaultEnd;
  const cacheKey = `${actualStartDate}_to_${actualEndDate}_comp_${compare ? '1' : '0'}`;

  // If not connected or no property selected or demo-property requested, return realistic baseline benchmark data
  if (!isConnected || !propertyId || propertyId === 'demo-property') {
    return generateBenchmarkGA4Overview({
      propertyId: propertyId || 'demo-property',
      displayName: tokenRecord?.selectedPropertyName || 'DailyBuild Production GA4 (Demo)',
      connected: isConnected,
      startDate: actualStartDate,
      endDate: actualEndDate,
      compare,
    });
  }

  // 1. Check cache (1 hour TTL)
  if (!forceRefresh) {
    const cached = await db.query.ga4AnalyticsCache.findFirst({
      where: and(
        eq(schema.ga4AnalyticsCache.propertyId, propertyId),
        eq(schema.ga4AnalyticsCache.dateRange, cacheKey),
        gt(schema.ga4AnalyticsCache.expiresAt, new Date())
      ),
    });

    if (cached && cached.dataJson) {
      return {
        ...(cached.dataJson as any),
        connected: true,
        isDemoData: false,
      };
    }
  }

  try {
    // 2. Fetch Real GA4 Data via Data API v1beta
    // Calculate comparison date range (same length immediately prior)
    const startMs = new Date(actualStartDate).getTime();
    const endMs = new Date(actualEndDate).getTime();
    const is24h = Math.round((endMs - startMs) / (86400 * 1000)) <= 1;
    const durationMs = Math.max(endMs - startMs, 86400 * 1000);
    const compEndStr = new Date(startMs - 86400 * 1000).toISOString().split('T')[0];
    const compStartStr = is24h
      ? compEndStr
      : new Date(startMs - durationMs - 86400 * 1000).toISOString().split('T')[0];

    const isSingleDay = actualStartDate === actualEndDate;
    const timeDimensionName = is24h ? (isSingleDay ? 'hour' : 'dateHour') : 'date';

    // Primary Overview & Time Series Report
    const primaryReportPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: timeDimensionName }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
      orderBys: [{ dimension: { dimensionName: timeDimensionName }, desc: false }],
    });

    // Comparison Report (if requested)
    const compReportPromise = compare
      ? callGA4RunReport(token!, propertyId, {
          dateRanges: [{ startDate: compStartStr, endDate: compEndStr }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'totalUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
            { name: 'conversions' },
          ],
        }).catch((err) => {
          console.warn('[GA4 Comparison Query Warning]:', err.message);
          return null;
        })
      : Promise.resolve(null);

    // Traffic Sources Report
    const channelsPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'engagementRate' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }).catch(() => null);

    // Top Pages Report
    const pagesPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15,
    }).catch(() => null);

    // Countries Report
    const countriesPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: 'country' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    }).catch(() => null);

    // Devices Report
    const devicesPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 5,
    }).catch(() => null);

    // Events Report
    const eventsPromise = callGA4RunReport(token!, propertyId, {
      dateRanges: [{ startDate: actualStartDate, endDate: actualEndDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 12,
    }).catch(() => null);

    // Await all parallel reports
    const [
      primaryRes,
      compRes,
      channelsRes,
      pagesRes,
      countriesRes,
      devicesRes,
      eventsRes,
    ] = await Promise.all([
      primaryReportPromise,
      compReportPromise,
      channelsPromise,
      pagesPromise,
      countriesPromise,
      devicesPromise,
      eventsPromise,
    ]);

    // Parse Primary Time Series and Aggregates
    let totalActiveUsers = 0;
    let totalUsers = 0;
    let totalSessions = 0;
    let totalPageViews = 0;
    let totalEngagementDuration = 0;
    let totalConversions = 0;
    let weightedBounceRateSum = 0;
    let weightedEngagementRateSum = 0;

    const timeSeries: Array<{
      date: string;
      formattedDate: string;
      activeUsers: number;
      sessions: number;
      pageViews: number;
      bounceRate: number;
    }> = [];

    if (Array.isArray(primaryRes?.rows)) {
      for (const row of primaryRes.rows) {
        const rawDate = row.dimensionValues?.[0]?.value || '';
        let formattedDate = rawDate;
        let dateVal = rawDate;

        if (is24h) {
          if (rawDate.length === 10) {
            // dateHour: YYYYMMDDHH -> e.g. "14:00"
            const hour = rawDate.slice(8, 10);
            formattedDate = `${hour}:00`;
            dateVal = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)} ${hour}:00`;
          } else {
            const hourNum = rawDate.padStart(2, '0');
            formattedDate = `${hourNum}:00`;
            dateVal = `${actualStartDate} ${hourNum}:00`;
          }
        } else if (rawDate.length === 8) {
          const iso = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          formattedDate = formatDateLabel(iso);
          dateVal = iso;
        }

        const uActive = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const uTotal = parseInt(row.metricValues?.[1]?.value || '0', 10);
        const sCount = parseInt(row.metricValues?.[2]?.value || '0', 10);
        const pvCount = parseInt(row.metricValues?.[3]?.value || '0', 10);
        const engRate = parseFloat(row.metricValues?.[4]?.value || '0') * 100; // 0-1 to 0-100%
        const avgDur = parseFloat(row.metricValues?.[5]?.value || '0');
        const bounceRate = parseFloat(row.metricValues?.[6]?.value || '0') * 100;
        const convCount = parseInt(row.metricValues?.[7]?.value || '0', 10);

        totalActiveUsers = Math.max(totalActiveUsers, uActive);
        totalUsers += uTotal;
        totalSessions += sCount;
        totalPageViews += pvCount;
        totalEngagementDuration += avgDur * sCount;
        totalConversions += convCount;
        weightedBounceRateSum += bounceRate * sCount;
        weightedEngagementRateSum += engRate * sCount;

        timeSeries.push({
          date: dateVal,
          formattedDate,
          activeUsers: uActive,
          sessions: sCount,
          pageViews: pvCount,
          bounceRate: Math.round(bounceRate * 10) / 10,
        });
      }
    }

    // Totals fallback if row summing has unique visitor nuances
    const overallAvgBounce =
      totalSessions > 0 ? Math.round((weightedBounceRateSum / totalSessions) * 10) / 10 : 0;
    const overallEngagementRate =
      totalSessions > 0 ? Math.round((weightedEngagementRateSum / totalSessions) * 10) / 10 : 0;
    const overallAvgDuration =
      totalSessions > 0 ? Math.round(totalEngagementDuration / totalSessions) : 0;

    // Parse Comparison
    let comparisonData: GA4MetricOverview['comparison'] | undefined = undefined;
    if (compRes?.rows?.[0]) {
      const cRow = compRes.rows[0];
      const cActive = parseInt(cRow.metricValues?.[0]?.value || '0', 10);
      const cTotal = parseInt(cRow.metricValues?.[1]?.value || '0', 10);
      const cSessions = parseInt(cRow.metricValues?.[2]?.value || '0', 10);
      const cPv = parseInt(cRow.metricValues?.[3]?.value || '0', 10);
      const cEngRate = Math.round(parseFloat(cRow.metricValues?.[4]?.value || '0') * 1000) / 10;
      const cDuration = Math.round(parseFloat(cRow.metricValues?.[5]?.value || '0'));
      const cBounce = Math.round(parseFloat(cRow.metricValues?.[6]?.value || '0') * 1000) / 10;
      const cConv = parseInt(cRow.metricValues?.[7]?.value || '0', 10);

      comparisonData = {
        activeUsers: cActive,
        totalUsers: cTotal,
        sessions: cSessions,
        pageViews: cPv,
        engagementRate: cEngRate,
        averageSessionDuration: cDuration,
        bounceRate: cBounce,
        conversions: cConv,
        activeUsersDeltaPct: calculateDeltaPct(totalActiveUsers, cActive),
        totalUsersDeltaPct: calculateDeltaPct(totalUsers, cTotal),
        sessionsDeltaPct: calculateDeltaPct(totalSessions, cSessions),
        pageViewsDeltaPct: calculateDeltaPct(totalPageViews, cPv),
        engagementRateDeltaPct: calculateDeltaPct(overallEngagementRate, cEngRate),
        avgDurationDeltaPct: calculateDeltaPct(overallAvgDuration, cDuration),
        bounceRateDeltaPct: calculateDeltaPct(overallAvgBounce, cBounce, true), // inverted
        conversionsDeltaPct: calculateDeltaPct(totalConversions, cConv),
      };
    }

    // Parse Channels
    const trafficSources: GA4MetricOverview['trafficSources'] = [];
    if (Array.isArray(channelsRes?.rows)) {
      for (const row of channelsRes.rows) {
        const channel = row.dimensionValues?.[0]?.value || 'Other';
        const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const activeUsers = parseInt(row.metricValues?.[1]?.value || '0', 10);
        const engRate = Math.round(parseFloat(row.metricValues?.[2]?.value || '0') * 1000) / 10;
        const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 1000) / 10 : 0;

        trafficSources.push({
          channel,
          sessions,
          activeUsers,
          engagementRate: engRate,
          percentage,
        });
      }
    }

    // Parse Top Pages
    const topPages: GA4MetricOverview['topPages'] = [];
    if (Array.isArray(pagesRes?.rows)) {
      for (const row of pagesRes.rows) {
        const path = row.dimensionValues?.[0]?.value || '/';
        const pageViews = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const activeUsers = parseInt(row.metricValues?.[1]?.value || '0', 10);
        const totalEngTime = parseFloat(row.metricValues?.[2]?.value || '0');
        const avgEngTime = activeUsers > 0 ? Math.round(totalEngTime / activeUsers) : 0;

        topPages.push({
          path,
          pageViews,
          activeUsers,
          averageEngagementTime: avgEngTime,
        });
      }
    }

    // Parse Top Countries
    const topCountries: GA4MetricOverview['topCountries'] = [];
    if (Array.isArray(countriesRes?.rows)) {
      for (const row of countriesRes.rows) {
        const country = row.dimensionValues?.[0]?.value || 'Unknown';
        const activeUsers = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const sessions = parseInt(row.metricValues?.[1]?.value || '0', 10);
        const percentage = totalActiveUsers > 0 ? Math.round((activeUsers / totalActiveUsers) * 1000) / 10 : 0;

        topCountries.push({
          country,
          countryName: getCountryName(country),
          activeUsers,
          sessions,
          percentage,
        });
      }
    }

    // Parse Devices
    const devices: GA4MetricOverview['devices'] = [];
    if (Array.isArray(devicesRes?.rows)) {
      for (const row of devicesRes.rows) {
        const device = row.dimensionValues?.[0]?.value || 'desktop';
        const activeUsers = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const sessions = parseInt(row.metricValues?.[1]?.value || '0', 10);
        const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 1000) / 10 : 0;

        devices.push({
          device,
          activeUsers,
          sessions,
          percentage,
        });
      }
    }

    // Parse Events
    const topEvents: GA4MetricOverview['topEvents'] = [];
    if (Array.isArray(eventsRes?.rows)) {
      for (const row of eventsRes.rows) {
        const eventName = row.dimensionValues?.[0]?.value || 'event';
        const eventCount = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const userCount = parseInt(row.metricValues?.[1]?.value || '0', 10);

        topEvents.push({
          eventName,
          eventCount,
          totalUsers: userCount,
        });
      }
    }

    const overviewResult: GA4MetricOverview = {
      activeUsers: totalActiveUsers || (timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].activeUsers : 0),
      totalUsers: Math.max(totalUsers, totalActiveUsers),
      sessions: totalSessions,
      pageViews: totalPageViews,
      engagementRate: overallEngagementRate,
      averageSessionDuration: overallAvgDuration,
      bounceRate: overallAvgBounce,
      conversions: totalConversions,
      comparison: comparisonData,
      timeSeries,
      trafficSources,
      topPages,
      topCountries,
      devices,
      topEvents,
      connected: true,
      isDemoData: false,
      selectedProperty: {
        propertyId,
        displayName: tokenRecord?.selectedPropertyName || `Property ${propertyId}`,
      },
    };

    // 3. Cache Result in database (1 hour TTL)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    try {
      const existingCache = await db.query.ga4AnalyticsCache.findFirst({
        where: and(
          eq(schema.ga4AnalyticsCache.propertyId, propertyId),
          eq(schema.ga4AnalyticsCache.dateRange, cacheKey)
        ),
      });

      if (existingCache) {
        await db
          .update(schema.ga4AnalyticsCache)
          .set({ dataJson: overviewResult, expiresAt })
          .where(eq(schema.ga4AnalyticsCache.id, existingCache.id));
      } else {
        await db.insert(schema.ga4AnalyticsCache).values({
          propertyId,
          dateRange: cacheKey,
          dataJson: overviewResult,
          expiresAt,
        });
      }
    } catch (cacheErr: any) {
      console.warn('[GA4 Cache Insert Warning]:', cacheErr.message);
    }

    return overviewResult;
  } catch (err: any) {
    console.error('[GA4 Data API Execution Failure]:', err.message);

    // If live API fails (e.g. invalid permissions or property not fully populated yet),
    // return benchmark dataset clearly flagged as demo data so user gets a seamless dashboard experience
    return generateBenchmarkGA4Overview({
      propertyId,
      displayName: tokenRecord?.selectedPropertyName || `Property ${propertyId}`,
      connected: isConnected,
      startDate: actualStartDate,
      endDate: actualEndDate,
      compare,
      errorNotice: err.message,
    });
  }
}

/**
 * Calculate percentage delta between current and previous periods
 */
function calculateDeltaPct(current: number, previous: number, inverted = false): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta * 10) / 10;
  return inverted ? -rounded : rounded;
}

/**
 * Format date string into human friendly label
 */
function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Map country code or name
 */
function getCountryName(codeOrName: string): string {
  const map: Record<string, string> = {
    US: 'United States',
    IN: 'India',
    GB: 'United Kingdom',
    CA: 'Canada',
    DE: 'Germany',
    FR: 'France',
    AU: 'Australia',
    BR: 'Brazil',
    JP: 'Japan',
    NL: 'Netherlands',
  };
  return map[codeOrName.toUpperCase()] || codeOrName;
}

/**
 * Generate realistic benchmark Google Analytics 4 dataset
 * Used when OAuth has not yet been connected or during setup exploration
 */
function generateBenchmarkGA4Overview(options: {
  propertyId: string;
  displayName: string;
  connected: boolean;
  startDate: string;
  endDate: string;
  compare: boolean;
  errorNotice?: string;
}): GA4MetricOverview {
  const start = new Date(options.startDate);
  const end = new Date(options.endDate);
  const daysDiff = Math.max(0, Math.round((end.getTime() - start.getTime()) / (86400 * 1000)));
  const is24h = daysDiff <= 1;

  const timeSeries: GA4MetricOverview['timeSeries'] = [];

  if (is24h) {
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = `${String(hour).padStart(2, '0')}:00`;
      const isPeak = hour >= 9 && hour <= 21;
      const baseHourSessions = isPeak ? 14 : 3;
      const randomVar = 0.85 + Math.sin(hour * 0.5) * 0.2;
      const sCount = Math.max(1, Math.round(baseHourSessions * randomVar));
      const uActive = Math.max(1, Math.round(sCount * 0.75));
      const pvCount = Math.round(sCount * (2.0 + Math.cos(hour * 0.4) * 0.3));
      const bounce = Math.round((36.0 + Math.sin(hour * 0.6) * 4.0) * 10) / 10;

      timeSeries.push({
        date: hourStr,
        formattedDate: hourStr,
        activeUsers: uActive,
        sessions: sCount,
        pageViews: pvCount,
        bounceRate: bounce,
      });
    }
  } else {
    let baseUsers = 180;
    let baseSessions = 240;

    for (let i = 0; i <= daysDiff; i++) {
      const d = new Date(start.getTime() + i * 86400 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const factor = isWeekend ? 0.75 : 1.15;
      const randomVar = 0.9 + Math.sin(i * 0.4) * 0.15;

      const uActive = Math.round(baseUsers * factor * randomVar);
      const sCount = Math.round(baseSessions * factor * randomVar);
      const pvCount = Math.round(sCount * (2.1 + Math.cos(i * 0.3) * 0.3));
      const bounce = Math.round((38.5 + Math.sin(i * 0.5) * 4.2) * 10) / 10;

      timeSeries.push({
        date: dateStr,
        formattedDate: formatDateLabel(dateStr),
        activeUsers: uActive,
        sessions: sCount,
        pageViews: pvCount,
        bounceRate: bounce,
      });
    }
  }

  const totalSessions = timeSeries.reduce((acc, curr) => acc + curr.sessions, 0);
  const totalPageViews = timeSeries.reduce((acc, curr) => acc + curr.pageViews, 0);
  const totalActiveUsers = Math.round(totalSessions * 0.68);
  const totalUsers = Math.round(totalActiveUsers * 1.25);
  const totalConversions = Math.round(totalSessions * 0.046);

  return {
    activeUsers: totalActiveUsers,
    totalUsers,
    sessions: totalSessions,
    pageViews: totalPageViews,
    engagementRate: 64.8,
    averageSessionDuration: 138, // 2m 18s
    bounceRate: 35.2,
    conversions: totalConversions,
    comparison: options.compare
      ? {
          activeUsers: Math.round(totalActiveUsers * 0.88),
          totalUsers: Math.round(totalUsers * 0.86),
          sessions: Math.round(totalSessions * 0.89),
          pageViews: Math.round(totalPageViews * 0.87),
          engagementRate: 61.2,
          averageSessionDuration: 124,
          bounceRate: 38.8,
          conversions: Math.round(totalConversions * 0.82),
          activeUsersDeltaPct: 13.6,
          totalUsersDeltaPct: 16.3,
          sessionsDeltaPct: 12.4,
          pageViewsDeltaPct: 14.9,
          engagementRateDeltaPct: 5.9,
          avgDurationDeltaPct: 11.3,
          bounceRateDeltaPct: 9.3, // bounce rate decreased (improved)
          conversionsDeltaPct: 22.0,
        }
      : undefined,
    timeSeries,
    trafficSources: [
      { channel: 'Organic Search', sessions: Math.round(totalSessions * 0.48), activeUsers: Math.round(totalActiveUsers * 0.49), engagementRate: 68.4, percentage: 48.0 },
      { channel: 'Direct', sessions: Math.round(totalSessions * 0.24), activeUsers: Math.round(totalActiveUsers * 0.23), engagementRate: 61.2, percentage: 24.0 },
      { channel: 'Referral', sessions: Math.round(totalSessions * 0.14), activeUsers: Math.round(totalActiveUsers * 0.13), engagementRate: 71.5, percentage: 14.0 },
      { channel: 'Organic Social', sessions: Math.round(totalSessions * 0.09), activeUsers: Math.round(totalActiveUsers * 0.10), engagementRate: 53.8, percentage: 9.0 },
      { channel: 'Email', sessions: Math.round(totalSessions * 0.05), activeUsers: Math.round(totalActiveUsers * 0.05), engagementRate: 74.2, percentage: 5.0 },
    ],
    topPages: [
      { path: '/', pageViews: Math.round(totalPageViews * 0.32), activeUsers: Math.round(totalActiveUsers * 0.41), averageEngagementTime: 92 },
      { path: '/blog/optimizing-nextjs-core-web-vitals', pageViews: Math.round(totalPageViews * 0.22), activeUsers: Math.round(totalActiveUsers * 0.28), averageEngagementTime: 214 },
      { path: '/blog/google-analytics-4-custom-events-guide', pageViews: Math.round(totalPageViews * 0.17), activeUsers: Math.round(totalActiveUsers * 0.21), averageEngagementTime: 185 },
      { path: '/about', pageViews: Math.round(totalPageViews * 0.11), activeUsers: Math.round(totalActiveUsers * 0.14), averageEngagementTime: 65 },
      { path: '/contact', pageViews: Math.round(totalPageViews * 0.08), activeUsers: Math.round(totalActiveUsers * 0.09), averageEngagementTime: 54 },
      { path: '/category/performance', pageViews: Math.round(totalPageViews * 0.06), activeUsers: Math.round(totalActiveUsers * 0.08), averageEngagementTime: 78 },
      { path: '/privacy-policy', pageViews: Math.round(totalPageViews * 0.04), activeUsers: Math.round(totalActiveUsers * 0.05), averageEngagementTime: 42 },
    ],
    topCountries: [
      { country: 'US', countryName: 'United States', activeUsers: Math.round(totalActiveUsers * 0.44), sessions: Math.round(totalSessions * 0.43), percentage: 44.0 },
      { country: 'IN', countryName: 'India', activeUsers: Math.round(totalActiveUsers * 0.21), sessions: Math.round(totalSessions * 0.20), percentage: 21.0 },
      { country: 'GB', countryName: 'United Kingdom', activeUsers: Math.round(totalActiveUsers * 0.12), sessions: Math.round(totalSessions * 0.13), percentage: 12.0 },
      { country: 'CA', countryName: 'Canada', activeUsers: Math.round(totalActiveUsers * 0.08), sessions: Math.round(totalSessions * 0.08), percentage: 8.0 },
      { country: 'DE', countryName: 'Germany', activeUsers: Math.round(totalActiveUsers * 0.06), sessions: Math.round(totalSessions * 0.06), percentage: 6.0 },
      { country: 'AU', countryName: 'Australia', activeUsers: Math.round(totalActiveUsers * 0.05), sessions: Math.round(totalSessions * 0.05), percentage: 5.0 },
      { country: 'FR', countryName: 'France', activeUsers: Math.round(totalActiveUsers * 0.04), sessions: Math.round(totalSessions * 0.05), percentage: 4.0 },
    ],
    devices: [
      { device: 'desktop', activeUsers: Math.round(totalActiveUsers * 0.58), sessions: Math.round(totalSessions * 0.57), percentage: 57.0 },
      { device: 'mobile', activeUsers: Math.round(totalActiveUsers * 0.39), sessions: Math.round(totalSessions * 0.40), percentage: 40.0 },
      { device: 'tablet', activeUsers: Math.round(totalActiveUsers * 0.03), sessions: Math.round(totalSessions * 0.03), percentage: 3.0 },
    ],
    topEvents: [
      { eventName: 'page_view', eventCount: totalPageViews, totalUsers: totalActiveUsers },
      { eventName: 'user_engagement', eventCount: Math.round(totalPageViews * 1.8), totalUsers: totalActiveUsers },
      { eventName: 'session_start', eventCount: totalSessions, totalUsers: totalActiveUsers },
      { eventName: 'scroll', eventCount: Math.round(totalPageViews * 0.65), totalUsers: Math.round(totalActiveUsers * 0.72) },
      { eventName: 'first_visit', eventCount: Math.round(totalUsers * 0.62), totalUsers: Math.round(totalUsers * 0.62) },
      { eventName: 'click', eventCount: Math.round(totalPageViews * 0.42), totalUsers: Math.round(totalActiveUsers * 0.51) },
      { eventName: 'generate_lead', eventCount: totalConversions, totalUsers: totalConversions },
    ],
    connected: options.connected,
    isDemoData: true,
    selectedProperty: {
      propertyId: options.propertyId,
      displayName: options.displayName,
    },
  };
}
