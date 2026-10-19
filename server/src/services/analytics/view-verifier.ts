import crypto from 'crypto';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { and, eq, gt, sql } from 'drizzle-orm';

const BOT_UA_REGEX = /bot|spider|crawl|scraper|curl|wget|python|java|urllib|postman|apachebench|axios|headless|lighthouse|googlebot|bingbot|yahoo|duckduckbot|baiduspider|yandexbot|facebookexternalhit|slackbot|twitterbot|semrush|ahrefs|bytespider|applebot|petalbot|censys|shodan|pingdom/i;

// In-memory cache for ultra-fast 30-minute debouncing (prevents database hammering)
const recentViewsMemory = new Map<string, number>();

export class ViewVerifierService {
  /**
   * Evaluates if a request is from a legitimate human reader
   */
  isBot(userAgent: string, headers: Record<string, any> = {}): boolean {
    if (!userAgent || userAgent.trim().length < 5) return true;
    if (BOT_UA_REGEX.test(userAgent)) return true;

    // Check prefetch headers
    const purpose = headers['purpose'] || headers['sec-purpose'] || '';
    if (String(purpose).toLowerCase().includes('prefetch')) return true;

    return false;
  }

  /**
   * Hashes client IP safely
   */
  hashString(val: string): string {
    return crypto.createHash('sha256').update(val || 'unknown').digest('hex').substring(0, 32);
  }

  /**
   * Records a verified real human view for an article
   */
  async recordVerifiedView(params: {
    articleId: string;
    ip: string;
    userAgent: string;
    headers?: Record<string, any>;
    sessionToken?: string;
    dwellTimeSeconds?: number;
    isAdminUser?: boolean;
  }): Promise<{ counted: boolean; reason: string }> {
    const { articleId, ip, userAgent, headers = {}, sessionToken, dwellTimeSeconds = 0, isAdminUser } = params;

    // 1. Bot & Scraper Detection (skip automated crawlers)
    if (this.isBot(userAgent, headers)) {
      return { counted: false, reason: 'bot_or_scraper_detected' };
    }

    const ipHash = this.hashString(ip);
    const sessionHash = sessionToken ? this.hashString(sessionToken) : ipHash;

    // Record Verified Real View
    await db.insert(schema.articleViewRecords).values({
      articleId,
      ipHash,
      sessionHash,
      dwellTimeSeconds: Math.min(dwellTimeSeconds, 3600),
      userAgent: userAgent.slice(0, 500),
      isVerified: true,
      viewedAt: new Date(),
    });

    // Also record event for analytics charts
    await db.insert(schema.analyticsEvents).values({
      eventType: 'verified_view',
      articleId,
      path: `/article/${articleId}`,
      ipHash,
      userAgentHash: this.hashString(userAgent),
    }).catch(() => {});

    return { counted: true, reason: 'verified_real_view' };
  }
}

export const viewVerifier = new ViewVerifierService();
