import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { Search, ChevronRight, Sparkles, X, ArrowUpRight } from 'lucide-react';

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
        <a href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">Home</a>
        <ChevronRight className="w-3 h-3 text-ink-400" />
        <span className="text-ink-600 dark:text-ink-300 font-medium">Search</span>
        {query && (
          <>
            <ChevronRight className="w-3 h-3 text-ink-400" />
            <span className="text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[200px]">
              "{query}"
            </span>
          </>
        )}
      </nav>

      {/* Search Header Card */}
      <header className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-xs">
        <div className="max-w-2xl space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold">
              Archive Search
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-ink-950 dark:text-white tracking-tight mt-1">
              Search Daily Build Dispatches
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search models, software, runtime architectures..."
                className="w-full pl-10 pr-9 py-2.5 bg-ink-50 dark:bg-white/[0.04] border border-ink-200 dark:border-white/10 rounded-xl text-sm text-ink-950 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-3 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
            >
              Search
            </button>
          </form>

          {/* Quick Topic Chips */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-2 font-medium">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Suggested topics:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleSelectSuggested(topic)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-ink-100/70 dark:bg-white/[0.04] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-ink-200/60 dark:border-white/[0.06] text-ink-700 dark:text-ink-300 transition-colors"
                >
                  <span>{topic}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 text-ink-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Query Status */}
      {query && (
        <div className="flex items-center justify-between text-xs text-ink-500 border-b border-ink-200/80 dark:border-white/[0.08] pb-3">
          <span>
            Showing results for <strong className="text-ink-950 dark:text-white font-bold">"{query}"</strong>
          </span>
          <span className="font-mono">{results.length} {results.length === 1 ? 'result' : 'results'} found</span>
        </div>
      )}

      {/* Results View */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((art) => (
            <ArticleCard key={art.id} article={art} variant="standard" />
          ))}
        </div>
      ) : query ? (
        <div className="py-20 text-center editorial-card rounded-3xl p-8 max-w-xl mx-auto">
          <Search className="w-10 h-10 text-ink-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink-950 dark:text-white mb-1">
            No articles found matching "{query}"
          </h3>
          <p className="text-xs text-ink-500 mb-6">
            Try searching for broader keywords like "AI", "Cloud", "Linux", or "Models".
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleSelectSuggested('AI & LLMs')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Browse AI &amp; LLMs
            </button>
            <a
              href="/"
              className="px-4 py-2 border border-ink-200 dark:border-white/10 text-ink-700 dark:text-ink-300 rounded-xl text-xs font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
            >
              Homepage
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
};
