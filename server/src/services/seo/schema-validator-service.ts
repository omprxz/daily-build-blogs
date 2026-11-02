import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { eq } from 'drizzle-orm';
import { toAbsoluteImageUrl } from './seo-service.js';

export interface SchemaValidationIssue {
  severity: 'error' | 'warning' | 'notice';
  property: string;
  message: string;
  googleDocRef?: string;
}

export interface SchemaValidationResult {
  schemaType: string;
  isValid: boolean;
  jsonLd: any;
  errors: SchemaValidationIssue[];
  warnings: SchemaValidationIssue[];
  consistencyIssues: SchemaValidationIssue[];
  googleGuidelineCompliance: {
    hasContext: boolean;
    hasType: boolean;
    hasRequiredProperties: boolean;
    visibleContentMatches: boolean;
  };
  richSnippetNotice: string;
}

export class SchemaValidatorService {
  private baseUrl = config.appUrl.replace(/\/$/, '');

  /**
   * Generate canonical JSON-LD for an article
   */
  generateArticleSchema(article: typeof schema.articles.$inferSelect, categoryName?: string, authorName = 'DailyBuild Editorial'): any {
    const socialImageUrl = toAbsoluteImageUrl(article.featuredImage, this.baseUrl);
    const articleUrl = `${this.baseUrl}/article/${article.slug}`;

    return {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: article.title,
      description: article.excerpt,
      image: [socialImageUrl],
      datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
      dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: authorName,
        url: `${this.baseUrl}/about`,
      },
      publisher: {
        '@type': 'Organization',
        name: 'DailyBuild Tech',
        url: this.baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${this.baseUrl}/favicon.svg`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
      articleSection: categoryName || 'Technology',
      keywords: Array.isArray(article.tags) ? (article.tags as string[]).join(', ') : undefined,
    };
  }

  /**
   * Generate BreadcrumbList Schema
   */
  generateBreadcrumbsSchema(items: { name: string; url: string }[]): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${this.baseUrl}${item.url}`,
      })),
    };
  }

  /**
   * Validate any JSON-LD object against Google Search Central guidelines
   */
  validateSchema(jsonLdInput: any, visibleContent?: { title?: string; author?: string; publishedAt?: Date }): SchemaValidationResult {
    let jsonLd = jsonLdInput;
    if (typeof jsonLdInput === 'string') {
      try {
        jsonLd = JSON.parse(jsonLdInput);
      } catch (err: any) {
        return {
          schemaType: 'Unknown',
          isValid: false,
          jsonLd: null,
          errors: [{ severity: 'error', property: '@root', message: `Invalid JSON syntax: ${err.message}` }],
          warnings: [],
          consistencyIssues: [],
          googleGuidelineCompliance: {
            hasContext: false,
            hasType: false,
            hasRequiredProperties: false,
            visibleContentMatches: false,
          },
          richSnippetNotice: 'Valid syntax does not guarantee rich results or preferential search ranking.',
        };
      }
    }

    const errors: SchemaValidationIssue[] = [];
    const warnings: SchemaValidationIssue[] = [];
    const consistencyIssues: SchemaValidationIssue[] = [];

    // 1. @context check
    if (!jsonLd['@context'] || !jsonLd['@context'].includes('schema.org')) {
      errors.push({
        severity: 'error',
        property: '@context',
        message: 'Missing or invalid @context. Must be "https://schema.org".',
        googleDocRef: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
      });
    }

    // 2. @type check
    const schemaType = jsonLd['@type'];
    if (!schemaType) {
      errors.push({
        severity: 'error',
        property: '@type',
        message: 'Missing @type property.',
        googleDocRef: 'https://developers.google.com/search/docs/appearance/structured-data/article',
      });
    }

    // 3. Article / TechArticle / BlogPosting / NewsArticle Validation
    if (['Article', 'NewsArticle', 'BlogPosting', 'TechArticle'].includes(schemaType)) {
      // Required: headline
      if (!jsonLd.headline || typeof jsonLd.headline !== 'string' || !jsonLd.headline.trim()) {
        errors.push({
          severity: 'error',
          property: 'headline',
          message: 'headline is required by Google for Article structured data.',
          googleDocRef: 'https://developers.google.com/search/docs/appearance/structured-data/article#article',
        });
      } else if (jsonLd.headline.length > 110) {
        warnings.push({
          severity: 'warning',
          property: 'headline',
          message: 'headline exceeds 110 characters. Google guidelines recommend concise headlines.',
        });
      }

      // Required: image
      if (!jsonLd.image || (Array.isArray(jsonLd.image) && jsonLd.image.length === 0)) {
        errors.push({
          severity: 'error',
          property: 'image',
          message: 'image property is required. Google requires high-resolution image URLs.',
          googleDocRef: 'https://developers.google.com/search/docs/appearance/structured-data/article#guidelines',
        });
      }

      // Required: datePublished
      if (!jsonLd.datePublished) {
        errors.push({
          severity: 'error',
          property: 'datePublished',
          message: 'datePublished is required in ISO 8601 format.',
        });
      }

      // Recommended: author
      if (!jsonLd.author || !jsonLd.author.name) {
        errors.push({
          severity: 'error',
          property: 'author',
          message: 'author object with name is required by Google Search.',
        });
      }

      // Recommended: publisher
      if (!jsonLd.publisher || !jsonLd.publisher.name) {
        warnings.push({
          severity: 'warning',
          property: 'publisher',
          message: 'publisher object is recommended for news and tech publications.',
        });
      }

      // Recommended: dateModified
      if (!jsonLd.dateModified) {
        warnings.push({
          severity: 'warning',
          property: 'dateModified',
          message: 'dateModified is recommended to signal content freshness.',
        });
      }

      // 4. Visible Content Consistency Checks
      if (visibleContent) {
        if (visibleContent.title && jsonLd.headline && visibleContent.title.trim() !== jsonLd.headline.trim()) {
          consistencyIssues.push({
            severity: 'warning',
            property: 'headline',
            message: `Schema headline ("${jsonLd.headline}") does not match visible page headline ("${visibleContent.title}"). Google requires schema to accurately reflect visible text.`,
          });
        }

        if (visibleContent.author && jsonLd.author?.name && !jsonLd.author.name.toLowerCase().includes(visibleContent.author.toLowerCase())) {
          consistencyIssues.push({
            severity: 'notice',
            property: 'author.name',
            message: `Schema author ("${jsonLd.author.name}") differs from visible author badge ("${visibleContent.author}").`,
          });
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      schemaType: schemaType || 'Unknown',
      isValid,
      jsonLd,
      errors,
      warnings,
      consistencyIssues,
      googleGuidelineCompliance: {
        hasContext: errors.every((e) => e.property !== '@context'),
        hasType: Boolean(schemaType),
        hasRequiredProperties: isValid,
        visibleContentMatches: consistencyIssues.length === 0,
      },
      richSnippetNotice: 'Valid Schema.org markup conforms to Google technical requirements, but search engines dynamically determine actual rich snippet display at query time.',
    };
  }

  /**
   * Save validation run for an article
   */
  async saveValidation(articleId: string, result: SchemaValidationResult): Promise<any> {
    const [saved] = await db.insert(schema.seoSchemaValidations).values({
      articleId,
      schemaType: result.schemaType,
      jsonLd: result.jsonLd,
      isValid: result.isValid,
      errorsJson: result.errors,
      warningsJson: result.warnings,
      consistencyIssuesJson: result.consistencyIssues,
      validatedAt: new Date(),
    }).returning();

    return saved;
  }
}

export const schemaValidatorService = new SchemaValidatorService();
