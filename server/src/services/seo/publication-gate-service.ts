import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { onPageOptimizerService } from './on-page-service.js';
import { contentQualityService } from './content-quality-service.js';
import { aeoGeoAnalyzerService } from './aeo-geo-service.js';
import { schemaValidatorService } from './schema-validator-service.js';
import { internalLinkingService } from './internal-linking-service.js';
import { indexingSitemapService } from './indexing-service.js';
import { eq } from 'drizzle-orm';

export interface PublicationGateCheckResult {
  checkName: string;
  category: 'on_page' | 'quality' | 'aeo' | 'schema' | 'linking' | 'duplicate';
  status: 'passed' | 'warning' | 'failed' | 'skipped_unavailable';
  score?: number;
  message: string;
  isBlocking: boolean;
  fixRecommendation?: string;
}

export interface PublicationGateEvaluation {
  canPublish: boolean;
  policyEnforced: 'warning_only' | 'approval_required' | 'block_publication';
  overallScore: number;
  failedChecksCount: number;
  warningChecksCount: number;
  checks: PublicationGateCheckResult[];
  blockingReasons: string[];
}

export class PublicationGateService {
  /**
   * Run full pre-publication SEO & AEO verification suite on an article
   */
  async evaluateArticleBeforePublication(params: {
    articleId?: string;
    title: string;
    slug?: string;
    excerpt?: string;
    contentHtml: string;
    metaTitle?: string;
    metaDescription?: string;
    authorName?: string;
    categoryName?: string;
  }): Promise<PublicationGateEvaluation> {
    const {
      articleId,
      title,
      slug,
      excerpt,
      contentHtml,
      metaTitle,
      metaDescription,
      authorName = 'DailyBuild Author',
      categoryName = 'Technology',
    } = params;

    // Fetch site publication policy from seo_settings
    const settings = await db.query.seoSettings.findFirst();
    const policy = (settings?.publicationPolicy || 'warning_only') as 'warning_only' | 'approval_required' | 'block_publication';

    const checks: PublicationGateCheckResult[] = [];
    const blockingReasons: string[] = [];

    // 1. On-Page SEO Check
    try {
      const onPage = await onPageOptimizerService.analyzeArticle({
        articleId,
        title,
        slug,
        excerpt,
        contentHtml,
        metaTitle,
        metaDescription,
      });

      const hasFailures = onPage.checks.some((c) => c.status === 'fail');
      checks.push({
        checkName: 'On-Page SEO Standards',
        category: 'on_page',
        status: onPage.overallScore >= 75 ? 'passed' : hasFailures ? 'failed' : 'warning',
        score: onPage.overallScore,
        message: `On-page score: ${onPage.overallScore}/100 with ${onPage.wordCount} words (${onPage.readabilityGrade}).`,
        isBlocking: policy === 'block_publication' && onPage.overallScore < 50,
        fixRecommendation: onPage.checks.find((c) => c.status === 'fail')?.recommendation,
      });

      if (policy === 'block_publication' && onPage.overallScore < 50) {
        blockingReasons.push(`On-page SEO score (${onPage.overallScore}/100) is below the minimum threshold (50) required by site policy.`);
      }
    } catch (err: any) {
      checks.push({
        checkName: 'On-Page SEO Standards',
        category: 'on_page',
        status: 'skipped_unavailable',
        message: `Check could not run: ${err.message}`,
        isBlocking: false,
      });
    }

    // 2. Content Quality & Source Verification
    try {
      const quality = await contentQualityService.verifyArticleContent({
        articleId,
        title,
        contentHtml,
      });

      const isQualityBlocked = policy === 'block_publication' && quality.status === 'rejected';
      checks.push({
        checkName: 'Factual Quality & Citation Integrity',
        category: 'quality',
        status: quality.status === 'passed' ? 'passed' : quality.status === 'warning' ? 'warning' : 'failed',
        score: quality.overallQualityScore,
        message: `Quality score: ${quality.overallQualityScore}/100. ${quality.totalClaimsExtracted} claim(s) extracted, ${quality.brokenSourcesCount} broken citation(s).`,
        isBlocking: isQualityBlocked,
        fixRecommendation: quality.brokenSourcesCount > 0 ? 'Fix or remove broken external citation URLs.' : undefined,
      });

      if (isQualityBlocked) {
        blockingReasons.push(`Content quality verification rejected (${quality.overallQualityScore}/100). Resolve broken sources or unsubstantiated claims.`);
      }
    } catch (err: any) {
      checks.push({
        checkName: 'Factual Quality & Citation Integrity',
        category: 'quality',
        status: 'skipped_unavailable',
        message: `Quality check could not run: ${err.message}`,
        isBlocking: false,
      });
    }

    // 3. AEO / GEO Readiness Check
    try {
      const aeo = await aeoGeoAnalyzerService.analyzeArticle({
        articleId,
        title,
        contentHtml,
        excerpt,
        authorName,
      });

      checks.push({
        checkName: 'AEO / GEO Answer Engine Readiness',
        category: 'aeo',
        status: aeo.overallReadinessScore >= 70 ? 'passed' : 'warning',
        score: aeo.overallReadinessScore,
        message: `AEO Readiness: ${aeo.readinessTier} (${aeo.overallReadinessScore}/100) with ${aeo.directAnswerCount} direct answer summary blocks.`,
        isBlocking: false, // AEO is heuristic, non-blocking
        fixRecommendation: aeo.actionPlan[0],
      });
    } catch (err: any) {
      checks.push({
        checkName: 'AEO / GEO Answer Engine Readiness',
        category: 'aeo',
        status: 'skipped_unavailable',
        message: `AEO check could not run: ${err.message}`,
        isBlocking: false,
      });
    }

    // 4. Schema & Structured Data Validation
    try {
      const dummyArticleRecord: any = {
        title,
        slug: slug || 'preview-slug',
        excerpt: excerpt || '',
        publishedAt: new Date(),
        updatedAt: new Date(),
        featuredImage: '',
        tags: [],
      };
      const generatedSchema = schemaValidatorService.generateArticleSchema(dummyArticleRecord, categoryName, authorName);
      const schemaValidation = schemaValidatorService.validateSchema(generatedSchema, { title, author: authorName });

      const isSchemaFailed = !schemaValidation.isValid;
      checks.push({
        checkName: 'Schema.org JSON-LD Validation',
        category: 'schema',
        status: isSchemaFailed ? 'failed' : 'passed',
        score: isSchemaFailed ? 40 : 100,
        message: isSchemaFailed
          ? `Schema syntax errors detected: ${schemaValidation.errors.map((e) => e.message).join('; ')}`
          : 'Valid TechArticle / NewsArticle JSON-LD conforming to Google Search Central guidelines.',
        isBlocking: policy === 'block_publication' && isSchemaFailed,
        fixRecommendation: isSchemaFailed ? schemaValidation.errors[0]?.message : undefined,
      });

      if (policy === 'block_publication' && isSchemaFailed) {
        blockingReasons.push('Structured data validation failed with syntax errors.');
      }
    } catch (err: any) {
      checks.push({
        checkName: 'Schema.org JSON-LD Validation',
        category: 'schema',
        status: 'skipped_unavailable',
        message: `Schema validation check could not run: ${err.message}`,
        isBlocking: false,
      });
    }

    // 5. Contextual Internal Linking Check
    try {
      const hasLinks = /href=["'](\/|https?:\/\/blogs\.dailybuild\.tech)/i.test(contentHtml);
      checks.push({
        checkName: 'Contextual Internal Links',
        category: 'linking',
        status: hasLinks ? 'passed' : 'warning',
        score: hasLinks ? 90 : 50,
        message: hasLinks ? 'Article links contextually to internal site resources.' : 'Article contains zero internal links to related publications.',
        isBlocking: false,
        fixRecommendation: !hasLinks ? 'Add 2-3 links to related internal articles.' : undefined,
      });
    } catch {
      // ignore
    }

    // Calculate aggregated score
    const scoredChecks = checks.filter((c) => typeof c.score === 'number');
    const overallScore = scoredChecks.length > 0
      ? Math.round(scoredChecks.reduce((sum, c) => sum + (c.score || 0), 0) / scoredChecks.length)
      : 80;

    const failedChecksCount = checks.filter((c) => c.status === 'failed').length;
    const warningChecksCount = checks.filter((c) => c.status === 'warning').length;

    let canPublish = true;
    if (policy === 'block_publication') {
      canPublish = blockingReasons.length === 0;
    } else if (policy === 'approval_required') {
      canPublish = failedChecksCount === 0;
    }

    return {
      canPublish,
      policyEnforced: policy,
      overallScore,
      failedChecksCount,
      warningChecksCount,
      checks,
      blockingReasons,
    };
  }

  /**
   * Post-publication automated actions:
   * 1. Broadcast to IndexNow
   * 2. Update publication-time SEO scores in articles table
   */
  async handlePostPublication(articleId: string, slug: string): Promise<void> {
    console.log(`[Publication Gate] Executing post-publication SEO workflows for article ${articleId} (${slug})...`);
    try {
      // 1. Submit to IndexNow
      await indexingSitemapService.handleArticlePublished(slug);

      // 2. Fetch and snapshot SEO score into article record
      const article = await db.query.articles.findFirst({
        where: eq(schema.articles.id, articleId),
      });

      if (article) {
        const onPage = await onPageOptimizerService.analyzeArticle({
          articleId,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          contentHtml: article.contentHtml,
        });

        const aeo = await aeoGeoAnalyzerService.analyzeArticle({
          articleId,
          title: article.title,
          contentHtml: article.contentHtml,
        });

        await db.update(schema.articles)
          .set({
            seoScore: onPage.overallScore,
            aeoScore: aeo.overallReadinessScore,
            lastAuditedAt: new Date(),
          })
          .where(eq(schema.articles.id, articleId));

        console.log(`[Publication Gate] Saved article SEO scores: SEO=${onPage.overallScore}, AEO=${aeo.overallReadinessScore}`);
      }
    } catch (err: any) {
      console.error('[Publication Gate Error]:', err.message);
    }
  }
}

export const publicationGateService = new PublicationGateService();
