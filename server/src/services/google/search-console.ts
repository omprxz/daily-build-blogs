import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { encryptApiKey, decryptApiKey } from '../../utils/security.js';
import { eq, desc, and, gt } from 'drizzle-orm';

export interface SearchAnalyticsRow {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys: string[];
}

export interface SearchConsoleOverview {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  comparison?: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    clicksDeltaPct: number;
    impressionsDeltaPct: number;
    ctrDeltaPct: number;
    positionDeltaPct: number;
  };
  timeSeries: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topCountries: Array<{
    country: string;
    countryName: string;
    clicks: number;
    impressions: number;
    ctr: number;
  }>;
  devices: Array<{
    device: string;
    clicks: number;
    impressions: number;
    ctr: number;
    percentage: number;
  }>;
  connected: boolean;
  isDemoData?: boolean;
  errorNotice?: string;
  selectedProperty?: string;
}

const SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
  'profile',
];

/**
 * Generate Google OAuth 2.0 Authorization URL
 */
export function getGoogleAuthUrl(state: string = 'sites_gsc_auth'): string {
  const clientId = config.google.clientId;
  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured in GOOGLE_CLIENT_ID environment variable.');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', config.google.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('state', state);

  return authUrl.toString();
}

/**
 * Exchange Authorization Code for Access & Refresh Tokens
 */
export async function exchangeOAuthCode(code: string): Promise<{ email: string; success: boolean }> {
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

  // Fetch user info to store authorized email
  let userEmail = 'authenticated-google-user';
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      const userData = (await userRes.json()) as any;
      if (userData.email) userEmail = userData.email;
    }
  } catch (userErr: any) {
    console.warn('[Google UserInfo Warning]:', userErr.message);
  }

  // Encrypt refresh token
  const encryptedRefresh = refreshToken ? encryptApiKey(refreshToken) : null;

  // Save or update token in database
  const existing = await db.query.googleSearchConsoleTokens.findFirst({
    orderBy: [desc(schema.googleSearchConsoleTokens.createdAt)],
  });

  if (existing) {
    await db
      .update(schema.googleSearchConsoleTokens)
      .set({
        email: userEmail,
        accessToken,
        refreshToken: encryptedRefresh || existing.refreshToken,
        tokenExpiry: expiryDate,
        scopes: tokenData.scope || SCOPES.join(' '),
        isConnected: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleSearchConsoleTokens.id, existing.id));
  } else {
    await db.insert(schema.googleSearchConsoleTokens).values({
      email: userEmail,
      accessToken,
      refreshToken: encryptedRefresh,
      tokenExpiry: expiryDate,
      scopes: tokenData.scope || SCOPES.join(' '),
      isConnected: true,
    });
  }

  return { email: userEmail, success: true };
}

/**
 * Retrieve a valid Google Access Token (auto-refreshing if expired)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokenRecord = await db.query.googleSearchConsoleTokens.findFirst({
    where: eq(schema.googleSearchConsoleTokens.isConnected, true),
    orderBy: [desc(schema.googleSearchConsoleTokens.updatedAt)],
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

  // Otherwise, refresh using refreshToken
  if (!tokenRecord.refreshToken) {
    return tokenRecord.accessToken; // fallback to last token
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
      console.warn('[GSC Token Refresh Failed]:', await refreshRes.text());
      return tokenRecord.accessToken;
    }

    const refreshed = (await refreshRes.json()) as any;
    const newAccessToken = refreshed.access_token;
    const expiresIn = refreshed.expires_in || 3600;
    const newExpiry = new Date(Date.now() + (expiresIn - 60) * 1000);

    await db
      .update(schema.googleSearchConsoleTokens)
      .set({
        accessToken: newAccessToken,
        tokenExpiry: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleSearchConsoleTokens.id, tokenRecord.id));

    return newAccessToken;
  } catch (refreshErr: any) {
    console.error('[GSC Refresh Error]:', refreshErr.message);
    return tokenRecord.accessToken;
  }
}

/**
 * Get current Google Search Console Connection Status
 */
export async function getSearchConsoleStatus(): Promise<{
  isConnected: boolean;
  email: string | null;
  isConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUri: string;
}> {
  const tokenRecord = await db.query.googleSearchConsoleTokens.findFirst({
    where: eq(schema.googleSearchConsoleTokens.isConnected, true),
    orderBy: [desc(schema.googleSearchConsoleTokens.updatedAt)],
  });

  const clientIdConfigured = !!config.google.clientId;
  const clientSecretConfigured = !!config.google.clientSecret;

  return {
    isConnected: !!tokenRecord && tokenRecord.isConnected,
    email: tokenRecord?.email || null,
    isConfigured: clientIdConfigured && clientSecretConfigured,
    clientIdConfigured,
    clientSecretConfigured,
    redirectUri: config.google.redirectUri,
  };
}

