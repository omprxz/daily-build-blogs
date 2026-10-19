import React from 'react';
import { Clock, TrendingUp, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  readingTimeMins: number;
  publishedAt?: string | null;
  createdAt: string;
  isFeaturedLead?: boolean;
  isTrending?: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  } | null;
}

interface ArticleCardProps {
  article: ArticleItem;
  variant?: 'lead' | 'standard' | 'compact' | 'bento';
  index?: number;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, variant = 'standard', index = 0 }) => {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date(article.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const categoryTheme = getCategoryTheme(article.category?.slug);

  const getOptimizedImg = (url: string | null | undefined, targetWidth: number) => {
    if (!url) return undefined;
    if (url.startsWith('/uploads/')) {
      return `${url}?w=${targetWidth}`;
    }
    return url;
  };

  // 1. Featured Lead Story Variant (16:9 Vertical Lead Card - Critical LCP Element)
  if (variant === 'lead') {
    return (
      <article className="group relative editorial-card hero-editorial-frame flex flex-col transition-all duration-300">
        {article.featuredImage ? (
          <div className="w-full relative aspect-video overflow-hidden bg-ink-900">
            <a href={`/article/${article.slug}`} className="block w-full h-full relative" aria-label={article.title}>
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                width="1200"
                height="675"
                fetchPriority="high"
                decoding="async"
                loading="eager"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
              />
            </a>

            {/* Micro Badge for Artwork Style */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-semibold text-white/95 border border-white/20 shadow-sm pointer-events-none">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Editorial Cover Art</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-indigo-950 via-slate-900 to-ink-950 flex flex-col items-center justify-center p-8 text-white text-center relative overflow-hidden">
            <div className="w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl absolute -top-10 -left-10" />
            <div className="w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl absolute -bottom-10 -right-10" />
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">Featured Dispatch</span>
            <span className="text-2xl font-bold tracking-tight opacity-90">{article.category?.name || 'Featured Story'}</span>
          </div>
        )}

        <div className="w-full p-6 sm:p-7 lg:p-8 flex flex-col justify-between bg-white dark:bg-[#0c1220]">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              {article.category && (
                <a
                  href={`/category/${article.category.slug}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors min-h-[32px]`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                  {article.category.name}
                </a>
              )}
              {article.isTrending && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <TrendingUp className="w-3 h-3" /> Trending
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-ink-900 dark:text-white leading-snug tracking-tight mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <a href={`/article/${article.slug}`}>{article.title}</a>
            </h2>

            <p className="text-ink-600 dark:text-ink-300 text-sm sm:text-base leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal">
              {article.excerpt}
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-ink-100 dark:border-white/[0.08] flex items-center justify-between text-xs text-ink-600 dark:text-ink-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-ink-500" />
                <time>{publishedDate}</time>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {article.readingTimeMins} min read
              </span>
            </div>

            <a
              href={`/article/${article.slug}`}
              aria-label={`Read story: ${article.title}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 group/link transition-colors py-1 px-1.5"
            >
              <span>Read Story</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </article>
    );
  }

  // 2. Compact List Variant (DEV-Style Numbered / Trending Rail)
  if (variant === 'compact') {
    const formattedRank = String(index + 1).padStart(2, '0');
    const compactImgUrl = getOptimizedImg(article.featuredImage, 240);

    return (
      <article className="group flex gap-3.5 items-start py-3.5 px-2 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors border-b border-ink-100 dark:border-white/[0.06] last:border-0">
        <span className="text-base font-bold font-mono text-ink-600 dark:text-ink-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pt-0.5 flex-shrink-0">
          {formattedRank}
        </span>

        <div className="flex-1 min-w-0">
          {article.category && (
            <a
              href={`/category/${article.category.slug}`}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 mb-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
              {article.category.name}
            </a>
          )}
          <h3 className="text-xs sm:text-sm font-semibold text-ink-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>
          <div className="text-[11px] text-ink-600 dark:text-ink-300 flex items-center gap-2 font-medium">
            <span>{publishedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins}m read
            </span>
          </div>
        </div>

        {article.featuredImage && (
          <a
            href={`/article/${article.slug}`}
            className="flex-shrink-0 w-16 aspect-video rounded-lg overflow-hidden bg-ink-100 dark:bg-ink-850 border border-ink-200/50 dark:border-white/10"
            aria-label={article.title}
          >
            <img
              src={compactImgUrl}
              alt={article.featuredImageAlt || article.title}
              width="64"
              height="36"
              decoding="async"
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </a>
        )}
      </article>
    );
  }

  // 3. Bento Grid Accent Variant (Editorial Feature Tile)
  if (variant === 'bento') {
    const bentoImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-2xl overflow-hidden p-5 flex flex-col justify-between">
        <div>
          {article.featuredImage && (
            <div className="aspect-video rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-900 mb-4 border border-ink-200/60 dark:border-white/[0.08] relative">
              <a href={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full">
                <img
                  src={bentoImgUrl}
                  alt={article.featuredImageAlt || article.title}
                  width="588"
                  height="331"
                  decoding="async"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400 ease-out"
                />
              </a>
            </div>
          )}

          <div className="flex items-center justify-between mb-2.5">
            {article.category && (
              <a
                href={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </a>
            )}
            <span className="text-[11px] font-medium text-ink-600 dark:text-ink-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins}m read
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-ink-900 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4 font-normal">
            {article.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-300 pt-3 border-t border-ink-100 dark:border-white/[0.06]">
          <time className="font-medium text-[11px]">{publishedDate}</time>
          <a
            href={`/article/${article.slug}`}
            aria-label={`Read story: ${article.title}`}
            className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:underline inline-flex items-center gap-1 py-1"
          >
            <span>Read story &rarr;</span>
          </a>
        </div>
      </article>
    );
  }

  // 4. Standard Feed Card (16:9 Editorial Layout with separated touch targets)
  const standardImgUrl = getOptimizedImg(article.featuredImage, 640);

  return (
    <article className="group editorial-card rounded-2xl overflow-hidden flex flex-col justify-between">
      <div>
        {article.featuredImage && (
          <div className="aspect-video overflow-hidden bg-ink-100 dark:bg-ink-900 relative border-b border-ink-100 dark:border-white/[0.06]">
            <a href={`/article/${article.slug}`} className="block w-full h-full" aria-label={article.title}>
              <img
                src={standardImgUrl}
                alt={article.featuredImageAlt || article.title}
                width="588"
                height="331"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400 ease-out"
              />
            </a>
          </div>
        )}

        <div className="p-5">
          {article.category && (
            <div className="mb-2.5">
              <a
                href={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors min-h-[28px]`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </a>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-ink-900 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 font-normal">
            {article.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 pb-4 pt-3 flex items-center justify-between text-xs text-ink-600 dark:text-ink-300 border-t border-ink-100 dark:border-white/[0.06] font-medium">
        <time className="text-[11px] text-ink-600 dark:text-ink-300">{publishedDate}</time>
        <span className="flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins} min read
        </span>
      </div>
    </article>
  );
};
