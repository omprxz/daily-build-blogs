import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { 
  Clock, Calendar, Share2, ExternalLink, ChevronRight, Sparkles, 
  BookOpen, Bookmark, Check, ShieldCheck, Printer, Heart, ThumbsUp,
  MessageSquare, ArrowLeft, ArrowUp
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { ScrollProgress, ScrollProgressSection } from '../components/ui/rare/scroll-progress.js';
import { RailToc, RailTocItem } from '../components/ui/rare/rail-toc.js';
import { EmojiReaction } from '../components/ui/rare/emoji-reaction.js';

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
  const [reactionFeedback, setReactionFeedback] = useState<string | null>(null);
  const articleContentRef = useRef<HTMLDivElement>(null);
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

  // 3. Extract Table of Contents Sections & Inject Anchors
  const { processedHtml, tocItems } = useMemo(() => {
    if (!article?.contentHtml) return { processedHtml: '', tocItems: [] };

    let html = article.contentHtml;
    const items: RailTocItem[] = [];
    const parserRegex = /<(h[23])([^>]*)>(.*?)<\/\1>/gi;
    let match;
    let index = 0;

    // First collect all headings
    html = html.replace(parserRegex, (fullMatch: string, tag: string, attrs: string, innerText: string) => {
      // Strip any nested html tags for the clean label
      const cleanLabel = innerText.replace(/<[^>]*>?/gm, '').trim();
      const existingIdMatch = attrs.match(/id=["']([^"']+)["']/i);
      const id = existingIdMatch ? existingIdMatch[1] : `section-${index++}-${cleanLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const depth = tag.toLowerCase() === 'h3' ? 1 : 0;

      items.push({ id, label: cleanLabel, depth });

      if (existingIdMatch) {
        return fullMatch;
      }
      return `<${tag}${attrs} id="${id}">${innerText}</${tag}>`;
    });

    return { processedHtml: html, tocItems: items };
  }, [article?.contentHtml]);

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

  const handleEmojiReact = (emojiName: string) => {
    setReactionFeedback(`Thank you for reacting!`);
    setTimeout(() => setReactionFeedback(null), 3000);
    if (article?.id) {
      api.recordAction({
        eventType: 'reaction',
        articleId: article.id,
        path: `/article/${slug}`,
        details: emojiName,
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6">
        <div className="h-4 w-36 bg-ink-200 dark:bg-white/[0.08] rounded-full"></div>
        <div className="h-10 w-3/4 bg-ink-200 dark:bg-white/[0.08] rounded-2xl"></div>
        <div className="aspect-video w-full bg-ink-200 dark:bg-white/[0.08] rounded-3xl"></div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-ink-200 dark:bg-white/[0.08] rounded-xl"></div>
          <div className="h-4 w-5/6 bg-ink-200 dark:bg-white/[0.08] rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center editorial-card rounded-3xl my-12 p-8 border border-ink-200 dark:border-white/10 bg-white dark:bg-[#0c1220]">
        <h1 className="text-2xl font-black mb-2 text-ink-950 dark:text-white">Article Not Found</h1>
        <p className="text-ink-500 mb-6 text-sm">The article you requested may have been relocated, renamed, or unpublished.</p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity">
          Return to Editorial Homepage
        </Link>
      </div>
    );
  }

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const categoryTheme = getCategoryTheme(article.category?.slug);

  const scrollSections: ScrollProgressSection[] = tocItems.map(item => ({
    id: item.id,
    label: item.label,
  }));

  return (
    <>
      {/* Rare UI ScrollProgress Floating Reading Bar */}
      <div className="fixed bottom-6 right-6 z-40 hidden md:block">
        <ScrollProgress sections={scrollSections} />
      </div>

      <article className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400 mb-6">
          <Link to="/" className="hover:text-primary font-medium">Home</Link>
          <ChevronRight className="w-3 h-3 text-ink-400" />
          {article.category && (
            <>
              <Link 
                to={`/category/${article.category.slug}`} 
                className="hover:text-primary font-medium"
              >
                {article.category.name}
              </Link>
              <ChevronRight className="w-3 h-3 text-ink-400" />
            </>
          )}
          <span className="truncate max-w-[240px] text-ink-800 dark:text-ink-200 font-semibold">
            {article.title}
          </span>
        </nav>

        {/* Article Header & Editorial Masthead */}
        <header className="mb-8 space-y-4">
          {article.category && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link
                to={`/category/${article.category.slug}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${categoryTheme.badgeBgLight} ${categoryTheme.badgeBgDark} ${categoryTheme.badgeTextLight} ${categoryTheme.badgeTextDark} border ${categoryTheme.badgeBorderLight} ${categoryTheme.badgeBorderDark} transition-colors`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${categoryTheme.dotColor}`} />
                {article.category.name}
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verified Primary Source
              </span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-ink-950 dark:text-white tracking-tight leading-[1.15]">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="text-base sm:text-lg md:text-xl text-ink-600 dark:text-ink-300 leading-relaxed font-normal">
              {article.excerpt}
            </p>
          )}

          {/* Clean Metadata & Reader Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink-200/80 dark:border-white/[0.08] py-3.5 text-xs text-ink-500 dark:text-ink-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-ink-400" />
                <time>{publishedDate}</time>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {article.readingTimeMins} min read
              </span>
              <span>•</span>
              <span className="text-ink-600 dark:text-ink-300 font-medium">
                By Daily Build Tech Desk
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleBookmark}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all ${
                  isBookmarked
                    ? 'border-primary text-primary bg-primary/10 shadow-2xs'
                    : 'border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-ink-700 dark:text-ink-300'
                }`}
                title={isBookmarked ? 'Bookmarked' : 'Save story'}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl border border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] flex items-center gap-1.5 text-xs font-medium text-ink-700 dark:text-ink-300 transition-all"
                title="Print story"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-xl border border-ink-200 dark:border-white/10 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] flex items-center gap-1.5 text-xs font-medium text-ink-700 dark:text-ink-300 transition-all"
                aria-label="Share article"
              >
                {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedShare ? 'Copied Link' : 'Share'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* 16:9 Featured Hero Media Showcase */}
        {article.featuredImage && (
          <section aria-label="Featured Media" className="mb-10">
            <div className="aspect-video w-full bg-slate-950 flex items-center justify-center p-3 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-md">
              <img
                src={article.featuredImage}
                alt={article.featuredImageAlt || article.title}
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>

            {article.featuredImageAlt && (
              <figcaption className="mt-2.5 text-xs italic text-ink-400 text-center">
                {article.featuredImageAlt}
              </figcaption>
            )}
          </section>
        )}

        {/* Key Architectural Takeaways Box */}
        {article.aiMetadata?.takeaways && Array.isArray(article.aiMetadata.takeaways) && article.aiMetadata.takeaways.length > 0 && (
          <div className="mb-10 p-6 rounded-3xl bg-primary/5 border border-primary/20 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Key Architectural Takeaways</span>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-sm text-ink-800 dark:text-ink-200">
              {article.aiMetadata.takeaways.map((t: string, i: number) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Article Body with Optional Rail TOC (Sidebar for Large Screens) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
          {/* Main Prose Content */}
          <div className={tocItems.length >= 3 ? "lg:col-span-8" : "lg:col-span-12"}>
            <div
              ref={articleContentRef}
              className="prose-editorial"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          </div>

          {/* Rare UI Rail TOC Navigation for Long-Form Articles */}
          {tocItems.length >= 3 && (
            <aside aria-label="Table of Contents" className="hidden lg:block lg:col-span-4 sticky top-24 pl-4 border-l border-ink-150 dark:border-white/[0.08]">
              <div className="mb-3 text-xs font-bold font-mono uppercase tracking-wider text-ink-400 dark:text-ink-500">
                Table of Contents
              </div>
              <RailToc items={tocItems} className="max-h-[70vh] overflow-y-auto" />
            </aside>
          )}
        </div>

        {/* Rare UI Tapback Emoji Reaction Bar */}
        <section aria-label="Article Feedback & Reactions" className="mb-10 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base font-bold text-ink-950 dark:text-white">
              How did you find this technical analysis?
            </h3>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              Tap an emoji reaction to share instant feedback with our editorial team.
            </p>
            {reactionFeedback && (
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in pt-1">
                {reactionFeedback}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <EmojiReaction
              onReact={handleEmojiReact}
              size="md"
              align="center"
            />
          </div>
        </section>

        {/* Article Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-10 pt-6 border-t border-ink-200/80 dark:border-white/[0.08]">
            <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider mr-1">Filed Under:</span>
            {article.tags.map((tag: string, idx: number) => (
              <Link
                key={idx}
                to={`/search?q=${encodeURIComponent(tag)}`}
                className="px-3.5 py-1.5 rounded-xl text-xs bg-ink-100/80 dark:bg-white/[0.06] text-ink-700 dark:text-ink-300 font-medium hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Verified Sources & References Box */}
        {article.sources && article.sources.length > 0 && (
          <section aria-label="Article References" className="editorial-card rounded-3xl p-6 sm:p-8 mb-10 border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-ink-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white font-mono">
                  Primary References &amp; Verified Sources
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                Verified
              </span>
            </div>

            <div className="space-y-3.5">
              {article.sources.map((src: any) => (
                <div key={src.id} className="text-xs border-l-2 border-primary pl-4 py-1">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-bold text-primary hover:underline inline-flex items-center gap-1.5"
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
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] mb-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-white font-serif font-black text-xl shadow-sm flex-shrink-0">
              DB
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink-950 dark:text-white">
                Daily Build Technology Desk
              </h4>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5 max-w-md">
                Reporting on autonomous systems, developer tooling, and modern distributed infrastructure. Fact-checked against original research.
              </p>
            </div>
          </div>
          <Link
            to="/editorial-policy"
            className="text-xs font-bold text-primary hover:underline whitespace-nowrap px-4 py-2 rounded-xl bg-primary/10"
          >
            Editorial Standards &rarr;
          </Link>
        </div>

        {/* Related Articles Bento Grid */}
        {relatedArticles.length > 0 && (
          <section aria-label="Related Stories" className="pt-8 border-t border-ink-200/80 dark:border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-ink-950 dark:text-white font-mono uppercase tracking-wider">
                  Further Reading on This Topic
                </h3>
              </div>
              <Link to="/" className="text-xs text-primary font-semibold hover:underline">
                View All &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.slice(0, 6).map((item) => (
                <ArticleCard key={item.id} article={item} variant="standard" />
              ))}
            </div>
          </section>
        )}

      </article>
    </>
  );
};
