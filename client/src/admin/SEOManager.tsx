import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Search, ExternalLink, Link2, Sparkles, Globe, FileCode2, Rss, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { StatusDot } from '@/components/ui/status-dot.js';

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
            <Search className="w-6 h-6 text-primary" />
            <span>SEO &amp; Indexing</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Sitemaps, RSS feeds, crawler directives, and internal link suggestions.
          </p>
        </div>

        <Badge variant="success" size="md" dot dotPulse>
          Meta Tags Active
        </Badge>
      </div>

      {/* 3 Core Technical Endpoints Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="flex flex-col justify-between">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                <span>Search Indexing</span>
              </span>
              <Badge variant="success" size="sm">
                Live
              </Badge>
            </div>
            <CardTitle className="text-sm">XML Sitemap</CardTitle>
            <CardDescription>
              Dynamically generated on-demand with all published articles and categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between w-full text-xs font-bold text-primary hover:text-primary/80 pt-3 border-t border-slate-100 dark:border-white/[0.06]"
            >
              <span>Inspect /sitemap.xml</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Rss className="w-4 h-4" />
                <span>Syndication Feed</span>
              </span>
              <Badge variant="warning" size="sm">
                RSS 2.0
              </Badge>
            </div>
            <CardTitle className="text-sm">Public RSS Feed</CardTitle>
            <CardDescription>
              Standard syndicated technology feed formatted with full metadata, media enclosures, and author credits for news aggregators.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <a
              href="/rss.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between w-full text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 pt-3 border-t border-slate-100 dark:border-white/[0.06]"
            >
              <span>Inspect /rss.xml</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4" />
                <span>Crawler Protocol</span>
              </span>
              <Badge variant="secondary" size="sm">
                Robots.txt
              </Badge>
            </div>
            <CardTitle className="text-sm">Crawler Directives</CardTitle>
            <CardDescription>
              Directs Googlebot and web crawlers to public editorial routes while protecting admin, API, and sensitive internal endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white pt-3 border-t border-slate-100 dark:border-white/[0.06]"
            >
              <span>Inspect /robots.txt</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Internal Linking Suggestions Engine */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span>Contextual Internal Linking</span>
              </CardTitle>
              <CardDescription>
                Analyzes text to suggest contextual links to existing articles.
              </CardDescription>
            </div>
            <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
              Link Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Test Content Snippet:
            </label>
            <textarea
              rows={3}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-serif leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handleTestInternalLinks}
            loading={testing}
            loadingText="Analyzing..."
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Find Suggestions
          </Button>

          {suggestions.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Matched Links ({suggestions.length}):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0">
                      <span className="font-bold text-primary">"{s.matchedKeyword}"</span>
                      <span className="text-slate-400 mx-1.5">&rarr;</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{s.title}</span>
                    </div>
                    <a
                      href={`/article/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg text-slate-400 hover:text-primary shrink-0"
                      title="Open article"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOManager;
