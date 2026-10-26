import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { ChevronRight, Layers, Sparkles, Filter, ShieldCheck, Clock } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { AnimatedCounter } from '../components/ui/rare/animated-counter.js';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      setLoading(true);
      api.getCategories().then((cats) => {
        const found = cats.find((c: any) => c.slug === slug);
        setCategory(found || { name: slug.replace(/-/g, ' '), description: '' });
      }).catch(() => {});

      api.getArticles({ category: slug, status: 'published', limit: 36 })
        .then((res) => {
          if (res?.data) setArticles(res.data);
          if (res?.pagination?.total !== undefined) {
            setTotalCount(res.pagination.total);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const theme = getCategoryTheme(slug);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-6">
        <div className="h-4 w-32 bg-ink-200 dark:bg-white/[0.05] rounded-full"></div>
        <div className="h-12 w-80 bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const count = totalCount !== null ? totalCount : (category?.articleCount !== undefined ? category.articleCount : articles.length);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <Link to="/" className="hover:text-primary font-medium">Home</Link>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-ink-600 dark:text-ink-300 font-medium">Categories</span>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-primary font-bold">{category?.name}</span>
      </nav>

      {/* Editorial Category Masthead Card */}
      <header className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
            <span>EDITORIAL TOPIC ARCHIVE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink-950 dark:text-white tracking-tight leading-tight capitalize">
            {category?.name}
          </h1>

          {category?.description && (
            <p className="text-sm sm:text-base text-ink-600 dark:text-ink-300 leading-relaxed font-normal">
              {category.description}
            </p>
          )}

          <div className="pt-2 flex items-center gap-4 text-xs font-mono text-ink-500 dark:text-ink-400">
            <span className="font-bold text-ink-950 dark:text-white flex items-center gap-1.5">
              <AnimatedCounter value={count} duration={0.6} /> Published {count === 1 ? 'Dispatch' : 'Dispatches'}
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Continuously Updated
            </span>
          </div>
        </div>
      </header>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <section aria-label="Topic Articles" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} variant="standard" />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-20 editorial-card rounded-3xl p-8 border border-ink-200 dark:border-white/10 bg-white dark:bg-[#0c1220]">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">
            No Published Dispatches Yet
          </h2>
          <p className="text-sm text-ink-500 mb-6">
            There are currently no published articles in this channel. Check back soon!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <span>Return to Homepage</span>
          </Link>
        </div>
      )}
    </div>
  );
};
