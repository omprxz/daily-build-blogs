import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { config } from '../../config/index.js';
import { eq, desc } from 'drizzle-orm';

export function toAbsoluteImageUrl(imgUrl: string | null | undefined, baseUrl: string): string {
  if (!imgUrl || !imgUrl.trim()) {
    return `${baseUrl}/og-default.jpg`;
  }
  const trimmed = imgUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

export function getImageMimeType(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

export class SEOService {
  async generateSitemapXml(): Promise<string> {
    const baseUrl = config.appUrl.replace(/\/$/, '');
    const publishedArticles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      orderBy: [desc(schema.articles.publishedAt)],
    });

    const activeCategories = await db.query.categories.findMany({
      where: eq(schema.categories.isEnabled, true),
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static / Main Pages
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>hourly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/about</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/editorial-policy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/corrections-policy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.4</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/privacy-policy</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

    // Categories
    for (const cat of activeCategories) {
      xml += `  <url>\n    <loc>${baseUrl}/category/${cat.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    }

    // Published Articles
    for (const art of publishedArticles) {
      const lastMod = (art.updatedAt || art.publishedAt || new Date()).toISOString();
      xml += `  <url>\n    <loc>${baseUrl}/article/${art.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  async generateRssXml(): Promise<string> {
    const baseUrl = config.appUrl.replace(/\/$/, '');
    const articles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      orderBy: [desc(schema.articles.publishedAt)],
      limit: 30,
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">\n`;
    xml += `  <channel>\n`;
    xml += `    <title>DailyBuild Tech — Deep Insights on AI, Engineering &amp; Future Tech</title>\n`;
    xml += `    <link>${baseUrl}/</link>\n`;
    xml += `    <description>Production-ready engineering publications, artificial intelligence developments, LLM research, and developer tools.</description>\n`;
    xml += `    <language>en-us</language>\n`;
    xml += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
    xml += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />\n`;

    for (const art of articles) {
      const pubDate = (art.publishedAt || art.createdAt).toUTCString();
      xml += `    <item>\n`;
      xml += `      <title><![CDATA[${art.title}]]></title>\n`;
      xml += `      <link>${baseUrl}/article/${art.slug}</link>\n`;
      xml += `      <guid isPermaLink="true">${baseUrl}/article/${art.slug}</guid>\n`;
      xml += `      <pubDate>${pubDate}</pubDate>\n`;
      xml += `      <description><![CDATA[${art.excerpt}]]></description>\n`;
      if (art.featuredImage) {
        const absImg = toAbsoluteImageUrl(art.featuredImage, baseUrl);
        const mime = getImageMimeType(absImg);
        xml += `      <enclosure url="${absImg}" type="${mime}" />\n`;
      }
      xml += `    </item>\n`;
    }

    xml += `  </channel>\n`;
    xml += `</rss>`;
    return xml;
  }

  generateRobotsTxt(): string {
    const baseUrl = config.appUrl.replace(/\/$/, '');
    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

# AI Search and Evaluation Crawlers Policy
User-agent: GPTBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Google-Extended
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: CCBot
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: cohere-ai
Allow: /
Disallow: /admin
Disallow: /api/

User-agent: Applebot-Extended
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  }

  generateArticleJsonLd(article: typeof schema.articles.$inferSelect, authorName: string = 'DailyBuild Editorial'): object {
    const baseUrl = config.appUrl.replace(/\/$/, '');
    const socialImageUrl = toAbsoluteImageUrl(article.featuredImage, baseUrl);
    return {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.excerpt,
      image: [socialImageUrl],
      datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
      dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: authorName,
      },
      publisher: {
        '@type': 'Organization',
        name: 'DailyBuild Tech',
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/favicon.svg`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/article/${article.slug}`,
      },
    };
  }

  async findInternalLinkSuggestions(articleId: string, contentText: string): Promise<{ targetId: string; title: string; slug: string; matchedKeyword: string }[]> {
    const otherArticles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      limit: 20,
    });

    const suggestions: { targetId: string; title: string; slug: string; matchedKeyword: string }[] = [];
    const lowerContent = contentText.toLowerCase();

    for (const other of otherArticles) {
      if (other.id === articleId) continue;
      // Extract keywords from title
      const words = other.title.split(' ').filter(w => w.length > 4);
      for (const w of words) {
        const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanWord && lowerContent.includes(cleanWord)) {
          suggestions.push({
            targetId: other.id,
            title: other.title,
            slug: other.slug,
            matchedKeyword: cleanWord,
          });
          break;
        }
      }
    }

    return suggestions;
  }
}

export const seoService = new SEOService();