/**
 * Disconnect Google Search Console Account
 */
export async function disconnectSearchConsole(): Promise<void> {
  await db
    .update(schema.googleSearchConsoleTokens)
    .set({ isConnected: false, updatedAt: new Date() });
}

/**
 * List verified website properties from user's Google Search Console account
 */
export async function getVerifiedProperties(): Promise<
  Array<{ siteUrl: string; permissionLevel: string }>
> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return [
      { siteUrl: 'sc-domain:blogs.dailybuild.tech', permissionLevel: 'siteOwner' },
      { siteUrl: 'https://blogs.dailybuild.tech/', permissionLevel: 'siteOwner' },
    ];
  }

  const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn('[GSC Sites Fetch Error]:', errText);
    return [
      { siteUrl: 'sc-domain:blogs.dailybuild.tech', permissionLevel: 'siteOwner' },
      { siteUrl: 'https://blogs.dailybuild.tech/', permissionLevel: 'siteOwner' },
    ];
  }

  const data = (await response.json()) as any;
  const siteEntries = data.siteEntry || [];
  return siteEntries.map((e: any) => ({
    siteUrl: e.siteUrl,
    permissionLevel: e.permissionLevel || 'siteOwner',
  }));
}

/**
 * Query Search Analytics data from Google Search Console API
 */
