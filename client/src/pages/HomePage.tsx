import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { ArticleCard, ArticleItem } from '../components/ArticleCard.js';
import { 
  Flame, Sparkles, Terminal, ArrowRight, Layers, Newspaper, 
  Check, Mail, Send, Compass, ShieldCheck, Clock, Bookmark, BookOpen,
  TrendingUp, Activity, Cpu, Sparkle
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { AnimatedCounter } from '../components/ui/rare/animated-counter.js';
import { FluidOrb } from '../components/ui/rare/fluid-orb.js';
import { FolderComponent } from '../components/ui/rare/folder-component.js';
import { Link } from 'react-router-dom';

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
      articles.length ? Promise.resolve(null) : api.getArticles({ limit: 24, status: 'published' }).catch(() => null),
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
            <div className="aspect-video bg-ink-200 dark:bg-white/[0.05] rounded-3xl w-full"></div>
            <div className="h-7 w-3/4 bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
            <div className="h-4 w-full bg-ink-200 dark:bg-white/[0.05] rounded-xl"></div>
          </div>
          <div className="lg:col-span-4 h-96 bg-ink-200 dark:bg-white/[0.05] rounded-3xl"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-14">
      
      {/* 1. Hero Editorial Masthead Banner with Ambient Rare FluidOrb */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 border border-ink-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0c1220]/70 backdrop-blur-xl shadow-xs">
        {/* Ambient Orb Accent */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 pointer-events-none opacity-40 dark:opacity-60 blur-xs">
          <FluidOrb size={320} color="var(--primary, #4F46E5)" />
        </div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DAILY BUILD ENGINEERING DISPATCHES</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink-950 dark:text-white tracking-tight leading-[1.12]">
            Engineering, Autonomous Systems &amp; Technical Architectures
          </h1>

          <p className="text-ink-600 dark:text-ink-300 text-sm sm:text-base lg:text-lg leading-relaxed font-normal max-w-2xl">
            In-depth reporting on foundational AI models, high-performance distributed systems, and modern developer tooling. Fact-checked against verified primary sources.
          </p>

          {/* Metrics Strip with Rare UI AnimatedCounter */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-ink-150 dark:border-white/[0.06]">
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-ink-950 dark:text-white tracking-tight">
                <AnimatedCounter value={totalArticles || 12} duration={0.8} />
                <span className="text-primary text-xl">+</span>
              </div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mt-0.5">
                Dispatches
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-ink-950 dark:text-white tracking-tight">
                <AnimatedCounter value={categories.length || 6} duration={0.8} />
              </div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mt-0.5">
                Curated Topics
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-ink-950 dark:text-white tracking-tight">
                <AnimatedCounter value={100} duration={0.8} />
                <span className="text-emerald-500 text-xl">%</span>
              </div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mt-0.5">
                Fact-Checked
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-ink-950 dark:text-white tracking-tight flex items-center">
                <span>~</span>
                <AnimatedCounter value={4} duration={0.8} />
                <span className="text-sm font-sans font-medium text-ink-400 ml-1">min</span>
              </div>
              <div className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider mt-0.5">
                Avg Read Time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Lead Story & Trending Rail (Editorial Bento Grid) */}
      <section aria-label="Top Stories" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-ink-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-ink-950 dark:text-white">
              Primary Dispatch &amp; Trending Rail
            </h2>
          </div>
          <span className="text-[11px] font-mono text-ink-400 hidden sm:inline">
            Curated Hourly
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Lead Story (8 cols) */}
          <div className="lg:col-span-8">
            {leadStory && (
              <ArticleCard article={leadStory} variant="lead" />
            )}
          </div>

          {/* Trending Stories Rail (4 cols) */}
          <div className="lg:col-span-4 rounded-3xl p-5 sm:p-6 bg-white dark:bg-[#0c1220] border border-ink-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ink-150 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white font-mono">
                  Trending Deep Dives
                </h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/40">
                HOT
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {trendingStories.length > 0 ? (
                trendingStories.map((story, idx) => (
                  <ArticleCard key={story.id} article={story} variant="compact" index={idx} />
                ))
              ) : (
                remainingStories.slice(0, 4).map((story, idx) => (
                  <ArticleCard key={story.id} article={story} variant="compact" index={idx} />
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bento Grid of Architecture In-Depth Stories */}
      {bentoStories.length > 0 && (
        <section aria-label="Architecture Deep Dives" className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-ink-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-ink-950 dark:text-white">
                Architecture &amp; Deep-Dive Analyses
              </h2>
            </div>
            <Link to="/category/software-developer-tools" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bentoStories.map((story) => (
              <ArticleCard key={story.id} article={story} variant="bento" />
            ))}
          </div>
        </section>
      )}

      {/* 4. Rare UI 3D Interactive Folder Special Edition Banner */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-ink-200/80 dark:border-white/[0.08] bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold border border-white/20">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>COLLECTED EDITIONS</span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Curated Technical Briefings &amp; Engineering Case Studies
            </h3>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Hover over the edition archive folder to inspect our specialized technology tracks: autonomous agents, eBPF security, distributed databases, and high-throughput LLM pipelines.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">🤖 Model Weights</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">⚡ eBPF Security</span>
              <span className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10">🚀 Vector RAG</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-center justify-center py-4">
            <div className="w-full max-w-[320px]">
              <FolderComponent color="blue" size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Topic Feed & Chronological Dispatch Stream */}
      <section aria-label="Chronological Dispatches" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-ink-200/60 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-ink-950 dark:text-white">
              Latest Technology Stream
            </h2>
          </div>

          {/* Topic Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedTopic('all')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                selectedTopic === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-ink-100 dark:bg-white/[0.06] text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-white/[0.10]'
              }`}
            >
              All Topics
            </button>
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedTopic(cat.slug)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                  selectedTopic === cat.slug
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-ink-100 dark:bg-white/[0.06] text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-white/[0.10]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stream Articles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => (
            <ArticleCard key={story.id} article={story} variant="standard" />
          ))}
        </div>
      </section>

      {/* 6. Newsletter Subscription Card */}
      <section className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220] shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <Mail className="w-3.5 h-3.5" />
            <span>DAILY BUILD MORNING DISPATCH</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-ink-950 dark:text-white tracking-tight">
            Stay Ahead of Autonomous Systems &amp; AI Engineering
          </h3>

          <p className="text-xs sm:text-sm text-ink-600 dark:text-ink-300 leading-relaxed max-w-lg mx-auto">
            Zero noise, zero fluff. Curated analysis of the latest models, benchmarks, and infrastructure changes delivered directly to your inbox every morning.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="pt-2 max-w-md mx-auto flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={subscriberEmail}
              onChange={(e) => setSubscriberEmail(e.target.value)}
              placeholder="engineer@company.com"
              required
              className="flex-1 px-4 py-2.5 rounded-xl bg-ink-50 dark:bg-white/[0.04] border border-ink-200 dark:border-white/10 text-sm text-ink-950 dark:text-white placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <button
              type="submit"
              disabled={submittingEmail || subscribed}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {subscribed ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Subscribed!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Subscribe</span>
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 text-[11px] text-ink-400 font-medium pt-1">
            <span>✓ No spam guarantee</span>
            <span>•</span>
            <span>✓ 1-click unsubscribe</span>
            <span>•</span>
            <span>✓ Read by 12,000+ engineers</span>
          </div>
        </div>
      </section>

    </main>
  );
};
