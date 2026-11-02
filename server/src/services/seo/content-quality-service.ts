import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq } from 'drizzle-orm';
import { config } from '../../config/index.js';

export interface VerifiedSourceItem {
  url: string;
  sourceDomain: string;
  httpStatus: number;
  isReachable: boolean;
  responseTimeMs: number;
  extractedClaim?: string;
  supportAssessment: 'strongly_supported' | 'partially_supported' | 'unsupported_or_broken' | 'unverifiable';
  notes: string;
}

export interface ExtractedFactClaim {
  id: string;
  claimText: string;
  claimType: 'statistic' | 'benchmark' | 'date' | 'version' | 'architecture_quote';
  citedSourceUrl?: string;
  confidence: 'high' | 'medium' | 'unverified';
  flaggedIssue?: string;
  suggestedRevision?: string;
}

export interface ContentQualityVerificationReport {
  articleId?: string;
  overallQualityScore: number; // 0-100
  status: 'passed' | 'warning' | 'rejected';
  totalClaimsExtracted: number;
  totalSourcesChecked: number;
  brokenSourcesCount: number;
  claims: ExtractedFactClaim[];
  sources: VerifiedSourceItem[];
  fluffAndRepetitionIssues: string[];
  actionableRevisions: {
    id: string;
    originalText: string;
    revisedSuggestion: string;
    reason: string;
  }[];
}

