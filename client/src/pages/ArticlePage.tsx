import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { 
  Clock, Calendar, Share2, ExternalLink, ChevronRight, Sparkles, 
  BookOpen, Bookmark, Check, ShieldCheck, Printer
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const ArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Check if initialData has this article (SSR Hydration & Client Hydration)
  const initialData = typeof window !== 'undefined'
    ? (window as any).__INITIAL_DATA__
    : (globalThis as any).__INITIAL_DATA__;
  const initialArticle = (initialData?.article?.slug === slug) ? initialData.article : null;

  const [article, setArticle] = useState<any>(initialArticle);
  const [relatedArticles, setRelatedArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(!initialArticle);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const viewTrackedRef = useRef<string | null>(null);

  // Check bookmark status
  useEffect(() => {
    if (slug && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`db_bm_${slug}`);
      setIsBookmarked(saved === 'true');
    }
  }, [slug]);

  const toggleBookmark = () => {
    if (!slug) return;
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`db_bm_${slug}`, String(nextState));
    }
    if (nextState && article?.id) {
      api.recordAction({
        eventType: 'bookmark',
        articleId: article.id,
        path: `/article/${slug}`,
        details: article.title,
      });
    }
  };

  // Scroll reading progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setReadingProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 1. Fetch Article & Count View per Detail Page Visit/Refresh
  useEffect(() => {
    if (slug) {
      api.recordPageView({ path: `/article/${slug}` }).catch(() => {});

      if (!initialArticle || initialArticle.slug !== slug) {
        setLoading(true);
        api.getArticle(slug)
          .then((data) => {
            setArticle(data);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }

      // Guard against React.StrictMode double-mount: count view exactly once per visit/refresh
      if (viewTrackedRef.current !== slug) {
        viewTrackedRef.current = slug;
        api.incrementArticleView(slug)
          .then((res) => {
            if (res?.viewsCount) {
              setArticle((prev: any) => (prev ? { ...prev, viewsCount: res.viewsCount } : prev));
            }
          })
          .catch(() => {});
      }
    }
  }, [slug]);

  // 2. Fetch Related Articles (Up to 10 relevant articles)
  useEffect(() => {
    if (!article?.id) return;

    const categorySlug = article.category?.slug;
    const fetchParams: Record<string, any> = { limit: 14, status: 'published' };
    if (categorySlug) fetchParams.category = categorySlug;

    api.getArticles(fetchParams)
      .then((res) => {
        if (res?.data) {
          const filtered = res.data.filter((a: ArticleItem) => a.id !== article.id && a.slug !== slug).slice(0, 10);
          if (filtered.length < 10 && categorySlug) {
            api.getArticles({ limit: 14, status: 'published' })
              .then((latestRes) => {
                if (latestRes?.data) {
                  const combined = [
                    ...filtered,
                    ...latestRes.data.filter((a: ArticleItem) => a.id !== article.id && a.slug !== slug && !filtered.some((f: ArticleItem) => f.id === a.id)),
                  ].slice(0, 10);
                  setRelatedArticles(combined);
                }
              })
              .catch(() => setRelatedArticles(filtered));
          } else {
            setRelatedArticles(filtered);
          }
        }
      })
      .catch(() => {});
  }, [article?.id, article?.category?.slug, slug]);

  // 3. Real Human View Verification
  useEffect(() => {
    if (!article?.id) return;

    let sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('db_reader_token') : null;
    if (!sessionToken && typeof window !== 'undefined') {
      sessionToken = 'r_' + Math.random().toString(36).substring(2) + '_' + Date.now();
      sessionStorage.setItem('db_reader_token', sessionToken);
    }

    let dwellSeconds = 0;
    const dwellInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        dwellSeconds += 1;
      }
    }, 1000);

    const viewTimer = setTimeout(() => {
      if (document.visibilityState === 'visible' && dwellSeconds >= 4) {
        api.recordArticleView(article.id, dwellSeconds, sessionToken || undefined).catch(() => {});
      }
    }, 5000);

    return () => {
      clearInterval(dwellInterval);
      clearTimeout(viewTimer);
    };
  }, [article?.id]);

  const handleShare = () => {
    if (article?.id) {
      api.recordAction({
        eventType: 'share',
        articleId: article.id,
        path: `/article/${slug}`,
        details: article.title,
      });
    }
    if (navigator.share) {
      navigator.share({
        title: article?.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handlePrint = () => {
    if (article?.id) {
      api.recordAction({
        eventType: 'print',
        articleId: article.id,
        path: `/article/${slug}`,
        details: article.title,
      });
    }
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-4 w-36 bg-ink-200 dark:bg-white/[0.08] rounded"></div>
        <div className="h-10 w-3/4 bg-ink-200 dark:bg-white/[0.08] rounded"></div>
        <div className="aspect-video w-full bg-ink-200 dark:bg-white/[0.08] rounded-2xl"></div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-ink-200 dark:bg-white/[0.08] rounded"></div>
          <div className="h-4 w-5/6 bg-ink-200 dark:bg-white/[0.08] rounded"></div>
          <div className="h-4 w-4/6 bg-ink-200 dark:bg-white/[0.08] rounded"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center editorial-card rounded-2xl my-12 p-8">
        <h1 className="text-2xl font-bold mb-2 text-ink-950 dark:text-white">Article Not Found</h1>
        <p className="text-ink-500 mb-6 text-sm">The article you requested may have been relocated, renamed, or unpublished.</p>
        <a href="/" className="inline-block px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
          Return to Editorial Homepage
        </a>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const categoryTheme = getCategoryTheme(article.category?.slug);

  return (
    <>
      {/* Scroll Reading Progress Bar with Electric Editorial Gradient */}
      <div 
        className="reading-progress-bar" 
        style={{ width: `${readingProgress}%` }} 
      />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400 mb-5 sm:mb-6">
          <a href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">Home</a>
          <ChevronRight className="w-3 h-3 text-ink-400" />
          {article.category && (
            <>
              <a 
                href={`/category/${article.category.slug}`} 
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
              >
                {article.category.name}
              </a>
              <ChevronRight className="w-3 h-3 text-ink-400" />
            </>
          )}
          <span className="truncate max-w-[220px] text-ink-800 dark:text-ink-200 font-semibold">
            {article.title}
          </span>
        </nav>

        {/* Article Header & Editorial Title */}
        <header className="mb-8">
          {article.category && (
            <div className="flex items-center gap-2 mb-3.5">
              <a
                href={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </a>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Editorial
              </span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-ink-950 dark:text-white tracking-tight leading-[1.18] mb-4">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-base sm:text-lg md:text-xl text-ink-600 dark:text-ink-300 leading-relaxed mb-6 font-normal">
              {article.excerpt}
            </p>
          )}

          {/* Clean Metadata & Reader Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink-200/80 dark:border-white/[0.08] py-3 text-xs text-ink-500 dark:text-ink-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-ink-400" />
                <time>{publishedDate}</time>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {article.readingTimeMins} min read
              </span>
              <span>•</span>
              <span className="text-ink-600 dark:text-ink-300 font-medium">
                By Daily Build Technology Desk
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleBookmark}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  isBookmarked
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-ink-700 dark:text-ink-300'
                }`}
                title={isBookmarked ? 'Bookmarked' : 'Save story'}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-2.5 py-1 rounded-lg border border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] flex items-center gap-1.5 text-xs font-medium text-ink-700 dark:text-ink-300 transition-colors"
                title="Print story"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleShare}
                className="px-2.5 py-1 rounded-lg border border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] flex items-center gap-1.5 text-xs font-medium text-ink-700 dark:text-ink-300 transition-colors"
                aria-label="Share article"
              >
                {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedShare ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* 16:9 Featured Hero Media Showcase */}
        {article.featuredImage && (
          <section aria-label="Featured Media" className="mb-8">
            <div className="hero-editorial-frame aspect-video w-full bg-slate-950 flex items-center justify-center p-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800">
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>

            {article.featuredImageAlt && (
              <figcaption className="mt-2.5 text-xs italic text-ink-400">
                {article.featuredImageAlt}
              </figcaption>
            )}
          </section>
        )}

        {/* Executive Summary & Core Takeaway Card */}
        {article.excerpt && (
          <div className="mb-8 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Executive Summary &amp; Core Takeaway
            </div>
            <p className="text-sm sm:text-base text-ink-800 dark:text-ink-200 leading-relaxed font-normal">
              {article.excerpt}
            </p>
          </div>
        )}

        {/* Formatted Article Body */}
        <div
          className="prose-editorial mb-10"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* Article Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 pt-5 border-t border-ink-200/80 dark:border-white/[0.08]">
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider mr-1">Filed Under:</span>
            {article.tags.map((tag: string, idx: number) => (
              <a
                key={idx}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-lg text-xs bg-ink-100/80 dark:bg-white/[0.06] text-ink-700 dark:text-ink-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-transparent hover:border-indigo-200/50"
              >
                #{tag}
              </a>
            ))}
          </div>
        )}

        {/* Verified Sources & References Box */}
        {article.sources && article.sources.length > 0 && (
          <section aria-label="Article References" className="editorial-card rounded-2xl p-6 mb-10">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-ink-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                  Primary References &amp; Verified Sources
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                Verified
              </span>
            </div>

            <div className="space-y-3">
              {article.sources.map((src: any) => (
                <div key={src.id} className="text-xs border-l-2 border-indigo-500 pl-3.5 py-1">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <span>{src.sourceName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {src.claimExtracted && (
                    <p className="text-ink-600 dark:text-ink-400 mt-1 italic font-serif">
                      "{src.claimExtracted}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Editorial Desk Byline Signature Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-serif font-black text-lg shadow-sm flex-shrink-0">
              DB
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink-950 dark:text-white">
                Daily Build Technology Desk
              </h4>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">
                Reporting on autonomous systems, developer tooling, and modern distributed infrastructure.
              </p>
            </div>
          </div>
          <a
            href="/editorial-policy"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            Read Editorial Standards &rarr;
          </a>
        </div>

        {/* Related Articles Section (16:9 Grid - Up to 10 Articles) */}
        {relatedArticles.length > 0 && (
          <section aria-label="Related Articles" className="pt-8 border-t border-ink-200/80 dark:border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold">Keep Reading</span>
                <h3 className="text-xl sm:text-2xl font-bold text-ink-950 dark:text-white tracking-tight">
                  Related Stories &amp; Further Reading
                </h3>
              </div>
              {article.category && (
                <a
                  href={`/category/${article.category.slug}`}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  More in {article.category.name} &rarr;
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <ArticleCard key={rel.id} article={rel} variant="standard" />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
};