export async function querySearchAnalytics(
  sitePropertyUrl: string,
  options: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    compare?: boolean;
    forceRefresh?: boolean;
  }
): Promise<SearchConsoleOverview> {
  const accessToken = await getValidAccessToken();

  // 1. If not connected, return realistic sample analytics so UI is fully visual and interactive
  if (!accessToken) {
    return generateDemoSearchAnalytics(sitePropertyUrl, options.startDate, options.endDate);
  }

  // 2. Check Cache
  const cacheKey = `${sitePropertyUrl}:${options.startDate}:${options.endDate}:${options.compare ? 'comp' : 'std'}`;
  if (!options.forceRefresh) {
    try {
      const cached = await db.query.searchConsoleCache.findFirst({
        where: and(
          eq(schema.searchConsoleCache.siteUrl, sitePropertyUrl),
          eq(schema.searchConsoleCache.dateRange, cacheKey),
          gt(schema.searchConsoleCache.expiresAt, new Date())
        ),
      });

      if (cached && cached.dataJson) {
        return cached.dataJson as SearchConsoleOverview;
      }
    } catch (cacheErr: any) {
      console.warn('[GSC Cache Check Warning]:', cacheErr.message);
    }
  }

  try {
    const encodedSite = encodeURIComponent(sitePropertyUrl);
    const queryUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

    // A. Query time-series by date
    const dateRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['date'],
        dataState: 'all',
        rowLimit: 1000,
      }),
    });

    // B. Query top queries
    const queriesRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['query'],
        dataState: 'all',
        rowLimit: 50,
      }),
    });

    // C. Query top pages
    const pagesRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['page'],
        dataState: 'all',
        rowLimit: 50,
      }),
    });

    // D. Query countries & devices
    const countryRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['country'],
        dataState: 'all',
        rowLimit: 20,
      }),
    });

    const deviceRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ['device'],
        dataState: 'all',
        rowLimit: 10,
      }),
    });

    const dateData = (dateRes.ok ? await dateRes.json() : { rows: [] }) as any;
    const queriesData = (queriesRes.ok ? await queriesRes.json() : { rows: [] }) as any;
    const pagesData = (pagesRes.ok ? await pagesRes.json() : { rows: [] }) as any;
    const countryData = (countryRes.ok ? await countryRes.json() : { rows: [] }) as any;
    const deviceData = (deviceRes.ok ? await deviceRes.json() : { rows: [] }) as any;

    const dateRows = dateData.rows || [];
    let totalClicks = 0;
    let totalImpressions = 0;
    let weightedCtrSum = 0;
    let weightedPosSum = 0;

    const timeSeries = dateRows.map((r: any) => {
      const clicks = r.clicks || 0;
      const impressions = r.impressions || 0;
      const ctr = parseFloat(((r.ctr || 0) * 100).toFixed(2));
      const position = parseFloat((r.position || 0).toFixed(1));

      totalClicks += clicks;
      totalImpressions += impressions;
      weightedCtrSum += (r.ctr || 0) * impressions;
      weightedPosSum += (r.position || 0) * impressions;

      return {
        date: r.keys?.[0] || '',
        clicks,
        impressions,
        ctr,
        position,
      };
    });

    const avgCtr =
      totalImpressions > 0
        ? parseFloat(((weightedCtrSum / totalImpressions) * 100).toFixed(2))
        : 0;
    const avgPos =
      totalImpressions > 0
        ? parseFloat((weightedPosSum / totalImpressions).toFixed(1))
        : 0;

    const topQueries = (queriesData.rows || []).map((r: any) => ({
      query: r.keys?.[0] || 'Unknown Query',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
      position: parseFloat((r.position || 0).toFixed(1)),
    }));

    const topPages = (pagesData.rows || []).map((r: any) => ({
      page: r.keys?.[0] || '/',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
      position: parseFloat((r.position || 0).toFixed(1)),
    }));

    const topCountries = (countryData.rows || []).map((r: any) => ({
      country: (r.keys?.[0] || 'ZZ').toUpperCase(),
      countryName: resolveCountryName((r.keys?.[0] || 'ZZ').toUpperCase()),
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
    }));

    const deviceRows = deviceData.rows || [];
    const devices = deviceRows.map((r: any) => {
      const clicks = r.clicks || 0;
      const impressions = r.impressions || 0;
      return {
        device: r.keys?.[0] || 'Desktop',
        clicks,
        impressions,
        ctr: parseFloat(((r.ctr || 0) * 100).toFixed(2)),
        percentage: totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0,
      };
    });

    // Build comparison if requested
    let comparison: any = undefined;
    if (options.compare) {
      const daysCount = Math.max(
        0,
        Math.round(
          (new Date(options.endDate).getTime() - new Date(options.startDate).getTime()) /
            (86400 * 1000)
        )
      );
      const is24h = daysCount <= 1;
      const prevEnd = new Date(new Date(options.startDate).getTime() - 86400 * 1000);
      const prevStart = is24h
        ? prevEnd
        : new Date(prevEnd.getTime() - (daysCount - 1) * 86400 * 1000);

      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      try {
        const prevRes = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: prevStartStr,
            endDate: prevEndStr,
            dimensions: ['date'],
            dataState: 'all',
            rowLimit: 1000,
          }),
        });

        if (prevRes.ok) {
          const prevData = (await prevRes.json()) as any;
          let prevClicks = 0;
          let prevImpressions = 0;
          let prevCtrSum = 0;
          let prevPosSum = 0;

          for (const r of prevData.rows || []) {
            prevClicks += r.clicks || 0;
            prevImpressions += r.impressions || 0;
            prevCtrSum += (r.ctr || 0) * (r.impressions || 0);
            prevPosSum += (r.position || 0) * (r.impressions || 0);
          }

          const prevAvgCtr =
            prevImpressions > 0
              ? parseFloat(((prevCtrSum / prevImpressions) * 100).toFixed(2))
              : 0;
          const prevAvgPos =
            prevImpressions > 0
              ? parseFloat((prevPosSum / prevImpressions).toFixed(1))
              : 0;

          comparison = {
            totalClicks: prevClicks,
            totalImpressions: prevImpressions,
            averageCtr: prevAvgCtr,
            averagePosition: prevAvgPos,
            clicksDeltaPct: calcDeltaPct(totalClicks, prevClicks),
            impressionsDeltaPct: calcDeltaPct(totalImpressions, prevImpressions),
            ctrDeltaPct: calcDeltaPct(avgCtr, prevAvgCtr),
            positionDeltaPct: calcDeltaPct(avgPos, prevAvgPos, true), // for position, lower is better
          };
        }
      } catch (prevErr: any) {
        console.warn('[GSC Prev Comparison Warning]:', prevErr.message);
      }
    }

    const result: SearchConsoleOverview = {
      totalClicks,
      totalImpressions,
      averageCtr: avgCtr,
      averagePosition: avgPos,
      comparison,
      timeSeries,
      topQueries,
      topPages,
      topCountries,
      devices,
      connected: true,
      isDemoData: false,
      selectedProperty: sitePropertyUrl,
    };

    // Cache result in DB for 1 hour
    try {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      const existing = await db.query.searchConsoleCache.findFirst({
        where: and(
          eq(schema.searchConsoleCache.siteUrl, sitePropertyUrl),
          eq(schema.searchConsoleCache.dateRange, cacheKey)
        ),
      });

      if (existing) {
        await db
          .update(schema.searchConsoleCache)
          .set({ dataJson: result, expiresAt })
          .where(eq(schema.searchConsoleCache.id, existing.id));
      } else {
        await db.insert(schema.searchConsoleCache).values({
          siteUrl: sitePropertyUrl,
          dateRange: cacheKey,
          dataJson: result,
          expiresAt,
        });
      }
    } catch (saveCacheErr: any) {
      console.warn('[GSC Cache Save Warning]:', saveCacheErr.message);
    }

    return result;
  } catch (apiErr: any) {
    console.error('[GSC API Query Error]:', apiErr.message);
    // If real call fails, return demo data with error warning
    const fallback = generateDemoSearchAnalytics(sitePropertyUrl, options.startDate, options.endDate);
    return {
      ...fallback,
      errorNotice: apiErr.message,
      selectedProperty: sitePropertyUrl,
    };
  }
}

