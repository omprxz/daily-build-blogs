import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface DuplicateClusterItem {
  articleA: { id: string; title: string; slug: string };
  articleB: { id: string; title: string; slug: string };
  similarityScore: number; // 0-100%
  duplicateType: 'exact_title' | 'identical_meta' | 'near_duplicate_content' | 'keyword_cannibalization';
  snippetPreviewA: string;
  snippetPreviewB: string;
  recommendedAction: 'differentiate' | 'consolidate' | 'canonicalize' | '301_redirect';
  actionDetails: string;
}

export interface DuplicateContentReport {
  totalAnalyzed: number;
  duplicateIssuesCount: number;
  clusters: DuplicateClusterItem[];
  scannedAt: string;
}

export class DuplicateContentService {
  /**
   * Run site-wide similarity and cannibalization analysis across all published articles
   */
  async scanForDuplicates(): Promise<DuplicateContentReport> {
    const articles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        contentHtml: true,
        metaTitle: true,
        metaDescription: true,
        publishedAt: true,
      },
      orderBy: [desc(schema.articles.publishedAt)],
      limit: 60,
    });

    const clusters: DuplicateClusterItem[] = [];

    // Pre-process text representations
    const processed = articles.map((a) => {
      const $ = cheerio.load(a.contentHtml || '');
      $('script, style, nav, footer, header').remove();
      const rawText = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
      const shingles = this.createShingles(rawText, 4); // 4-word shingles
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        metaTitle: (a.metaTitle || a.title).toLowerCase().trim(),
        metaDescription: (a.metaDescription || a.excerpt || '').toLowerCase().trim(),
        rawText,
        shingles,
      };
    });

    // Pairwise comparison
    for (let i = 0; i < processed.length; i++) {
      for (let j = i + 1; j < processed.length; j++) {
        const itemA = processed[i];
        const itemB = processed[j];

        // 1. Exact Title match
        if (itemA.title.toLowerCase().trim() === itemB.title.toLowerCase().trim()) {
          clusters.push({
            articleA: { id: itemA.id, title: itemA.title, slug: itemA.slug },
            articleB: { id: itemB.id, title: itemB.title, slug: itemB.slug },
            similarityScore: 100,
            duplicateType: 'exact_title',
            snippetPreviewA: itemA.title,
            snippetPreviewB: itemB.title,
            recommendedAction: 'differentiate',
            actionDetails: 'Articles share identical headlines. Differentiate titles to target specific distinct developer intents or subtopics.',
          });
          continue;
        }

        // 2. Identical Meta Description
        if (itemA.metaDescription && itemB.metaDescription && itemA.metaDescription === itemB.metaDescription && itemA.metaDescription.length > 30) {
          clusters.push({
            articleA: { id: itemA.id, title: itemA.title, slug: itemA.slug },
            articleB: { id: itemB.id, title: itemB.title, slug: itemB.slug },
            similarityScore: 95,
            duplicateType: 'identical_meta',
            snippetPreviewA: itemA.metaDescription.substring(0, 80) + '...',
            snippetPreviewB: itemB.metaDescription.substring(0, 80) + '...',
            recommendedAction: 'differentiate',
            actionDetails: 'Both articles share an identical meta description. Provide unique summaries tailored to each individual article topic.',
          });
          continue;
        }

        // 3. Near-Duplicate Content via Jaccard Shingling Similarity
        const similarity = this.calculateJaccardSimilarity(itemA.shingles, itemB.shingles);
        const similarityPct = Math.round(similarity * 100);

        if (similarityPct >= 40) {
          const action = similarityPct >= 75 ? 'canonicalize' : 'consolidate';
          clusters.push({
            articleA: { id: itemA.id, title: itemA.title, slug: itemA.slug },
            articleB: { id: itemB.id, title: itemB.title, slug: itemB.slug },
            similarityScore: similarityPct,
            duplicateType: 'near_duplicate_content',
            snippetPreviewA: itemA.rawText.substring(0, 100) + '...',
            snippetPreviewB: itemB.rawText.substring(0, 100) + '...',
            recommendedAction: action,
            actionDetails: similarityPct >= 75
              ? `High text overlap (${similarityPct}%). Point a canonical URL from the secondary piece to the authoritative primary guide, or 301 redirect.`
              : `Substantial text overlap (${similarityPct}%). Consolidate into a single definitive guide or rewrite one to focus on a distinct sub-architecture.`,
          });
        }
      }
    }

    return {
      totalAnalyzed: articles.length,
      duplicateIssuesCount: clusters.length,
      clusters,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Public helper to compute 4-word Jaccard shingle similarity between two text snippets
   */
  calculateTextSimilarity(textA: string, textB: string, n = 4): number {
    const sA = this.createShingles(textA.toLowerCase().replace(/\s+/g, ' ').trim(), n);
    const sB = this.createShingles(textB.toLowerCase().replace(/\s+/g, ' ').trim(), n);
    return this.calculateJaccardSimilarity(sA, sB);
  }

  /**
   * Create n-gram shingles from raw text
   */
  private createShingles(text: string, n = 4): Set<string> {
    const words = text.split(/\s+/).filter(Boolean);
    const shingles = new Set<string>();
    if (words.length < n) return shingles;

    for (let i = 0; i <= words.length - n; i++) {
      shingles.add(words.slice(i, i + n).join(' '));
    }
    return shingles;
  }

  /**
   * Jaccard similarity between two shingle sets: |A ∩ B| / |A ∪ B|
   */
  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}

export const duplicateContentService = new DuplicateContentService();
