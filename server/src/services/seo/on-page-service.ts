import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq } from 'drizzle-orm';

export interface OnPageCheckItem {
  id: string;
  name: string;
  category: 'title' | 'description' | 'headings' | 'content' | 'images' | 'links' | 'url';
  status: 'pass' | 'warn' | 'fail';
  scoreImpact: number;
  message: string;
  currentValue?: any;
  recommendedValue?: any;
  recommendation: string;
  fixAvailable?: boolean;
  suggestedFix?: string;
}

export interface OnPageAnalysisResult {
  overallScore: number; // 0-100
  score?: number; // Alias for UI compatibility
  articleId?: string;
  title: string;
  slug: string;
  checks: OnPageCheckItem[];
  wordCount: number;
  readingTimeMins: number;
  readabilityGrade: string; // e.g. "College Level (Flesch-Kincaid: 55)"
  readability?: {
    wordCount: number;
    readingTimeMinutes: number;
    fleschKincaidGrade: string;
    fleschReadingEaseScore: number;
  };
  headings?: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
  };
  keywordMetrics: {
    primaryKeyword?: string;
    densityPercent: number;
    count: number;
    locationsFound: string[]; // e.g. ['title', 'first_paragraph', 'h2']
  };
  generatedFixes: {
    optimizedTitle?: string;
    optimizedMetaDescription?: string;
    optimizedSlug?: string;
    suggestedAltTexts?: Record<string, string>;
    headingImprovements?: string[];
  };
}

