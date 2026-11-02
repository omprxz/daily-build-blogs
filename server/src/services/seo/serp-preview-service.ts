import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq, desc } from 'drizzle-orm';
import { config } from '../../config/index.js';

export interface SERPVariant {
  id: string;
  metaTitle: string;
  metaDescription: string;
  titlePixelWidthDesktop: number;
  titlePixelWidthMobile: number;
  isDesktopTruncated: boolean;
  isMobileTruncated: boolean;
  hookType: 'curiosity' | 'benchmark' | 'problem_solution' | 'direct_guide';
  aiAngle: string;
}

export interface SERPPreviewData {
  articleId: string;
  currentTitle: string;
  currentMetaTitle: string;
  currentMetaDescription: string;
  slug: string;
  fullUrl: string;
  desktopPixelWidth: number;
  mobilePixelWidth: number;
  isDesktopTruncated: boolean;
  isMobileTruncated: boolean;
  actualSearchConsoleMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    topQuery: string;
  };
  aiGeneratedVariants: SERPVariant[];
  originalMetadataSnapshot?: {
    metaTitle: string;
    metaDescription: string;
    updatedAt: Date;
  };
}

export class SERPPreviewService {
  private baseUrl = config.appUrl.replace(/\/$/, '');

  /**
   * Approximate Google pixel width calculation for Arial / Roboto typography:
   * Capital letters & wide letters (~11-13px), standard lowercase (~7-9px), narrow letters (~4-5px)
   */
  calculatePixelWidth(text: string): number {
    let width = 0;
    for (const char of text) {
      if (/[A-Z]/.test(char)) width += 11.5;
      else if (/[wmMW]/.test(char)) width += 13.0;
      else if (/[ijlrtfI]/.test(char)) width += 4.5;
      else if (/[0-9]/.test(char)) width += 9.0;
      else if (/\s/.test(char)) width += 4.0;
      else width += 8.5; // standard lowercase
    }
    return Math.round(width);
  }

