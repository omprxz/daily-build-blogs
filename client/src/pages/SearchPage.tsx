import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { Search, ChevronRight, Sparkles, X, ArrowUpRight } from 'lucide-react';
import { AnimatedCounter } from '../components/ui/rare/animated-counter.js';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(query);
  const [results, setResults] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const suggestedTopics = [
    'AI & LLMs',
    'Autonomous Agents',
    'Developer Tools',
    'eBPF Security',
    'RAG Architecture',
    'Cloud Systems',
    'Microservices',
  ];

  useEffect(() => {
    setSearchTerm(query);
    if (query.trim()) {
      setLoading(true);
      api.recordAction({
        eventType: 'search',
        path: `/search?q=${encodeURIComponent(query.trim())}`,
        details: query.trim(),
      });
      api.getArticles({ search: query.trim(), status: 'published', limit: 36 })
        .then((res) => {
          if (res?.data) setResults(res.data);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const handleSelectSuggested = (topic: string) => {
    setSearchTerm(topic);
    setSearchParams({ q: topic });
  };

  const handleClear = () => {
    setSearchTerm('');
    setSearchParams({});
    setResults([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
        <Link to="/" className="hover:text-primary font-medium">Home</Link>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-ink-600 dark:text-ink-300 font-medium">Search</span>
        {query && (
          <>
            <ChevronRight className="w-3 h-3 text-ink-400" />
            <span className="text-primary font-bold truncate max-w-[200px]">
              "{query}"
            </span>
          </>
        )}
      </nav>

      {/* Search Header Card */}
      <header className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="max-w-2xl space-y-5">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              Dispatch Archive Search
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-950 dark:text-white tracking-tight mt-1">
              Explore Daily Build Technical Intelligence
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search models, software, runtime architectures..."
                className="w-full pl-11 pr-10 py-3 bg-ink-50 dark:bg-white/[0.04] border border-ink-200 dark:border-white/10 rounded-2xl text-sm text-ink-950 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3.5 top-3.5 text-ink-400 hover:text-ink-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
            >
              Search
            </button>
          </form>

          {/* Suggested Queries */}
          <div className="pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Recommended Keywords
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleSelectSuggested(topic)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-ink-100/70 dark:bg-white/[0.04] text-ink-700 dark:text-ink-300 hover:bg-primary/10 hover:text-primary border border-ink-200/80 dark:border-white/[0.06] transition-all"
                >
                  <span>{topic}</span>
                  <ArrowUpRight className="w-3 h-3 text-ink-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Results Header and Grid */}
      {query && (
        <section aria-label="Search Results" className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-ink-200/80 dark:border-white/[0.08]">
            <div className="text-sm text-ink-700 dark:text-ink-300 flex items-center gap-2">
              <span>Found</span>
              <span className="font-bold text-ink-950 dark:text-white font-mono">
                <AnimatedCounter value={results.length} duration={0.5} />
              </span>
              <span>{results.length === 1 ? 'article' : 'articles'} matching</span>
              <span className="font-bold text-primary">"{query}"</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
              <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
              <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((art) => (
                <ArticleCard key={art.id} article={art} variant="standard" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 editorial-card rounded-3xl p-8 border border-ink-200 dark:border-white/10 bg-white dark:bg-[#0c1220]">
              <h2 className="text-lg font-bold text-ink-900 dark:text-white mb-2">
                No Dispatches Found
              </h2>
              <p className="text-sm text-ink-500 mb-6 max-w-md mx-auto">
                No published articles matched your search query "{query}". Try checking for spelling errors or searching a broader topic like "AI", "Cloud", or "Tools".
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="px-5 py-2.5 rounded-xl bg-ink-100 dark:bg-white/[0.08] text-xs font-semibold hover:bg-ink-200 transition-colors"
              >
                Clear Search Query
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
