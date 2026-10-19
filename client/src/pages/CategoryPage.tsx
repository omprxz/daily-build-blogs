import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { ChevronRight, Layers, Sparkles, Filter } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
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
        })
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const theme = getCategoryTheme(slug);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-6">
        <div className="h-4 w-32 bg-ink-200 dark:bg-white/[0.05] rounded"></div>
        <div className="h-10 w-64 bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <a href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">Home</a>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-ink-600 dark:text-ink-300 font-medium">Categories</span>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{category?.name}</span>
      </nav>

      {/* Editorial Category Masthead Card */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ink-100 dark:bg-white/[0.06] text-ink-800 dark:text-white border border-ink-200 dark:border-white/10">
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

          <div className="pt-2 flex items-center gap-4 text-xs font-mono text-ink-400">
            <span>{articles.length} Published {articles.length === 1 ? 'Dispatch' : 'Dispatches'}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400">Updated Regularly</span>
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
        <div className="py-20 text-center editorial-card rounded-3xl p-8 max-w-xl mx-auto">
          <Layers className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink-950 dark:text-white mb-1">No published dispatches yet</h3>
          <p className="text-xs text-ink-500 mb-6">Our technology desk is currently researching topics in this channel.</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            <span>Browse all stories</span>
            <span>&rarr;</span>
          </a>
        </div>
      )}
    </div>
  );
};
