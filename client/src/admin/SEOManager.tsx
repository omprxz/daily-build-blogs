import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Search, ExternalLink, Link2, Sparkles, Globe, FileCode2, Rss, Bot, ShieldCheck } from 'lucide-react';

export const SEOManager: React.FC = () => {
  const [testText, setTestText] = useState('We are exploring autonomous coding loops, Linux eBPF kernel probes, and language models for production infrastructure.');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const handleTestInternalLinks = async () => {
    setTesting(true);
    try {
      const res = await api.getInternalLinks({ content: testText });
      setSuggestions(res);
    } catch (err: any) {
      alert(`Error finding internal links: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-500" />
            <span>Technical SEO &amp; Indexing Engine</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Dynamic XML sitemaps, RSS 2.0 syndication, robots crawler policies, and contextual link graphs.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>SSR Meta Tags Active</span>
        </div>
      </div>

      {/* 3 Core Technical Endpoints Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>Search Indexing</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Live
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              XML Sitemap
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Dynamically generated on-demand with all published articles, category archives, change frequencies, and priority weights.
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 pt-2 border-t border-slate-100 dark:border-white/[0.06]"
          >
            <span>Inspect /sitemap.xml</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Rss className="w-4 h-4" />
                <span>Syndication Feed</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                RSS 2.0
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Public RSS Feed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Standard syndicated technology feed formatted with full metadata, media enclosures, and author credits for news aggregators.
            </p>
          </div>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 pt-2 border-t border-slate-100 dark:border-white/[0.06]"
          >
            <span>Inspect /rss.xml</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4" />
                <span>Crawler Protocol</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Robots.txt
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Crawler Directives
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Directs Googlebot and web crawlers to public editorial routes while protecting admin, API, and sensitive internal endpoints.
            </p>
          </div>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 pt-2 border-t border-slate-100 dark:border-white/[0.06]"
          >
            <span>Inspect /robots.txt</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Internal Linking Suggestions Engine */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-500" />
              <span>Contextual Internal Linking Engine</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Analyzes article text against published stories to construct high-relevance internal contextual links.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Automated SEO Link Graph
          </span>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Test Content Snippet:
          </label>
          <textarea
            rows={3}
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleTestInternalLinks}
          disabled={testing}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{testing ? 'Analyzing Graph...' : 'Find Contextual Link Suggestions'}</span>
        </button>

        {suggestions.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Matched Contextual Links ({suggestions.length}):
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {suggestions.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">"{s.matchedKeyword}"</span>
                    <span className="text-slate-400 mx-1.5">&rarr;</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{s.title}</span>
                  </div>
                  <a
                    href={`/article/${s.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
                    title="Open article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
