import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { Flame, Sparkles, Terminal, ArrowRight, Layers, Newspaper, Check, Mail, Send, Compass } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const HomePage: React.FC = () => {
  // Check if initialData has articles (SSR Hydration & Client Hydration)
  const initialData = typeof window !== 'undefined'
    ? (window as any).__INITIAL_DATA__
    : (globalThis as any).__INITIAL_DATA__;

  const [articles, setArticles] = useState<ArticleItem[]>(() => initialData?.articles || []);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; description?: string }[]>(() => initialData?.categories || []);
  const [loading, setLoading] = useState(() => !initialData?.articles?.length);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);

  const [totalArticles, setTotalArticles] = useState<number>(() => initialData?.totalArticles || 0);

  useEffect(() => {
    api.recordPageView({ path: '/' }).catch(() => {});

    // Ensure category counts and total article count are populated
    Promise.all([
      articles.length ? Promise.resolve(null) : api.getArticles({ limit: 18, status: 'published' }).catch(() => null),
      api.getCategories().catch(() => []),
    ])
      .then(([articlesRes, catsRes]) => {
        if (articlesRes?.data) {
          setArticles(articlesRes.data);
          if (articlesRes.pagination?.total) {
            setTotalArticles(articlesRes.pagination.total);
          }
        }
        if (Array.isArray(catsRes) && catsRes.length > 0) {
          setCategories(catsRes);
          const computedTotal = catsRes.reduce((acc: number, c: any) => acc + (c.articleCount || 0), 0);
          if (computedTotal > 0) {
            setTotalArticles((prev) => prev || computedTotal);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberEmail || submittingEmail) return;
    setSubmittingEmail(true);
    try {
      await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscriberEmail }),
      });
      setSubscribed(true);
      setSubscriberEmail('');
      setTimeout(() => setSubscribed(false), 6000);
    } catch {
      // Fallback optimistic UI
      setSubscribed(true);
      setSubscriberEmail('');
      setTimeout(() => setSubscribed(false), 6000);
    } finally {
      setSubmittingEmail(false);
    }
  };

  const leadStory = articles.find(a => a.isFeaturedLead) || articles[0];
  const trendingStories = articles.filter(a => a.id !== leadStory?.id && a.isTrending).slice(0, 4);
  const remainingStories = articles.filter(a => a.id !== leadStory?.id && !trendingStories.some(t => t.id === a.id));
  
  const bentoStories = remainingStories.slice(0, 3);
  const streamStories = remainingStories.slice(3);

  const devStories = articles.filter(a => 
    (a.category?.slug?.includes('tool') || a.category?.slug?.includes('dev') || a.category?.slug?.includes('software')) 
    && a.id !== leadStory?.id
  ).slice(0, 3);

  // Dynamic filter for the topic feed
  const filteredStories = selectedTopic === 'all'
    ? (streamStories.length > 0 ? streamStories : remainingStories)
    : articles.filter(a => 
        a.category?.slug?.includes(selectedTopic) || 
        a.category?.name?.toLowerCase().includes(selectedTopic.toLowerCase())
      );

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse space-y-8">
        <div className="h-8 w-64 bg-ink-200 dark:bg-white/[0.05] rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl w-full"></div>
            <div className="h-7 w-3/4 bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
            <div className="h-4 w-full bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
            <div className="h-4 w-2/3 bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
          </div>
          <div className="lg:col-span-4 h-96 bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
          <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-2xl"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12">
      
      {/* 1. Publication Hero Masthead Banner */}
      <section className="text-center pt-2 pb-1 border-b border-ink-200/60 dark:border-white/[0.06]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3 border border-indigo-200/50 dark:border-indigo-800/40">
          <Compass className="w-3.5 h-3.5 text-indigo-500 animate-spin-slow" />
          <span>Daily Build Technology Dispatch • Editorial Edition</span>
        </div>
        <h1 className="font-serif font-black text-3xl sm:text-4xl md:text-5xl text-ink-950 dark:text-white tracking-tight leading-tight">
          Engineering the Frontiers of Technology &amp; AI
        </h1>
        <p className="mt-3 text-sm sm:text-base text-ink-700 dark:text-ink-300 max-w-2xl mx-auto leading-relaxed font-medium">
          Daily investigative reporting, system architecture deep dives, autonomous AI evaluations, and developer ergonomics.
        </p>
      </section>

      {/* 2. Lead Story (8 cols) + Numbered Trending Rail (4 cols) */}
      <section aria-label="Lead Story and Trending" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Lead Story */}
          <div className="lg:col-span-8">
            {leadStory && <ArticleCard article={leadStory} variant="lead" />}
          </div>

          {/* Numbered Trending Rail */}
          <aside aria-label="Trending Stories" className="lg:col-span-4 editorial-card rounded-2xl p-5 sm:p-6">
            <header className="flex items-center justify-between pb-3.5 mb-2 border-b border-ink-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                  Trending Articles
                </h2>
              </div>
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-900/50">
                Live Pulse
              </span>
            </header>

            <div className="divide-y divide-ink-100 dark:divide-white/[0.05]">
              {(trendingStories.length > 0 ? trendingStories : articles.slice(1, 5)).map((story, idx) => (
                <ArticleCard key={story.id} article={story} variant="compact" index={idx} />
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* 3. Category Topic Switcher / Horizontal Chips */}
      <section aria-label="Browse Topics" className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-ink-200/80 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              Browse Topics &amp; Channels
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-600 dark:text-ink-300 font-semibold">
            {filteredStories.length} {filteredStories.length === 1 ? 'Article' : 'Articles'}
          </span>
        </div>

        {/* Scrollable Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
              selectedTopic === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#0c1220] border border-ink-200 dark:border-white/[0.08] text-ink-700 dark:text-ink-300 hover:border-indigo-400 dark:hover:border-indigo-500'
            }`}
          >
            All Stories ({totalArticles || articles.length})
          </button>
          {categories.map((cat: any) => {
            const active = selectedTopic === cat.slug;
            const theme = getCategoryTheme(cat.slug);
            const count = cat.articleCount !== undefined ? cat.articleCount : articles.filter(a => a.category?.slug === cat.slug).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedTopic(cat.slug)}
                className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#0c1220] border border-ink-200 dark:border-white/[0.08] text-ink-700 dark:text-ink-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : theme.dotColor}`} />
                <span>{cat.name}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-white/20 text-white' : 'bg-ink-150 dark:bg-white/10 text-ink-800 dark:text-ink-100 font-semibold'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Bento Feature Grid (Deep Dives) */}
      {bentoStories.length > 0 && (
        <section aria-label="Editor's Deep Dives" className="space-y-4">
          <div className="flex items-center justify-between border-b border-ink-200/80 dark:border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                Featured Editorial Analysis
              </h2>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Curated Deep Dives
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bentoStories.map((story) => (
              <ArticleCard key={story.id} article={story} variant="bento" />
            ))}
          </div>
        </section>
      )}

      {/* 5. The Daily Build Morning Dispatch (Editorial Newsletter Box) */}
      <section id="newsletter" aria-label="Morning Dispatch Newsletter" className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-ink-950 text-white p-8 sm:p-12 border border-indigo-500/20 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-mono text-cyan-300 border border-white/10">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>DAILY BUILD MORNING DISPATCH</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Read The Best Technology Insights First
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Join thousands of senior engineers, CTOs, and systems architects receiving our daily brief on breakthrough models, open-source tooling, and zero-day vulnerabilities.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="pt-2 max-w-md mx-auto flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              required
              value={subscriberEmail}
              onChange={(e) => setSubscriberEmail(e.target.value)}
              placeholder="you@work.com"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
            />
            <button
              type="submit"
              disabled={submittingEmail}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-ink-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-70"
            >
              {submittingEmail ? (
                <span>Joining...</span>
              ) : subscribed ? (
                <>
                  <Check className="w-4 h-4 text-ink-950" />
                  <span>Subscribed!</span>
                </>
              ) : (
                <>
                  <span>Subscribe</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {subscribed && (
            <p className="text-xs text-emerald-400 font-medium animate-in fade-in">
              ✓ Welcome aboard! You will receive our next editorial morning dispatch.
            </p>
          )}

          <p className="text-[11px] text-slate-400">
            Zero advertising fluff. One-click unsubscribe at any time. Respectful of your inbox.
          </p>
        </div>
      </section>

      {/* 6. Developer Tools & Open Source Spotlight */}
      {devStories.length > 0 && (
        <section aria-label="Developer Tools" className="space-y-4">
          <div className="flex items-center justify-between border-b border-ink-200/80 dark:border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
                Developer Tools &amp; Infrastructure
              </h2>
            </div>
            <a
              href="/category/software-developer-tools"
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Explore DevTools &rarr;
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {devStories.map((story) => (
              <ArticleCard key={story.id} article={story} variant="standard" />
            ))}
          </div>
        </section>
      )}

      {/* 7. Chronological Feed / Topic Stream */}
      <section aria-label="Chronological Feed" className="space-y-5">
        <div className="flex items-center justify-between border-b border-ink-200/80 dark:border-white/[0.08] pb-2.5">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white">
              {selectedTopic === 'all' ? 'Latest Stories & Dispatches' : `Stories in ${categories.find(c => c.slug === selectedTopic)?.name || selectedTopic}`}
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-400">
            Updated Hourly
          </span>
        </div>

        {filteredStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <ArticleCard key={story.id} article={story} variant="standard" />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center editorial-card rounded-2xl p-8">
            <p className="text-sm font-medium text-ink-600 dark:text-ink-400 mb-2">No articles found in this topic stream yet.</p>
            <button
              onClick={() => setSelectedTopic('all')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all dispatches &rarr;
            </button>
          </div>
        )}
      </section>

    </main>
  );
};
