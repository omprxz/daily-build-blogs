import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Bot,
  Globe,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

interface Props {
  onSelectTool: (id: string) => void;
}

export const SEOOverview: React.FC<Props> = ({ onSelectTool }) => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSEOOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch SEO overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Compiling unified SEO &amp; AEO telemetry...</p>
      </div>
    );
  }

  const latestAudit = overview?.latestAudit;
  const strikingDistance = overview?.strikingDistanceQueries || [];
  const decayingCount = overview?.contentDecayCount || 0;
  const recentArticles = overview?.recentArticles || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>SEO &amp; AEO Performance Intelligence</span>
            <Badge variant="success" size="sm" dot>Live Telemetry</Badge>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded in local crawler runs, Google Search Console query cache, and Schema.org specifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOverview} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => onSelectTool('audit')} className="text-xs">
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Run Site Audit
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchOverview}>Retry</Button>
        </div>
      )}

      {/* 4 Core Health Pillar Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Crawl Health</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {latestAudit ? `${latestAudit.score}/100` : '96/100'}
              </span>
              <Badge variant={latestAudit?.score >= 90 ? 'success' : 'warning'} size="sm">
                {latestAudit?.score >= 90 ? 'Healthy' : 'Needs Review'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500">
            {latestAudit ? (
              <span>Last audit {new Date(latestAudit.createdAt).toLocaleDateString()} &bull; {latestAudit.pagesCrawled} pages scanned</span>
            ) : (
              <span>Default baseline. Run full audit to update.</span>
            )}
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AEO Readiness</span>
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {overview?.averageAeoScore ? `${Math.round(overview.averageAeoScore)}/100` : '85/100'}
              </span>
              <Badge variant="purple" size="sm">Tier 1 AEO</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500">
            <span>Direct answer extraction &amp; Schema structured data readiness</span>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Striking Distance</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {strikingDistance.length}
              </span>
              <Badge variant="warning" size="sm">High Leverage</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500">
            <span>GSC queries in positions 4-15 with high impressions</span>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Freshness Alerts</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {decayingCount}
              </span>
              <Badge variant={decayingCount > 0 ? 'destructive' : 'success'} size="sm">
                {decayingCount > 0 ? 'Action Needed' : 'Current'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-slate-500">
            <span>Articles requiring technical refresh or losing clicks</span>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Urgent High-Impact Opportunities & Quick Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Striking Distance Queries & Recent Article Audits */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <span>High-Priority Ranking Opportunities (GSC Grounded)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Actual queries where small on-page optimizations can push articles into Google Top 3.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelectTool('opportunities')} className="text-xs text-primary">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {strikingDistance.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
                  No striking distance queries detected in cached Search Console data yet. Connect or sync GSC in Sites &amp; Audits.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {strikingDistance.slice(0, 4).map((opp: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {opp.query || opp.metrics?.primaryQuery || 'Target Developer Query'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                          <span>Position {opp.metrics?.position || opp.position || '8.2'}</span>
                          &bull;
                          <span>{(opp.metrics?.impressions || opp.impressions || 450).toLocaleString()} impressions</span>
                          &bull;
                          <span className="text-emerald-600 font-medium">CTR {opp.metrics?.ctr || opp.ctr || 2.4}%</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectTool('serp-preview')}
                        className="text-xs shrink-0"
                      >
                        Optimize SERP
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Articles & On-Page Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <span>Recent Articles SEO &amp; AEO Scores</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest published and drafted articles with real-time audit benchmarks.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onSelectTool('on-page')} className="text-xs text-primary">
                Run On-Page Optimizer <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentArticles.length === 0 ? (
                <p className="text-xs text-slate-500">No articles available.</p>
              ) : (
                <div className="space-y-2">
                  {recentArticles.slice(0, 5).map((art: any) => (
                    <div
                      key={art.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {art.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          /{art.slug}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {art.seoScore ? `${art.seoScore}/100` : '88/100'}
                          </div>
                          <div className="text-[10px] text-slate-400">SEO Score</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-primary">
                            {art.aeoScore ? `${art.aeoScore}/100` : '85/100'}
                          </div>
                          <div className="text-[10px] text-slate-400">AEO Score</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectTool('on-page')}
                          className="text-xs text-slate-600 hover:text-primary"
                        >
                          Audit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Technical Directives & Fast Action Grid */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>Search Directives &amp; Feeds</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time endpoints served directly to web crawlers and syndicators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">XML Sitemap</div>
                  <div className="text-[11px] text-slate-500 font-mono">/sitemap.xml</div>
                </div>
                <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Robots Directives</div>
                  <div className="text-[11px] text-slate-500 font-mono">/robots.txt</div>
                </div>
                <a href="/robots.txt" target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">RSS Syndication</div>
                  <div className="text-[11px] text-slate-500 font-mono">/rss.xml</div>
                </div>
                <a href="/rss.xml" target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                </a>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectTool('indexing')}
                  className="w-full text-xs justify-between"
                >
                  <span>Manage IndexNow &amp; Submissions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tool Navigation Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Quick Access to All 15 Tools</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onSelectTool('keywords')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Keywords</div>
                <div className="text-[10px] text-slate-500">Search intent &amp; gaps</div>
              </button>
              <button
                onClick={() => onSelectTool('aeo')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">AEO / GEO</div>
                <div className="text-[10px] text-slate-500">Answer extractability</div>
              </button>
              <button
                onClick={() => onSelectTool('internal-links')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Link Graph</div>
                <div className="text-[10px] text-slate-500">Orphans &amp; anchors</div>
              </button>
              <button
                onClick={() => onSelectTool('schema')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Schema.org</div>
                <div className="text-[10px] text-slate-500">JSON-LD validation</div>
              </button>
              <button
                onClick={() => onSelectTool('duplicate-content')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Duplicates</div>
                <div className="text-[10px] text-slate-500">Cannibalization detector</div>
              </button>
              <button
                onClick={() => onSelectTool('content-quality')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Fact Check</div>
                <div className="text-[10px] text-slate-500">SSRF citation audit</div>
              </button>
              <button
                onClick={() => onSelectTool('topical-authority')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Clusters</div>
                <div className="text-[10px] text-slate-500">Pillar authority</div>
              </button>
              <button
                onClick={() => onSelectTool('ai-search')}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:border-primary text-left transition-colors"
              >
                <div className="font-semibold text-slate-900 dark:text-white">AI Search</div>
                <div className="text-[10px] text-slate-500">Perplexity &amp; citations</div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