export class OnPageOptimizerService {
  /**
   * Analyze an article draft or published article for comprehensive On-Page SEO
   */
  async analyzeArticle(params: {
    articleId?: string;
    title: string;
    slug?: string;
    excerpt?: string;
    contentHtml: string;
    metaTitle?: string;
    metaDescription?: string;
    targetKeyword?: string;
    featuredImageAlt?: string;
  }): Promise<OnPageAnalysisResult> {
    const {
      articleId,
      title,
      slug = '',
      excerpt = '',
      contentHtml,
      metaTitle = '',
      metaDescription = '',
      targetKeyword = '',
      featuredImageAlt = '',
    } = params;

    const $ = cheerio.load(contentHtml || '');
    const cleanBodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = cleanBodyText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));

    // Calculate Flesch Reading Ease score
    const sentences = cleanBodyText.split(/[.!?]+/).filter(Boolean).length || 1;
    const syllables = this.estimateSyllableCount(cleanBodyText);
    const fleschEase = Math.round(206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / Math.max(1, wordCount)));
    const readabilityGrade = this.fleschToGrade(fleschEase);

    const checks: OnPageCheckItem[] = [];

    // 1. Title Checks
    const effectiveTitle = (metaTitle || title || '').trim();
    if (!effectiveTitle) {
      checks.push({
        id: 'title-missing',
        name: 'Title Tag',
        category: 'title',
        status: 'fail',
        scoreImpact: 15,
        message: 'No title or headline provided.',
        recommendation: 'Add a compelling headline between 40 and 60 characters.',
      });
    } else {
      const len = effectiveTitle.length;
      if (len >= 35 && len <= 65) {
        checks.push({
          id: 'title-length-good',
          name: 'Title Length',
          category: 'title',
          status: 'pass',
          scoreImpact: 0,
          message: `Title length (${len} chars) is optimal for Google desktop and mobile snippets.`,
          currentValue: effectiveTitle,
          recommendation: 'Maintains optimal SERP visibility without truncation.',
        });
      } else if (len < 35) {
        checks.push({
          id: 'title-length-short',
          name: 'Title Too Short',
          category: 'title',
          status: 'warn',
          scoreImpact: 6,
          message: `Title is only ${len} characters. May lack sufficient search context.`,
          currentValue: effectiveTitle,
          recommendation: 'Expand with target technology keywords or engineering angle.',
          fixAvailable: true,
        });
      } else {
        checks.push({
          id: 'title-length-long',
          name: 'Title Too Long',
          category: 'title',
          status: 'warn',
          scoreImpact: 5,
          message: `Title is ${len} characters; likely to be truncated on SERPs.`,
          currentValue: effectiveTitle,
          recommendation: 'Trim title under 65 characters keeping primary keyword near the beginning.',
          fixAvailable: true,
        });
      }
    }

    // 2. Meta Description Checks
    const effectiveDesc = (metaDescription || excerpt || '').trim();
    if (!effectiveDesc) {
      checks.push({
        id: 'desc-missing',
        name: 'Meta Description',
        category: 'description',
        status: 'fail',
        scoreImpact: 12,
        message: 'No meta description or excerpt declared.',
        recommendation: 'Add an informative meta description between 120 and 160 characters.',
        fixAvailable: true,
      });
    } else {
      const descLen = effectiveDesc.length;
      if (descLen >= 110 && descLen <= 160) {
        checks.push({
          id: 'desc-length-good',
          name: 'Meta Description Length',
          category: 'description',
          status: 'pass',
          scoreImpact: 0,
          message: `Description length (${descLen} chars) is within the recommended SERP window.`,
          currentValue: effectiveDesc,
          recommendation: 'Ideal length for desktop and mobile snippet previews.',
        });
      } else if (descLen < 110) {
        checks.push({
          id: 'desc-length-short',
          name: 'Meta Description Too Short',
          category: 'description',
          status: 'warn',
          scoreImpact: 5,
          message: `Description is ${descLen} characters.`,
          currentValue: effectiveDesc,
          recommendation: 'Elaborate on core takeaways and engineer value proposition (120-160 chars).',
          fixAvailable: true,
        });
      } else {
        checks.push({
          id: 'desc-length-long',
          name: 'Meta Description Exceeds SERP Limit',
          category: 'description',
          status: 'warn',
          scoreImpact: 4,
          message: `Description is ${descLen} characters and will be clipped.`,
          currentValue: effectiveDesc,
          recommendation: 'Trim description to strictly under 160 characters.',
          fixAvailable: true,
        });
      }
    }

    // 3. URL Slug Checks
    const effectiveSlug = slug.trim();
    if (!effectiveSlug) {
      checks.push({
        id: 'slug-missing',
        name: 'URL Slug',
        category: 'url',
        status: 'warn',
        scoreImpact: 5,
        message: 'Slug has not been generated yet.',
        recommendation: 'Generate a clean, lowercase hyphen-separated slug.',
      });
    } else {
      if (/[A-Z]/.test(effectiveSlug) || /[^a-z0-9-]/.test(effectiveSlug)) {
        checks.push({
          id: 'slug-syntax-invalid',
          name: 'URL Slug Characters',
          category: 'url',
          status: 'fail',
          scoreImpact: 8,
          message: 'Slug contains uppercase characters or non-standard symbols.',
          currentValue: effectiveSlug,
          recommendation: 'Use only lowercase alphanumeric characters and hyphens.',
          fixAvailable: true,
        });
      } else if (effectiveSlug.length > 75) {
        checks.push({
          id: 'slug-length-long',
          name: 'URL Slug Length',
          category: 'url',
          status: 'warn',
          scoreImpact: 4,
          message: `Slug length (${effectiveSlug.length} chars) is unnecessarily verbose.`,
          currentValue: effectiveSlug,
          recommendation: 'Keep slug concise (3-6 key terms).',
          fixAvailable: true,
        });
      } else {
        checks.push({
          id: 'slug-optimal',
          name: 'URL Slug Structure',
          category: 'url',
          status: 'pass',
          scoreImpact: 0,
          message: 'Slug is clean, search-engine friendly, and readable.',
          currentValue: effectiveSlug,
          recommendation: 'Meets URL slug best practices.',
        });
      }
    }

    // 4. Headings Hierarchy Checks
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    if (h1Count === 0) {
      checks.push({
        id: 'h1-missing',
        name: 'H1 Heading',
        category: 'headings',
        status: 'fail',
        scoreImpact: 10,
        message: 'Article body has no <h1> tag (page relies on template header).',
        recommendation: 'Ensure template or article renders exactly one <h1> matching the title.',
      });
    } else if (h1Count > 1) {
      checks.push({
        id: 'h1-duplicate',
        name: 'Multiple H1 Headings',
        category: 'headings',
        status: 'warn',
        scoreImpact: 6,
        message: `Found ${h1Count} <h1> headings in content.`,
        recommendation: 'Demote secondary <h1> tags to <h2>.',
      });
    } else {
      checks.push({
        id: 'h1-valid',
        name: 'Single H1 Heading',
        category: 'headings',
        status: 'pass',
        scoreImpact: 0,
        message: 'Single H1 tag properly declared.',
        recommendation: 'Heading hierarchy is correct.',
      });
    }

    if (h2Count < 2) {
      checks.push({
        id: 'h2-insufficient',
        name: 'Section Headings (H2)',
        category: 'headings',
        status: 'warn',
        scoreImpact: 7,
        message: `Article has only ${h2Count} <h2> heading(s).`,
        recommendation: 'Add at least 3-5 <h2> headings to create structured content sections.',
      });
    } else {
      checks.push({
        id: 'h2-optimal',
        name: 'Sub-Headings Structure',
        category: 'headings',
        status: 'pass',
        scoreImpact: 0,
        message: `Good structure with ${h2Count} <h2> and ${h3Count} <h3> sub-headings.`,
        recommendation: 'Logical document hierarchy established.',
      });
    }

    // 5. Content Depth & Word Count
    if (wordCount < 400) {
      checks.push({
        id: 'word-count-low',
        name: 'Content Depth',
        category: 'content',
        status: 'fail',
        scoreImpact: 15,
        message: `Article contains only ${wordCount} words.`,
        currentValue: `${wordCount} words`,
        recommendation: 'Comprehensive technical posts typically require 800-2,000 words to rank.',
      });
    } else if (wordCount < 800) {
      checks.push({
        id: 'word-count-medium',
        name: 'Content Depth',
        category: 'content',
        status: 'warn',
        scoreImpact: 6,
        message: `Article contains ${wordCount} words.`,
        currentValue: `${wordCount} words`,
        recommendation: 'Consider expanding with implementation code, benchmarks, or trade-offs.',
      });
    } else {
      checks.push({
        id: 'word-count-good',
        name: 'Content Depth',
        category: 'content',
        status: 'pass',
        scoreImpact: 0,
        message: `Substantial editorial depth with ${wordCount} words (~${readingTimeMins} min read).`,
        currentValue: `${wordCount} words`,
        recommendation: 'Depth is well-aligned with high-ranking technical literature.',
      });
    }

    // 6. Image Alt Coverage
    const imgEls = $('img');
    let missingAlt = 0;
    const suggestedAlts: Record<string, string> = {};

    imgEls.each((idx, el) => {
      const src = $(el).attr('src') || `image_${idx}`;
      const alt = $(el).attr('alt')?.trim();
      if (!alt) {
        missingAlt++;
        suggestedAlts[src] = `${title} - Technical diagram ${idx + 1}`;
      }
    });

    if (missingAlt > 0) {
      checks.push({
        id: 'img-alt-missing',
        name: 'Image Alt Attributes',
        category: 'images',
        status: 'warn',
        scoreImpact: Math.min(10, missingAlt * 3),
        message: `${missingAlt} image(s) lack descriptive alt text.`,
        recommendation: 'Add meaningful alt attributes describing each graphic for accessibility and SEO.',
        fixAvailable: true,
      });
    } else {
      checks.push({
        id: 'img-alt-good',
        name: 'Image Alt Attributes',
        category: 'images',
        status: 'pass',
        scoreImpact: 0,
        message: 'All inline images have alt text specified.',
        recommendation: 'Image accessibility standards met.',
      });
    }

    // 7. Internal & External Linking
    const internalLinks = $('a[href^="/"], a[href*="blogs.dailybuild.tech"]').length;
    const externalLinks = $('a[href^="http"]:not([href*="blogs.dailybuild.tech"])').length;

    if (internalLinks === 0) {
      checks.push({
        id: 'internal-links-missing',
        name: 'Internal Links',
        category: 'links',
        status: 'warn',
        scoreImpact: 8,
        message: 'Article has no contextual internal links to other publication pages.',
        recommendation: 'Link to 2-4 related internal articles to distribute link equity.',
      });
    } else {
      checks.push({
        id: 'internal-links-good',
        name: 'Internal Links',
        category: 'links',
        status: 'pass',
        scoreImpact: 0,
        message: `Contains ${internalLinks} contextual internal link(s).`,
        recommendation: 'Healthy internal linking density.',
      });
    }

    if (externalLinks === 0) {
      checks.push({
        id: 'external-links-missing',
        name: 'Authority Citations',
        category: 'links',
        status: 'warn',
        scoreImpact: 3,
        message: 'No external authority links, benchmarks, or documentation cited.',
        recommendation: 'Link to official GitHub repos, RFCs, or documentation to boost topical trust.',
      });
    }

    // 8. Keyword Density & Relevance
    const keywordTerm = (targetKeyword || title.split(/\s+/).slice(0, 3).join(' ')).toLowerCase();
    const matches = cleanBodyText.toLowerCase().split(keywordTerm).length - 1;
    const densityPercent = wordCount > 0 ? Number(((matches * keywordTerm.split(' ').length / wordCount) * 100).toFixed(2)) : 0;

    const locationsFound: string[] = [];
    if (effectiveTitle.toLowerCase().includes(keywordTerm)) locationsFound.push('title');
    if ($('h1').text().toLowerCase().includes(keywordTerm)) locationsFound.push('h1');
    if ($('h2').text().toLowerCase().includes(keywordTerm)) locationsFound.push('h2');
    if ($('p').first().text().toLowerCase().includes(keywordTerm)) locationsFound.push('first_paragraph');

    // Calculate score deductions
    const deductions = checks.reduce((acc, c) => acc + (c.status === 'fail' ? c.scoreImpact : c.status === 'warn' ? c.scoreImpact : 0), 0);
    const overallScore = Math.max(20, Math.min(100, 100 - deductions));

    // Generate AI fixes if score < 90
    let generatedFixes: any = {
      suggestedAltTexts: suggestedAlts,
    };

    if (overallScore < 85 || !effectiveDesc || effectiveTitle.length < 35 || effectiveTitle.length > 65) {
      generatedFixes.optimizedTitle = effectiveTitle.length > 65
        ? effectiveTitle.substring(0, 58).trim() + '...'
        : `${effectiveTitle}: Engineering Deep Dive`;
      generatedFixes.optimizedMetaDescription = effectiveDesc
        ? (effectiveDesc.length > 155 ? effectiveDesc.substring(0, 150).trim() + '...' : effectiveDesc)
        : `Explore in-depth engineering analysis on ${title}. Discover architectural trade-offs, code examples, and production performance benchmarks.`;
      generatedFixes.optimizedSlug = effectiveSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    return {
      overallScore,
      score: overallScore,
      articleId,
      title: effectiveTitle,
      slug: effectiveSlug,
      checks,
      wordCount,
      readingTimeMins,
      readabilityGrade,
      readability: {
        wordCount,
        readingTimeMinutes: readingTimeMins,
        fleschKincaidGrade: readabilityGrade,
        fleschReadingEaseScore: fleschEase,
      },
      headings: {
        h1Count,
        h2Count,
        h3Count,
      },
      keywordMetrics: {
        primaryKeyword: keywordTerm,
        densityPercent,
        count: matches,
        locationsFound,
      },
      generatedFixes,
    };
  }

  /**
   * Apply approved on-page fixes directly to article record
   */
  async applyFixesToArticle(articleId: string, fixes: {
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    featuredImageAlt?: string;
    contentHtml?: string;
  }): Promise<any> {
    const existing = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!existing) {
      throw new Error(`Article ${articleId} not found.`);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (fixes.metaTitle) updateData.metaTitle = fixes.metaTitle;
    if (fixes.metaDescription) updateData.metaDescription = fixes.metaDescription;
    if (fixes.slug) updateData.slug = fixes.slug;
    if (fixes.featuredImageAlt) updateData.featuredImageAlt = fixes.featuredImageAlt;
    if (fixes.contentHtml) updateData.contentHtml = fixes.contentHtml;

    const [updated] = await db.update(schema.articles)
      .set(updateData)
      .where(eq(schema.articles.id, articleId))
      .returning();

    return updated;
  }

  private estimateSyllableCount(text: string): number {
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
    let total = 0;
    for (const w of words) {
      if (w.length <= 3) {
        total += 1;
        continue;
      }
      const cleaned = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
      const syllables = cleaned.match(/[aeiouy]{1,2}/g);
      total += syllables ? syllables.length : 1;
    }
    return total;
  }

  private fleschToGrade(score: number): string {
    if (score >= 90) return `Very Easy (Score: ${score})`;
    if (score >= 80) return `Easy (Score: ${score})`;
    if (score >= 70) return `Fairly Easy (Score: ${score})`;
    if (score >= 60) return `Standard (Score: ${score})`;
    if (score >= 50) return `Fairly Difficult (Score: ${score})`;
    if (score >= 30) return `Difficult / Academic (Score: ${score})`;
    return `Very Confusing / Highly Technical (Score: ${score})`;
  }
}

export const onPageOptimizerService = new OnPageOptimizerService();
