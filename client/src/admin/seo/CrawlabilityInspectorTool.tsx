import React, { useState } from 'react';
import { api } from '../../services/api.js';
import {
  Bug,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Globe,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const CrawlabilityInspectorTool: React.FC = () => {
  const [inspectUrl, setInspectUrl] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectUrl.trim()) return;
    setInspecting(true);
    setError(null);
    try {
      const data = await api.inspectCrawlability(inspectUrl.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Crawlability inspection failed');
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bug className="w-6 h-6 text-primary" />
            <span>Crawlability &amp; Indexability Inspector</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audits robots.txt rules, X-Robots-Tag headers, canonical consistency, accidental noindex directives, and redirect chains.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* URL Input Form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="url"
                required
                value={inspectUrl}
                onChange={(e) => setInspectUrl(e.target.value)}
                placeholder="https://yourdomain.com/sample-article"
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={inspecting} className="text-xs shrink-0">
              {inspecting ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
              Inspect Directives
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Inspection Results View */}
      {result && (
        <div className="space-y-6">
          {/* Summary Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                HTTP {result.httpStatus}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">HTTP Status</div>
              <Badge variant={result.httpStatus === 200 ? 'success' : 'destructive'} size="sm" className="mt-2">
                {result.httpStatus === 200 ? 'OK' : 'Error'}
              </Badge>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-2xl font-black text-primary truncate">
                {result.metaRobots || 'index, follow'}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Meta Robots</div>
              <Badge
                variant={(result.metaRobots || '').includes('noindex') ? 'destructive' : 'success'}
                size="sm"
                className="mt-2"
              >
                {(result.metaRobots || '').includes('noindex') ? 'Blocked (Noindex)' : 'Indexable'}
              </Badge>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {result.isAllowedInRobotsTxt ? 'Allowed' : 'Disallowed'}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">robots.txt Directives</div>
              <Badge variant={result.isAllowedInRobotsTxt ? 'success' : 'destructive'} size="sm" className="mt-2">
                {result.isAllowedInRobotsTxt ? 'Crawl Permitted' : 'Crawl Blocked'}
              </Badge>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-2xl font-black text-emerald-600">
                {result.inSitemap ? 'Included' : 'Excluded'}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Sitemap Coverage</div>
              <Badge variant={result.inSitemap ? 'success' : 'outline'} size="sm" className="mt-2">
                {result.inSitemap ? 'In /sitemap.xml' : 'Not Listed'}
              </Badge>
            </Card>
          </div>

          {/* Detailed Directives Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Canonical &amp; Directives Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Declared Canonical Tag</div>
                <div className="font-mono text-slate-800 dark:text-slate-200">
                  {result.canonicalUrl || 'No rel="canonical" tag present'}
                </div>
                {result.canonicalUrl && (
                  <div className="text-[11px] text-slate-500">
                    Matches target URL: {result.canonicalUrl === inspectUrl ? 'Yes (Self-referencing)' : 'No (Cross-URL canonical)'}
                  </div>
                )}
              </div>

              {result.xRobotsTag && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">X-Robots-Tag HTTP Header</div>
                  <div className="font-mono text-slate-800 dark:text-slate-200">
                    {result.xRobotsTag}
                  </div>
                </div>
              )}

              {result.redirectChain && result.redirectChain.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Redirect Chain Detected</span>
                  </div>
                  <ul className="list-disc pl-5 font-mono text-[11px]">
                    {result.redirectChain.map((u: string, idx: number) => (
                      <li key={idx}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
