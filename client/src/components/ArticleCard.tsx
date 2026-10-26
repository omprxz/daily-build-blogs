import React from 'react';
import { Clock, TrendingUp, Calendar, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { Link } from 'react-router-dom';

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

export type ArticleCardVariant = 
  | 'standard' 
  | 'vertical' 
  | 'horizontal' 
  | 'lead' 
  | 'featured' 
  | 'compact' 
  | 'trending' 
  | 'bento' 
  | 'image-only' 
  | 'text-only' 
  | 'overlay';

interface ArticleCardProps {
  article: ArticleItem;
  variant?: ArticleCardVariant;
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

  // 1. Featured Lead Story Variant (Hero Magazine Presentation)
  if (variant === 'lead' || variant === 'featured') {
    return (
      <article className="group relative editorial-card flex flex-col rounded-3xl overflow-hidden border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] hover:shadow-xl hover:border-primary/40 transition-all duration-300">
        {article.featuredImage ? (
          <div className="w-full relative aspect-video overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-4">
            <Link to={`/article/${article.slug}`} className="block w-full h-full flex items-center justify-center" aria-label={article.title}>
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                width="1200"
                height="675"
                fetchPriority="high"
                decoding="async"
                loading="eager"
                className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500 ease-out"
              />
            </Link>

            {/* Badge for Artwork */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700/60 pointer-events-none shadow-md">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Lead Dispatch</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-white text-center relative overflow-hidden border-b border-slate-800">
            <span className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Featured Dispatch</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">{article.category?.name || 'Featured Story'}</span>
          </div>
        )}

        <div className="w-full p-6 sm:p-8 flex flex-col justify-between flex-1">
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {article.category && (
                <Link
                  to={`/category/${article.category.slug}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                  {article.category.name}
                </Link>
              )}
              {article.isTrending && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <TrendingUp className="w-3 h-3" /> Trending
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink-950 dark:text-white leading-snug tracking-tight mb-3 group-hover:text-primary transition-colors">
              <Link to={`/article/${article.slug}`}>{article.title}</Link>
            </h2>

            <p className="text-ink-600 dark:text-ink-300 text-sm sm:text-base leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal">
              {article.excerpt}
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-ink-600 dark:text-ink-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <time>{publishedDate}</time>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" /> {article.readingTimeMins} min read
              </span>
            </div>

            <Link
              to={`/article/${article.slug}`}
              aria-label={`Read story: ${article.title}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform py-1 px-2 rounded-lg bg-primary/10"
            >
              <span>Read Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // 2. Horizontal Article Card Variant (Image Left, Content Right)
  if (variant === 'horizontal') {
    const horizImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] hover:border-primary/40 hover:shadow-md transition-all">
        {article.featuredImage && (
          <div className="w-full sm:w-56 md:w-64 aspect-video flex-shrink-0 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-200/80 dark:border-slate-800">
            <Link to={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full flex items-center justify-center">
              <img
                src={horizImgUrl}
                alt={article.featuredImageAlt || article.title}
                width="480"
                height="270"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {article.category && (
                <Link
                  to={`/category/${article.category.slug}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                  {article.category.name}
                </Link>
              )}
              {article.isTrending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <TrendingUp className="w-2.5 h-2.5" /> Trending
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
              <Link to={`/article/${article.slug}`}>{article.title}</Link>
            </h3>

            <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 font-normal">
              {article.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-400 pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] font-medium">
            <div className="flex items-center gap-2.5">
              <time>{publishedDate}</time>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" /> {article.readingTimeMins}m read
              </span>
            </div>

            <Link
              to={`/article/${article.slug}`}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Read</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // 3. Compact / Trending Rail Variant (Numbered Minimal DEV-Style List Item)
  if (variant === 'compact' || variant === 'trending') {
    const formattedRank = String(index + 1).padStart(2, '0');
    const compactImgUrl = getOptimizedImg(article.featuredImage, 240);

    return (
      <article className="group flex gap-3.5 items-start py-3.5 px-3 rounded-xl hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-all border-b border-slate-100 dark:border-white/[0.06] last:border-0">
        <span className="text-base font-black font-mono text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors pt-0.5 flex-shrink-0">
          {formattedRank}
        </span>

        <div className="flex-1 min-w-0">
          {article.category && (
            <Link
              to={`/category/${article.category.slug}`}
              className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 mb-1"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
              {article.category.name}
            </Link>
          )}
          <h3 className="text-xs sm:text-sm font-bold text-ink-950 dark:text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1.5">
            <Link to={`/article/${article.slug}`}>{article.title}</Link>
          </h3>
          <div className="text-[11px] text-ink-500 flex items-center gap-2 font-medium">
            <span>{publishedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" /> {article.readingTimeMins}m read
            </span>
          </div>
        </div>

        {article.featuredImage && (
          <Link
            to={`/article/${article.slug}`}
            className="flex-shrink-0 w-16 aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center p-0.5"
            aria-label={article.title}
          >
            <img
              src={compactImgUrl}
              alt={article.featuredImageAlt || article.title}
              width="64"
              height="36"
              decoding="async"
              loading="lazy"
              className="w-full h-full object-contain"
            />
          </Link>
        )}
      </article>
    );
  }

  // 4. Bento Feature Variant
  if (variant === 'bento') {
    const bentoImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-2xl overflow-hidden p-5 sm:p-6 flex flex-col justify-between border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] hover:border-primary/40 hover:shadow-lg transition-all">
        <div>
          {article.featuredImage && (
            <div className="aspect-video rounded-xl overflow-hidden bg-slate-950 mb-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center p-2 relative">
              <Link to={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full flex items-center justify-center">
                <img
                  src={bentoImgUrl}
                  alt={article.featuredImageAlt || article.title}
                  width="588"
                  height="331"
                  decoding="async"
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between mb-2.5">
            {article.category && (
              <Link
                to={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </Link>
            )}
            <span className="text-[11px] font-medium text-ink-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" /> {article.readingTimeMins}m read
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            <Link to={`/article/${article.slug}`}>{article.title}</Link>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4 font-normal">
            {article.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-500 pt-3 border-t border-slate-100 dark:border-white/[0.06] font-medium">
          <time className="text-[11px]">{publishedDate}</time>
          <Link
            to={`/article/${article.slug}`}
            aria-label={`Read story: ${article.title}`}
            className="text-primary font-bold text-xs hover:underline inline-flex items-center gap-1"
          >
            <span>Read story</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </article>
    );
  }

  // 5. Standard / Vertical Editorial Card Variant
  const standardImgUrl = getOptimizedImg(article.featuredImage, 640);

  return (
    <article className="group editorial-card rounded-2xl overflow-hidden flex flex-col justify-between border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] hover:border-primary/40 hover:shadow-lg transition-all">
      <div>
        {article.featuredImage && (
          <div className="aspect-video overflow-hidden bg-slate-950 relative border-b border-slate-100 dark:border-slate-800 flex items-center justify-center p-2">
            <Link to={`/article/${article.slug}`} className="block w-full h-full flex items-center justify-center" aria-label={article.title}>
              <img
                src={standardImgUrl}
                alt={article.featuredImageAlt || article.title}
                width="588"
                height="331"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>
        )}

        <div className="p-5 sm:p-6">
          {article.category && (
            <div className="mb-3">
              <Link
                to={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </Link>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
            <Link to={`/article/${article.slug}`}>{article.title}</Link>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 font-normal">
            {article.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-6 pb-4 pt-3 flex items-center justify-between text-xs text-ink-500 border-t border-slate-100 dark:border-white/[0.06] font-medium">
        <time className="text-[11px]">{publishedDate}</time>
        <span className="flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3 text-primary" /> {article.readingTimeMins} min read
        </span>
      </div>
    </article>
  );
};