function calcDeltaPct(current: number, previous: number, lowerIsBetter = false): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  const pct = parseFloat((((current - previous) / previous) * 100).toFixed(1));
  return lowerIsBetter ? -pct : pct;
}

function resolveCountryName(code: string): string {
  const map: Record<string, string> = {
    USA: 'United States',
    IND: 'India',
    GBR: 'United Kingdom',
    DEU: 'Germany',
    CAN: 'Canada',
    FRA: 'France',
    AUS: 'Australia',
    JPN: 'Japan',
    NLD: 'Netherlands',
    SGP: 'Singapore',
  };
  return map[code] || code;
}

/**
 * Generates realistic sample Search Console telemetry for demonstration & pre-configured environments
 */
function generateDemoSearchAnalytics(
  propertyUrl: string,
  startDateStr: string,
  endDateStr: string
): SearchConsoleOverview {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const daysDiff = Math.max(0, Math.round((end.getTime() - start.getTime()) / (86400 * 1000)));
  const is24h = daysDiff <= 1;

  const timeSeries: SearchConsoleOverview['timeSeries'] = [];
  let totalClicks = 0;
  let totalImpressions = 0;

  if (is24h) {
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = `${String(hour).padStart(2, '0')}:00`;
      const baseHourClicks = hour >= 9 && hour <= 21 ? 9 : 2;
      const clicks = Math.max(1, Math.round(baseHourClicks + Math.sin(hour * 0.4) * 3 + Math.random() * 2));
      const impressions = Math.round(clicks * (17 + Math.cos(hour * 0.3) * 3));
      const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
      const position = parseFloat((11.4 + Math.sin(hour * 0.5) * 1.5).toFixed(1));

      totalClicks += clicks;
      totalImpressions += impressions;

      timeSeries.push({
        date: hourStr,
        clicks,
        impressions,
        ctr,
        position,
      });
    }
  } else {
    for (let i = 0; i <= daysDiff; i++) {
      const d = new Date(start.getTime() + i * 86400 * 1000);
      const dateStr = d.toISOString().split('T')[0];

      // Seed realistic curve
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseClicks = isWeekend ? 85 : 190;
      const clicks = Math.round(baseClicks + Math.sin(i * 0.4) * 45 + Math.random() * 20);
      const impressions = Math.round(clicks * (18 + Math.cos(i * 0.3) * 4));
      const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
      const position = parseFloat((11.4 + Math.sin(i * 0.5) * 1.8).toFixed(1));

      totalClicks += clicks;
      totalImpressions += impressions;

      timeSeries.push({
        date: dateStr,
        clicks,
        impressions,
        ctr,
        position,
      });
    }
  }

  const avgCtr = parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2));
  const avgPos = 12.1;

  const scale = is24h ? 0.05 : 1.0;

  const topQueries = [
    { query: 'linux ebpf kernel observability tools', clicks: Math.max(1, Math.round(842 * scale)), impressions: Math.max(10, Math.round(14200 * scale)), ctr: 5.93, position: 3.2 },
    { query: 'next.js 15 vs vite 6 server side rendering', clicks: Math.max(1, Math.round(610 * scale)), impressions: Math.max(10, Math.round(11950 * scale)), ctr: 5.10, position: 4.8 },
    { query: 'autonomous ai code generation workflows', clicks: Math.max(1, Math.round(524 * scale)), impressions: Math.max(10, Math.round(9800 * scale)), ctr: 5.35, position: 2.9 },
    { query: 'high performance postgresql jsonb indexing', clicks: Math.max(1, Math.round(432 * scale)), impressions: Math.max(10, Math.round(8400 * scale)), ctr: 5.14, position: 5.4 },
    { query: 'core web vitals largest contentful paint fix', clicks: Math.max(1, Math.round(395 * scale)), impressions: Math.max(10, Math.round(7920 * scale)), ctr: 4.99, position: 6.1 },
    { query: 'daily build technology publication', clicks: Math.max(1, Math.round(350 * scale)), impressions: Math.max(10, Math.round(4200 * scale)), ctr: 8.33, position: 1.1 },
    { query: 'distributed consensus algorithms in rust', clicks: Math.max(1, Math.round(280 * scale)), impressions: Math.max(10, Math.round(6300 * scale)), ctr: 4.44, position: 7.3 },
    { query: 'google pagespeed insights lighthouse api guide', clicks: Math.max(1, Math.round(245 * scale)), impressions: Math.max(10, Math.round(5600 * scale)), ctr: 4.38, position: 4.1 },
  ];

  const topPages = [
    { page: 'https://blogs.dailybuild.tech/article/linux-ebpf-probes-observability', clicks: Math.max(1, Math.round(980 * scale)), impressions: Math.max(10, Math.round(16500 * scale)), ctr: 5.94, position: 3.1 },
    { page: 'https://blogs.dailybuild.tech/article/vite-vs-nextjs-modern-web-stack', clicks: Math.max(1, Math.round(740 * scale)), impressions: Math.max(10, Math.round(13200 * scale)), ctr: 5.61, position: 4.2 },
    { page: 'https://blogs.dailybuild.tech/article/agentic-ai-workflow-automation', clicks: Math.max(1, Math.round(615 * scale)), impressions: Math.max(10, Math.round(11400 * scale)), ctr: 5.39, position: 3.8 },
    { page: 'https://blogs.dailybuild.tech/', clicks: Math.max(1, Math.round(540 * scale)), impressions: Math.max(10, Math.round(9800 * scale)), ctr: 5.51, position: 1.8 },
    { page: 'https://blogs.dailybuild.tech/category/engineering', clicks: Math.max(1, Math.round(320 * scale)), impressions: Math.max(10, Math.round(6100 * scale)), ctr: 5.25, position: 5.5 },
  ];

  const topCountries = [
    { country: 'USA', countryName: 'United States', clicks: Math.max(1, Math.round(1820 * scale)), impressions: Math.max(10, Math.round(32400 * scale)), ctr: 5.62 },
    { country: 'IND', countryName: 'India', clicks: Math.max(1, Math.round(940 * scale)), impressions: Math.max(10, Math.round(18900 * scale)), ctr: 4.97 },
    { country: 'GBR', countryName: 'United Kingdom', clicks: Math.max(1, Math.round(430 * scale)), impressions: Math.max(10, Math.round(7800 * scale)), ctr: 5.51 },
    { country: 'DEU', countryName: 'Germany', clicks: Math.max(1, Math.round(380 * scale)), impressions: Math.max(10, Math.round(6900 * scale)), ctr: 5.51 },
    { country: 'CAN', countryName: 'Canada', clicks: Math.max(1, Math.round(290 * scale)), impressions: Math.max(10, Math.round(5100 * scale)), ctr: 5.69 },
  ];

  const devices = [
    { device: 'Desktop', clicks: Math.round(totalClicks * 0.62), impressions: Math.round(totalImpressions * 0.58), ctr: 5.72, percentage: 62 },
    { device: 'Mobile', clicks: Math.round(totalClicks * 0.35), impressions: Math.round(totalImpressions * 0.39), ctr: 4.81, percentage: 35 },
    { device: 'Tablet', clicks: Math.round(totalClicks * 0.03), impressions: Math.round(totalImpressions * 0.03), ctr: 5.20, percentage: 3 },
  ];

  return {
    totalClicks,
    totalImpressions,
    averageCtr: avgCtr,
    averagePosition: avgPos,
    comparison: {
      totalClicks: Math.round(totalClicks * 0.88),
      totalImpressions: Math.round(totalImpressions * 0.84),
      averageCtr: 4.95,
      averagePosition: 13.4,
      clicksDeltaPct: 13.6,
      impressionsDeltaPct: 19.0,
      ctrDeltaPct: 7.3,
      positionDeltaPct: 9.7, // 9.7% improvement in average rank
    },
    timeSeries,
    topQueries,
    topPages,
    topCountries,
    devices,
    connected: false,
    isDemoData: true,
  };
}
