import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc, ne } from 'drizzle-orm';

export interface InternalLinkCandidate {
  targetArticleId: string;
  targetTitle: string;
  targetSlug: string;
  recommendedAnchorText: string;
  contextSnippet: string; // Surrounding text where the link should be inserted
  relevanceScore: number; // 0-100
  alreadyLinked: boolean;
}

export interface InternalLinkingReport {
  articleId: string;
  articleTitle: string;
  outboundLinksCount: number;
  inboundLinksCount: number;
  isOrphanPage: boolean;
  isUnderlinked: boolean;
  isPillarPageCandidate: boolean;
  repetitiveLinks: { targetUrl: string; count: number }[];
  recommendations: InternalLinkCandidate[];
}

export class InternalLinkingService {
  /**
   * Analyze an article's internal links and discover contextual linking opportunities
   */
  async analyzeArticle(articleId: string, currentContentHtml?: string): Promise<InternalLinkingReport> {
    const article = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found.`);
    }

    const htmlToAnalyze = currentContentHtml || article.contentHtml || '';
    const $ = cheerio.load(htmlToAnalyze);

    // 1. Analyze existing outbound links in this article
    const outboundHrefs: string[] = [];
    const hrefCounts = new Map<string, number>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim() || '';
      if (href.startsWith('/') || href.includes('blogs.dailybuild.tech')) {
        const cleanHref = href.replace(/^https?:\/\/blogs\.dailybuild\.tech/, '').replace(/\/$/, '');
        outboundHrefs.push(cleanHref);
        hrefCounts.set(cleanHref, (hrefCounts.get(cleanHref) || 0) + 1);
      }
    });

    const repetitiveLinks: { targetUrl: string; count: number }[] = [];
    for (const [targetUrl, count] of hrefCounts.entries()) {
      if (count > 2) {
        repetitiveLinks.push({ targetUrl, count });
      }
    }

    // 2. Fetch all other published articles to count inbound links and find semantic matches
    const allArticles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        contentHtml: true,
        tags: true,
      },
    });

    // Inbound links to this article
    const thisSlug = article.slug;
    let inboundLinksCount = 0;

    for (const other of allArticles) {
      if (other.id === articleId) continue;
      if (other.contentHtml && (other.contentHtml.includes(`/article/${thisSlug}`) || other.contentHtml.includes(thisSlug))) {
        inboundLinksCount++;
      }
    }

    const isOrphanPage = inboundLinksCount === 0;
    const isUnderlinked = inboundLinksCount < 2;

    // A pillar page candidate typically has substantial depth and acts as a central hub
    const wordCount = $('body').text().split(/\s+/).filter(Boolean).length;
    const isPillarPageCandidate = wordCount > 1500 && outboundHrefs.length >= 5;

    // 3. Discover high-relevance internal linking opportunities
    const recommendations: InternalLinkCandidate[] = [];
    const bodyText = $('body').text();

    for (const target of allArticles) {
      if (target.id === articleId) continue;
      const targetSlugPath = `/article/${target.slug}`;
      const alreadyLinked = outboundHrefs.includes(targetSlugPath) || outboundHrefs.some((h) => h.includes(target.slug));

      // Extract high-value keywords from target title and tags
      const titleKeywords = target.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'into', 'your', 'guide', 'what'].includes(w));

      // Check tags
      const targetTags = Array.isArray(target.tags) ? (target.tags as string[]).map((t) => t.toLowerCase()) : [];
      const candidatePhrases = [...titleKeywords, ...targetTags];

      for (const phrase of candidatePhrases) {
        const regex = new RegExp(`\\b(${phrase})\\b`, 'i');
        const match = bodyText.match(regex);

        if (match && match.index !== undefined) {
          // Extract context snippet surrounding the phrase (~80 chars)
          const start = Math.max(0, match.index - 40);
          const end = Math.min(bodyText.length, match.index + phrase.length + 40);
          const snippet = `...${bodyText.substring(start, end).trim()}...`;

          recommendations.push({
            targetArticleId: target.id,
            targetTitle: target.title,
            targetSlug: target.slug,
            recommendedAnchorText: match[0],
            contextSnippet: snippet,
            relevanceScore: Math.min(95, 70 + (targetTags.includes(phrase) ? 15 : 10)),
            alreadyLinked,
          });
          break; // One recommendation per target article
        }
      }
    }

    // Sort by relevance, unlinked candidates first
    recommendations.sort((a, b) => {
      if (a.alreadyLinked !== b.alreadyLinked) {
        return a.alreadyLinked ? 1 : -1;
      }
      return b.relevanceScore - a.relevanceScore;
    });

    return {
      articleId,
      articleTitle: article.title,
      outboundLinksCount: outboundHrefs.length,
      inboundLinksCount,
      isOrphanPage,
      isUnderlinked,
      isPillarPageCandidate,
      repetitiveLinks,
      recommendations: recommendations.slice(0, 8),
    };
  }

  /**
   * Apply an approved internal link suggestion directly to the article HTML
   */
  async applyInternalLink(articleId: string, anchorText: string, targetSlug: string): Promise<string> {
    const article = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found.`);
    }

    let html = article.contentHtml;
    // Replace the first plain-text occurrence of anchorText that is NOT already inside an <a> tag
    // Safe replacement: find occurrence in paragraph tags
    const linkTarget = `/article/${targetSlug}`;
    const escapedAnchor = anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Replace first unlinked match inside a <p> tag
    const pRegex = new RegExp(`(<p[^>]*>.*?)\\b(${escapedAnchor})\\b(.*?<\\/p>)`, 'i');
    if (pRegex.test(html)) {
      html = html.replace(pRegex, (_match, prefix, matchedText, suffix) => {
        // If already has <a href before it in the same paragraph without closing, skip
        if (prefix.includes('<a ') && !prefix.includes('</a>')) return _match;
        return `${prefix}<a href="${linkTarget}" class="text-primary hover:underline font-semibold">${matchedText}</a>${suffix}`;
      });

      await db.update(schema.articles)
        .set({ contentHtml: html, updatedAt: new Date() })
        .where(eq(schema.articles.id, articleId));
    }

    return html;
  }

  /**
   * Retrieve site-wide orphan pages and underlinked articles
   */
  async getSiteLinkGraphOverview(): Promise<{
    totalPages: number;
    orphanPages: { id: string; title: string; slug: string; createdAt: Date }[];
    underlinkedPages: { id: string; title: string; slug: string; inboundCount: number }[];
    pillarPages: { id: string; title: string; slug: string; outboundCount: number }[];
  }> {
    const articles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: { id: true, title: true, slug: true, contentHtml: true, createdAt: true },
    });

    const inboundMap = new Map<string, number>();
    const outboundMap = new Map<string, number>();

    for (const a of articles) {
      inboundMap.set(a.id, 0);
      outboundMap.set(a.id, 0);
    }

    for (const source of articles) {
      const html = source.contentHtml || '';
      for (const target of articles) {
        if (source.id === target.id) continue;
        if (html.includes(`/article/${target.slug}`) || html.includes(`href="${target.slug}"`)) {
          inboundMap.set(target.id, (inboundMap.get(target.id) || 0) + 1);
          outboundMap.set(source.id, (outboundMap.get(source.id) || 0) + 1);
        }
      }
    }

    const orphanPages: any[] = [];
    const underlinkedPages: any[] = [];
    const pillarPages: any[] = [];

    for (const a of articles) {
      const inCount = inboundMap.get(a.id) || 0;
      const outCount = outboundMap.get(a.id) || 0;

      if (inCount === 0) {
        orphanPages.push({ id: a.id, title: a.title, slug: a.slug, createdAt: a.createdAt });
      } else if (inCount < 2) {
        underlinkedPages.push({ id: a.id, title: a.title, slug: a.slug, inboundCount: inCount });
      }

      if (outCount >= 4) {
        pillarPages.push({ id: a.id, title: a.title, slug: a.slug, outboundCount: outCount });
      }
    }

    return {
      totalPages: articles.length,
      orphanPages,
      underlinkedPages,
      pillarPages,
    };
  }
}

export const internalLinkingService = new InternalLinkingService();
