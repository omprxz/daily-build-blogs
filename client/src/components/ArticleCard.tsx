import React from 'react';
import { Clock, TrendingUp, Calendar, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
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

  // 1. Featured Lead Story Variant (Prominent Hero Editorial Presentation)
  if (variant === 'lead' || variant === 'featured') {
    return (
      <article className="group relative editorial-card hero-editorial-frame flex flex-col rounded-2xl overflow-hidden transition-colors">
        {article.featuredImage ? (
          <div className="w-full relative aspect-video overflow-hidden bg-slate-950 flex items-center justify-center p-2 sm:p-3">
            <a href={`/article/${article.slug}`} className="block w-full h-full flex items-center justify-center" aria-label={article.title}>
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                width="1200"
                height="675"
                fetchPriority="high"
                decoding="async"
                loading="eager"
                className="w-full h-full object-contain"
              />
            </a>

            {/* Badge for Artwork */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-slate-700/60 pointer-events-none">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Editorial Visual</span>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center p-8 text-white text-center relative overflow-hidden border-b border-slate-800">
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">Featured Dispatch</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">{article.category?.name || 'Featured Story'}</span>
          </div>
        )}

        <div className="w-full p-6 sm:p-7 lg:p-8 flex flex-col justify-between bg-white dark:bg-[#0c1220]">
          <div>
            <div className="flex items-center gap-2 mb-3.5 flex-wrap">
              {article.category && (
                <a
                  href={`/category/${article.category.slug}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors min-h-[30px]`}
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

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-ink-950 dark:text-white leading-snug tracking-tight mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              <a href={`/article/${article.slug}`}>{article.title}</a>
            </h2>

            <p className="text-ink-600 dark:text-ink-300 text-sm sm:text-base leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal">
              {article.excerpt}
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-ink-600 dark:text-ink-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <time>{publishedDate}</time>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> {article.readingTimeMins} min read
              </span>
            </div>

            <a
              href={`/article/${article.slug}`}
              aria-label={`Read story: ${article.title}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1 px-1.5"
            >
              <span>Read Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </article>
    );
  }

  // 2. Horizontal Article Card Variant (Image Left/Top, Content Side)
  if (variant === 'horizontal') {
    const horizImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-stretch transition-colors">
        {article.featuredImage && (
          <div className="w-full sm:w-56 md:w-64 aspect-video flex-shrink-0 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-slate-200/80 dark:border-slate-800/80">
            <a href={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full flex items-center justify-center">
              <img
                src={horizImgUrl}
                alt={article.featuredImageAlt || article.title}
                width="480"
                height="270"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-contain"
              />
            </a>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {article.category && (
                <a
                  href={`/category/${article.category.slug}`}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                  {article.category.name}
                </a>
              )}
              {article.isTrending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                  <TrendingUp className="w-2.5 h-2.5" /> Trending
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              <a href={`/article/${article.slug}`}>{article.title}</a>
            </h3>

            <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 font-normal">
              {article.excerpt}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-ink-600 dark:text-ink-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/70 font-medium">
            <div className="flex items-center gap-2.5">
              <time>{publishedDate}</time>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins}m read
              </span>
            </div>

            <a
              href={`/article/${article.slug}`}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Read</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </article>
    );
  }

  // 3. Image-Only Card Variant (Framed Media Focus with Subtle Overlay Bar)
  if (variant === 'image-only') {
    const imgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-xl overflow-hidden flex flex-col transition-colors">
        <div className="w-full aspect-video bg-slate-950 flex items-center justify-center p-2 relative overflow-hidden">
          <a href={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full flex items-center justify-center">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={article.featuredImageAlt || article.title}
                width="640"
                height="360"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center text-slate-500 text-xs font-mono">
                {article.title}
              </div>
            )}
          </a>
          {article.category && (
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900/90 text-slate-200 border border-slate-700/60 backdrop-blur-xs">
                {article.category.name}
              </span>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0c1220] flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-semibold text-xs text-ink-900 dark:text-white truncate flex-1 mr-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h4>
          <span className="text-[11px] text-ink-500 font-mono whitespace-nowrap">{article.readingTimeMins}m read</span>
        </div>
      </article>
    );
  }

  // 4. Text-Only Card Variant (Pure Editorial Depth without Visual Image)
  if (variant === 'text-only' || !article.featuredImage && variant === 'standard') {
    return (
      <article className="group editorial-card rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-colors space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            {article.category && (
              <a
                href={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </a>
            )}
            <span className="text-[11px] font-mono text-ink-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins} min read
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-3 font-normal">
            {article.excerpt}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-ink-500 font-medium">
          <time className="text-[11px]">{publishedDate}</time>
          <a
            href={`/article/${article.slug}`}
            aria-label={`Read story: ${article.title}`}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1 text-xs"
          >
            <span>Read dispatch</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </article>
    );
  }

  // 5. Image Card with Title Overlay Variant (Gradient Scrim)
  if (variant === 'overlay') {
    const overlayImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-xl overflow-hidden relative aspect-video bg-slate-950 transition-colors">
        {overlayImgUrl && (
          <img
            src={overlayImgUrl}
            alt={article.featuredImageAlt || article.title}
            width="640"
            height="360"
            decoding="async"
            loading="lazy"
            className="w-full h-full object-contain opacity-75"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-4 sm:p-5 flex flex-col justify-end">
          {article.category && (
            <div className="mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-600/90 text-white">
                {article.category.name}
              </span>
            </div>
          )}
          <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 mb-2 group-hover:text-indigo-300 transition-colors">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
            <span>{publishedDate}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> {article.readingTimeMins}m read
            </span>
          </div>
        </div>
      </article>
    );
  }

  // 6. Compact / Trending Rail Variant (Numbered DEV-Style List Item)
  if (variant === 'compact' || variant === 'trending') {
    const formattedRank = String(index + 1).padStart(2, '0');
    const compactImgUrl = getOptimizedImg(article.featuredImage, 240);

    return (
      <article className="group flex gap-3.5 items-start py-3.5 px-2 rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-0">
        <span className="text-base font-bold font-mono text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pt-0.5 flex-shrink-0">
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
          <h3 className="text-xs sm:text-sm font-semibold text-ink-950 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>
          <div className="text-[11px] text-ink-500 flex items-center gap-2 font-medium">
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
            className="flex-shrink-0 w-16 aspect-video rounded-md overflow-hidden bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center p-0.5"
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
          </a>
        )}
      </article>
    );
  }

  // 7. Bento Feature Variant
  if (variant === 'bento') {
    const bentoImgUrl = getOptimizedImg(article.featuredImage, 640);

    return (
      <article className="group editorial-card rounded-xl overflow-hidden p-5 flex flex-col justify-between transition-colors">
        <div>
          {article.featuredImage && (
            <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 mb-4 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center p-2 relative">
              <a href={`/article/${article.slug}`} aria-label={article.title} className="block w-full h-full flex items-center justify-center">
                <img
                  src={bentoImgUrl}
                  alt={article.featuredImageAlt || article.title}
                  width="588"
                  height="331"
                  decoding="async"
                  loading="lazy"
                  className="w-full h-full object-contain"
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
            <span className="text-[11px] font-medium text-ink-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins}m read
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-4 font-normal">
            {article.excerpt}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-500 pt-3 border-t border-slate-100 dark:border-slate-800/80 font-medium">
          <time className="text-[11px]">{publishedDate}</time>
          <a
            href={`/article/${article.slug}`}
            aria-label={`Read story: ${article.title}`}
            className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:underline inline-flex items-center gap-1"
          >
            <span>Read story</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </article>
    );
  }

  // 8. Standard / Vertical Editorial Card Variant
  const standardImgUrl = getOptimizedImg(article.featuredImage, 640);

  return (
    <article className="group editorial-card rounded-xl overflow-hidden flex flex-col justify-between transition-colors">
      <div>
        {article.featuredImage && (
          <div className="aspect-video overflow-hidden bg-slate-950 relative border-b border-slate-100 dark:border-slate-800 flex items-center justify-center p-2">
            <a href={`/article/${article.slug}`} className="block w-full h-full flex items-center justify-center" aria-label={article.title}>
              <img
                src={standardImgUrl}
                alt={article.featuredImageAlt || article.title}
                width="588"
                height="331"
                decoding="async"
                loading="lazy"
                className="w-full h-full object-contain"
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

          <h3 className="text-base sm:text-lg font-bold text-ink-950 dark:text-white leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
            <a href={`/article/${article.slug}`}>{article.title}</a>
          </h3>

          <p className="text-ink-600 dark:text-ink-300 text-xs sm:text-sm leading-relaxed line-clamp-2 sm:line-clamp-3 font-normal">
            {article.excerpt}
          </p>
        </div>
      </div>

      <div className="px-5 pb-4 pt-3 flex items-center justify-between text-xs text-ink-500 border-t border-slate-100 dark:border-slate-800/80 font-medium">
        <time className="text-[11px]">{publishedDate}</time>
        <span className="flex items-center gap-1 text-[11px]">
          <Clock className="w-3 h-3 text-indigo-500" /> {article.readingTimeMins} min read
        </span>
      </div>
    </article>
  );
};
