import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Download,
  Play,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const SEOAuditTool: React.FC = () => {
  const [singleUrl, setSingleUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [activeAudit, setActiveAudit] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'notice'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const audits = await api.getSEOAuditHistory();
      setHistory(audits || []);
      if (audits && audits.length > 0 && !activeAudit) {
        loadAuditDetails(audits[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadAuditDetails = async (id: string) => {
    try {
      const data = await api.getSEOAudit(id);
      setActiveAudit(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRunSingleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const result = await api.runSinglePageAudit(singleUrl.trim());
      setActiveAudit(result);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Single page audit failed');
    } finally {
      setRunning(false);
    }
  };

  const handleRunSiteAudit = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await api.runSiteAudit({ maxPages: 25 });
      setActiveAudit(result);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Full site audit failed');
    } finally {
      setRunning(false);
    }
  };

  const filteredFindings = (activeAudit?.findings || []).filter((f: any) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (f.url || '').toLowerCase().includes(q) ||
        (f.issueType || f.title || f.ruleId || '').toLowerCase().includes(q) ||
        (f.message || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const auditData = activeAudit?.audit || (activeAudit ? {
    id: activeAudit.id,
    overallScore: activeAudit.overallScore ?? activeAudit.score ?? 0,
    pagesCrawled: activeAudit.pagesCrawled ?? 1,
    criticalCount: activeAudit.criticalCount ?? activeAudit.issuesCount?.critical ?? (activeAudit.findings?.filter((f: any) => f.severity === 'critical').length ?? 0),
    warningCount: activeAudit.warningCount ?? activeAudit.issuesCount?.warning ?? (activeAudit.findings?.filter((f: any) => f.severity === 'warning').length ?? 0),
    noticeCount: activeAudit.noticeCount ?? activeAudit.issuesCount?.notice ?? (activeAudit.findings?.filter((f: any) => f.severity === 'notice').length ?? 0),
  } : null);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            <span>SEO Audit &amp; Technical Crawler</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cheerio-powered HTTP crawler inspecting headings, metadata, broken links, robots directives, and Schema.org errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunSiteAudit} disabled={running} className="text-xs">
            {running ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
            Crawl Full Site
          </Button>
          {auditData?.id && auditData.id !== 'single-page' && (
            <a href={`/api/seo/audit/${auditData.id}/export.csv`} download>
              <Button variant="secondary" size="sm" className="text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Page Audit Input */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleRunSingleAudit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="url"
                required
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="Audit specific URL (e.g., https://yourdomain.com/sample-article)"
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={running} className="text-xs shrink-0">
              {running ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
              Audit URL
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Audit Summary & KPI Cards */}
      {activeAudit && auditData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="p-3.5 text-center flex flex-col justify-center">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {auditData.overallScore}/100
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Health Score</div>
            </Card>

            <Card className="p-3.5 text-center flex flex-col justify-center">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {auditData.pagesCrawled}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Pages Crawled</div>
            </Card>

            <Card className="p-3.5 text-center flex flex-col justify-center border-rose-200 dark:border-rose-900/40">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {auditData.criticalCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mt-1">Critical Issues</div>
            </Card>

            <Card className="p-3.5 text-center flex flex-col justify-center border-amber-200 dark:border-amber-900/40">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {auditData.warningCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mt-1">Warnings</div>
            </Card>

            <Card className="p-3.5 text-center flex flex-col justify-center">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {auditData.noticeCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 mt-1">Notices</div>
            </Card>
          </div>

          {/* Filter & Findings Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span>Crawl Findings &amp; Recommended Fixes</span>
                  <Badge variant="outline" size="sm">{filteredFindings.length} issues</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Review identified technical issues, affected URLs, and resolution instructions.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] p-0.5 text-xs bg-slate-50 dark:bg-white/[0.02]">
                  <button
                    onClick={() => setSeverityFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      severityFilter === 'all' ? 'bg-white dark:bg-white/10 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSeverityFilter('critical')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      severityFilter === 'critical' ? 'bg-rose-500 text-white shadow-2xs' : 'text-rose-600'
                    }`}
                  >
                    Critical
                  </button>
                  <button
                    onClick={() => setSeverityFilter('warning')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      severityFilter === 'warning' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-600'
                    }`}
                  >
                    Warnings
                  </button>
                  <button
                    onClick={() => setSeverityFilter('notice')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      severityFilter === 'notice' ? 'bg-blue-500 text-white shadow-2xs' : 'text-blue-600'
                    }`}
                  >
                    Notices
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredFindings.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No issues matching this filter</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Your site passed all checks in this category.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {filteredFindings.map((finding: any, idx: number) => (
                    <div key={idx} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {finding.severity === 'critical' && (
                            <Badge variant="destructive" size="sm" className="font-bold uppercase tracking-wider">Critical</Badge>
                          )}
                          {finding.severity === 'warning' && (
                            <Badge variant="warning" size="sm" className="font-bold uppercase tracking-wider">Warning</Badge>
                          )}
                          {finding.severity === 'notice' && (
                            <Badge variant="secondary" size="sm" className="font-bold uppercase tracking-wider">Notice</Badge>
                          )}
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {(finding.issueType || finding.title || finding.ruleId || 'Issue').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                          {finding.url}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 pl-2 border-l-2 border-slate-200 dark:border-white/[0.1]">
                        {finding.message}
                      </div>

                      {finding.recommendation && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] flex items-start gap-2">
                          <span className="font-bold text-primary shrink-0">Fix:</span>
                          <span>{finding.recommendation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Audit Runs */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Past Crawl Audit Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
              {history.map((h: any) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 dark:text-white">Score: {h.overallScore ?? h.score ?? 0}/100</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500">{h.pagesCrawled ?? 0} pages crawled</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-400">{new Date(h.createdAt || h.startedAt || Date.now()).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => loadAuditDetails(h.id)} className="text-xs">
                      Load Report
                    </Button>
                    <a href={`/api/seo/audit/${h.id}/export.csv`} download>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