  /**
   * Generate SERP preview and AI CTR variants for an article
   */
  async getPreviewAndVariants(articleId: string): Promise<SERPPreviewData> {
    const article = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found.`);
    }

    const title = article.metaTitle || article.title;
    const description = article.metaDescription || article.excerpt || '';
    const fullUrl = `${this.baseUrl}/article/${article.slug}`;

    const desktopPixelWidth = this.calculatePixelWidth(title);
    const mobilePixelWidth = this.calculatePixelWidth(title);

    // Google truncates desktop titles around 580-600px; mobile around 540-560px
    const isDesktopTruncated = desktopPixelWidth > 595;
    const isMobileTruncated = mobilePixelWidth > 550;

    // Fetch actual GSC metrics from cache if available
    let actualSearchConsoleMetrics: any = undefined;
    try {
      const gscCache = await db.query.searchConsoleCache.findFirst({
        orderBy: [desc(schema.searchConsoleCache.createdAt)],
      });
      if (gscCache?.dataJson) {
        const data = gscCache.dataJson as any;
        const pageMatch = (data?.pages || []).find((p: any) => (p.page || '').includes(article.slug));
        if (pageMatch) {
          actualSearchConsoleMetrics = {
            clicks: Math.round(pageMatch.clicks || 0),
            impressions: Math.round(pageMatch.impressions || 0),
            ctr: Number(((pageMatch.ctr || 0) * 100).toFixed(1)),
            position: Number((pageMatch.position || 0).toFixed(1)),
            topQuery: 'Primary target topic',
          };
        }
      }
    } catch {
      // ignore
    }

    // AI Generation of 3 high-impact variants
    let variants: SERPVariant[] = [];
    const prompt = `You are a Search Click-Through Rate (CTR) Optimization Specialist for high-traffic engineering publications.
Generate 3 distinct high-CTR title and meta description variants for this article:
Title: "${article.title}"
Excerpt: "${article.excerpt}"

Return a valid JSON array strictly adhering to this format:
[
  {
    "hookType": "benchmark" | "curiosity" | "problem_solution" | "direct_guide",
    "metaTitle": "Compelling Title strictly 45-60 characters",
    "metaDescription": "Actionable description strictly 130-155 characters",
    "aiAngle": "Explanation of psychological hook"
  }
]
Do NOT include markdown fences. Keep strictly under 60 characters for titles.`;

    try {
      const res = await providerRegistry.generate('seo_serp_variants', {
        model: 'gemini-2.5-flash',
        prompt,
        temperature: 0.4,
        maxTokens: 800,
      });
      const cleanJson = res.content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed)) {
        variants = parsed.slice(0, 3).map((v: any, idx: number) => {
          const vTitle = v.metaTitle || article.title;
          const vDesc = v.metaDescription || article.excerpt;
          const pWidth = this.calculatePixelWidth(vTitle);
          return {
            id: `variant-${idx + 1}`,
            metaTitle: vTitle,
            metaDescription: vDesc,
            titlePixelWidthDesktop: pWidth,
            titlePixelWidthMobile: pWidth,
            isDesktopTruncated: pWidth > 595,
            isMobileTruncated: pWidth > 550,
            hookType: v.hookType || 'benchmark',
            aiAngle: v.aiAngle || 'Engineered for technical decision-makers',
          };
        });
      }
    } catch {
      // Fallback algorithmic variants
      variants = [
        {
          id: 'variant-1',
          metaTitle: `${article.title.substring(0, 48)}: Full Guide`,
          metaDescription: `Discover the production engineering architecture of ${article.title}. Benchmarks, trade-offs, and implementation patterns.`,
          titlePixelWidthDesktop: this.calculatePixelWidth(`${article.title.substring(0, 48)}: Full Guide`),
          titlePixelWidthMobile: this.calculatePixelWidth(`${article.title.substring(0, 48)}: Full Guide`),
          isDesktopTruncated: false,
          isMobileTruncated: false,
          hookType: 'direct_guide',
          aiAngle: 'Clarity and authoritative tutorial positioning',
        },
        {
          id: 'variant-2',
          metaTitle: `Deep Dive: How ${article.title.substring(0, 42)} Works`,
          metaDescription: `An architectural breakdown of ${article.title}. Code examples, latency benchmarks, and pitfalls to avoid.`,
          titlePixelWidthDesktop: this.calculatePixelWidth(`Deep Dive: How ${article.title.substring(0, 42)} Works`),
          titlePixelWidthMobile: this.calculatePixelWidth(`Deep Dive: How ${article.title.substring(0, 42)} Works`),
          isDesktopTruncated: false,
          isMobileTruncated: false,
          hookType: 'curiosity',
          aiAngle: 'Deep-dive curiosity hook for senior software developers',
        },
      ];
    }

    return {
      articleId,
      currentTitle: article.title,
      currentMetaTitle: title,
      currentMetaDescription: description,
      slug: article.slug,
      fullUrl,
      desktopPixelWidth,
      mobilePixelWidth,
      isDesktopTruncated,
      isMobileTruncated,
      actualSearchConsoleMetrics,
      aiGeneratedVariants: variants,
      originalMetadataSnapshot: {
        metaTitle: article.metaTitle || article.title,
        metaDescription: article.metaDescription || article.excerpt,
        updatedAt: article.updatedAt,
      },
    };
  }

  /**
   * Apply selected metadata variant with rollback backup
   */
  async applyVariant(articleId: string, metaTitle: string, metaDescription: string): Promise<any> {
    const existing = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!existing) throw new Error(`Article ${articleId} not found.`);

    // Record revision before mutating
    await db.insert(schema.articleRevisions).values({
      articleId,
      title: existing.title,
      contentHtml: existing.contentHtml,
      excerpt: existing.excerpt,
      revisionNumber: 999, // metadata revision marker
      changeSummary: `SERP CTR optimization: Updated title and meta description`,
      userId: existing.authorId,
    });

    const [updated] = await db.update(schema.articles)
      .set({
        metaTitle,
        metaDescription,
        updatedAt: new Date(),
      })
      .where(eq(schema.articles.id, articleId))
      .returning();

    return updated;
  }
}

export const serpPreviewService = new SERPPreviewService();
