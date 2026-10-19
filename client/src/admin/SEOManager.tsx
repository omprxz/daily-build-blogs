import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Search, ExternalLink, Link2, Sparkles } from 'lucide-react';

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
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-500" /> Technical SEO &amp; Internal Linking Engine
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Server-rendered meta tags, automated XML sitemaps, RSS feeds, and contextual internal link suggestions.
        </p>
      </div>

      {/* SEO Endpoints Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="clay-card p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
            XML Sitemap
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            Automatically updated with all published stories, categories, and priority weights.
          </p>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
          >
            Inspect /sitemap.xml <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="clay-card p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
            RSS 2.0 Feed
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            Full syndicated technology feed for readers, news aggregators, and RSS clients.
          </p>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
          >
            Inspect /rss.xml <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="clay-card p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
            Robots.txt
          </h3>
          <p className="text-xs text-slate-500 mb-4 font-medium">
            Directs search crawlers to index public articles while blocking admin and internal endpoints.
          </p>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
          >
            Inspect /robots.txt <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Internal Linking Suggestions Engine */}
      <div className="clay-card p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-indigo-600" /> Test Internal Link Suggestions
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          Our internal linking engine scans draft content and suggests relevant contextual links to already published stories.
        </p>

        <textarea
          rows={3}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs clay-input font-serif"
        />

        <button
          onClick={handleTestInternalLinks}
          disabled={testing}
          className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {testing ? 'Analyzing...' : 'Find Link Suggestions'}
        </button>

        {suggestions.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-800">
              Suggested Contextual Links:
            </h4>
            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-indigo-600">"{s.matchedKeyword}"</span> &rarr; {s.title}
                  </div>
                  <a href={`/article/${s.slug}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600">
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