export class ContentQualityService {
  /**
   * SSRF Protection: Ensure target source URL is public and safe to fetch
   */
  private isSafeExternalUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;

      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host === '127.0.0.1' ||
        host === '::1' ||
        host === '169.254.169.254' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify an article's content quality, extract claims and check citations
   */
  async verifyArticleContent(params: {
    articleId?: string;
    title: string;
    contentHtml: string;
  }): Promise<ContentQualityVerificationReport> {
    const { articleId, title, contentHtml } = params;

    const $ = cheerio.load(contentHtml || '');
    $('script, style, nav, footer, header').remove();
    const cleanText = $('body').text().replace(/\s+/g, ' ').trim();

    // 1. Extract cited external URLs
    const citedUrls: string[] = [];
    $('a[href^="http"]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (href && !citedUrls.includes(href) && !href.includes('blogs.dailybuild.tech')) {
        citedUrls.push(href);
      }
    });

    // 2. HTTP check each cited URL with SSRF protection and timeout
    const checkedSources: VerifiedSourceItem[] = [];
    let brokenSourcesCount = 0;

    for (const url of citedUrls.slice(0, 10)) {
      if (!this.isSafeExternalUrl(url)) {
        checkedSources.push({
          url,
          sourceDomain: 'blocked',
          httpStatus: 0,
          isReachable: false,
          responseTimeMs: 0,
          supportAssessment: 'unsupported_or_broken',
          notes: 'Blocked by SSRF security policy: private or non-routable IP address.',
        });
        brokenSourcesCount++;
        continue;
      }

      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'DailyBuild-Source-Verifier/1.0',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: controller.signal,
          redirect: 'follow',
        });
        clearTimeout(timeout);

        const duration = Date.now() - start;
        const isOk = res.ok;
        if (!isOk) brokenSourcesCount++;

        checkedSources.push({
          url,
          sourceDomain: new URL(url).hostname,
          httpStatus: res.status,
          isReachable: isOk,
          responseTimeMs: duration,
          supportAssessment: isOk ? 'strongly_supported' : 'unsupported_or_broken',
          notes: isOk ? `Source responded HTTP 200 in ${duration}ms.` : `Source returned error status ${res.status}.`,
        });
      } catch (err: any) {
        brokenSourcesCount++;
        checkedSources.push({
          url,
          sourceDomain: new URL(url).hostname,
          httpStatus: 0,
          isReachable: false,
          responseTimeMs: Date.now() - start,
          supportAssessment: 'unsupported_or_broken',
          notes: `Failed to reach source: ${err.message}`,
        });
      }
    }

    // 3. Extract claims & statistics using regex pattern matching & heuristic analysis
    const claims: ExtractedFactClaim[] = [];
    const sentences = cleanText.split(/(?<=[.?!])\s+/).filter(Boolean);

    let claimIdx = 1;
    for (const sent of sentences) {
      if (sent.length < 20 || sent.length > 250) continue;

      // Detect statistics (numbers with %, ms, Gbps, $, etc.)
      if (/\b(\d+(?:\.\d+)?(?:%|ms|x|Gbps|MB\/s|GB|TB|billion|million))\b/i.test(sent)) {
        claims.push({
          id: `claim-${claimIdx++}`,
          claimText: sent.trim(),
          claimType: 'statistic',
          confidence: 'high',
        });
      } else if (/\b(in\s+(?:202[0-9]|199[0-9])|as of\s+(?:202[0-9]))\b/i.test(sent)) {
        claims.push({
          id: `claim-${claimIdx++}`,
          claimText: sent.trim(),
          claimType: 'date',
          confidence: 'high',
        });
      } else if (/\b(?:version|v\d+\.\d+|release\s+\d+)\b/i.test(sent)) {
        claims.push({
          id: `claim-${claimIdx++}`,
          claimText: sent.trim(),
          claimType: 'version',
          confidence: 'medium',
        });
      }

      if (claims.length >= 12) break; // Limit to key claims
    }

    // 4. Detect fluff, buzzwords, or repetitive text
    const fluffAndRepetitionIssues: string[] = [];
    const buzzwordMatches = cleanText.match(/\b(game-changer|revolutionary|disruptive|paradigm shift|unprecedented|skyrocket|magic)\b/gi);
    if (buzzwordMatches && buzzwordMatches.length >= 3) {
      fluffAndRepetitionIssues.push(`High density of marketing fluff/buzzwords detected (${buzzwordMatches.length} occurrences: "${buzzwordMatches.slice(0, 4).join(', ')}"). Technical readers favor objective engineering prose.`);
    }

    // Check paragraph repetition
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter((p) => p.length > 40);
    const seenP = new Set<string>();
    for (const p of paragraphs) {
      const key = p.substring(0, 40).toLowerCase();
      if (seenP.has(key)) {
        fluffAndRepetitionIssues.push(`Repetitive paragraph or sentence structure detected starting with "${p.substring(0, 50)}..."`);
      }
      seenP.add(key);
    }

    // 5. Generate actionable revisions
    const actionableRevisions: ContentQualityVerificationReport['actionableRevisions'] = [];
    if (brokenSourcesCount > 0) {
      actionableRevisions.push({
        id: 'rev-broken-source',
        originalText: 'Broken or unreachable outbound citations',
        revisedSuggestion: 'Replace dead external link targets with active official documentation or archive.org perma-links.',
        reason: 'Search engines devalue articles pointing to broken external destinations.',
      });
    }

    if (claims.length > 0 && citedUrls.length === 0) {
      actionableRevisions.push({
        id: 'rev-missing-citations',
        originalText: 'Unsubstantiated numerical claims',
        revisedSuggestion: 'Add authoritative source links verifying statistics and benchmark assertions.',
        reason: 'E-E-A-T and factual integrity guidelines require attribution for quantitative claims.',
      });
    }

    // Calculate overall quality score
    let score = 92;
    score -= brokenSourcesCount * 8;
    score -= fluffAndRepetitionIssues.length * 5;
    if (claims.length > 3 && citedUrls.length === 0) score -= 12;

    const overallQualityScore = Math.max(25, Math.min(100, score));
    const status: 'passed' | 'warning' | 'rejected' =
      overallQualityScore >= 80 ? 'passed' : overallQualityScore >= 60 ? 'warning' : 'rejected';

    // Save record if articleId provided
    if (articleId) {
      await db.insert(schema.seoContentVerifications).values({
        articleId,
        claimsJson: claims,
        sourcesCheckedJson: checkedSources,
        overallQualityScore,
        flaggedIssuesJson: fluffAndRepetitionIssues,
        revisionSuggestionsJson: actionableRevisions,
        status,
        verifiedAt: new Date(),
      });
    }

    return {
      articleId,
      overallQualityScore,
      status,
      totalClaimsExtracted: claims.length,
      totalSourcesChecked: checkedSources.length,
      brokenSourcesCount,
      claims,
      sources: checkedSources,
      fluffAndRepetitionIssues,
      actionableRevisions,
    };
  }
}

export const contentQualityService = new ContentQualityService();
