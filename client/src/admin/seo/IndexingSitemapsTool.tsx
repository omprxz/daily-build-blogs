import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Send,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Key,
  ShieldCheck,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const IndexingSitemapsTool: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validatingSitemap, setValidatingSitemap] = useState(false);
  const [sitemapHealth, setSitemapHealth] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIndexingStatus();
      setStatusData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load indexing status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.submitToIndexNow([manualUrl.trim()]);
      if (res.success) {
        setMessage(`Submitted ${manualUrl.trim()} to IndexNow search engines! Response code: ${res.statusCode}`);
        setManualUrl('');
        await fetchStatus();
      } else {
        setError(`IndexNow submission error: ${res.message || 'Failed'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateSitemap = async () => {
    setValidatingSitemap(true);
    try {
      const res = await api.validateSitemapHealth();
      setSitemapHealth(res);
    } catch (err: any) {
      setError(err.message || 'Sitemap health check failed');
    } finally {
      setValidatingSitemap(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Checking IndexNow credentials and sitemap records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            <span>Indexing &amp; Sitemaps Manager</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automates real-time URL push via IndexNow (Bing, Yandex, Seznam), verifies sitemap HTTP status codes, and syncs GSC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleValidateSitemap} disabled={validatingSitemap} className="text-xs">
            {validatingSitemap ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Validate Sitemap Health
          </Button>
          <a href="/sitemap.xml" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm" className="text-xs">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Open /sitemap.xml
            </Button>
          </a>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* IndexNow Key Status Banner */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">IndexNow Verification Key</span>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Key: {statusData?.indexNowKey || 'Generating...'}
            </div>
            <div className="text-[11px] text-slate-400">
              Host Verification: Automatically served at <code className="font-mono">/{statusData?.indexNowKey}.txt</code>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs text-slate-500">Auto-push on publish: </span>
            <Badge variant="purple" size="sm">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Manual URL Submission Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <span>Instant URL Submission (IndexNow Protocol)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Notify all participating search engines (Bing, Naver, Seznam, Yandex) immediately of newly published or updated URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="url"
              required
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://yourdomain.com/sample-article"
              className="text-xs flex-1"
            />
            <Button type="submit" size="sm" disabled={submitting} className="text-xs shrink-0">
              {submitting ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Submit to IndexNow
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sitemap Health Result if checked */}
      {sitemapHealth && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span>Sitemap Health Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-500">Total Entries: </span>
                <span className="font-bold text-slate-900 dark:text-white">{sitemapHealth.totalUrls}</span>
              </div>
              <div>
                <span className="text-slate-500">HTTP 200 OK: </span>
                <span className="font-bold text-emerald-600">{sitemapHealth.healthyCount}</span>
              </div>
              <div>
                <span className="text-slate-500">Dead / Broken: </span>
                <span className="font-bold text-rose-600">{sitemapHealth.brokenCount}</span>
              </div>
            </div>

            {sitemapHealth.brokenUrls?.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
                <div className="font-bold text-xs mb-1">Broken URLs in Sitemap:</div>
                <ul className="list-disc pl-5 font-mono text-[11px]">
                  {sitemapHealth.brokenUrls.map((u: string, idx: number) => (
                    <li key={idx}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission Logs History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span>Recent Indexing &amp; IndexNow Submission History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!statusData?.recentSubmissions || statusData.recentSubmissions.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No submissions recorded yet. Publish an article or submit a URL above to see live push telemetry.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
              {statusData.recentSubmissions.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {log.url}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Target: {log.searchEngine} &bull; {new Date(log.submittedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={log.status === 'success' ? 'success' : 'destructive'} size="sm">
                      {log.status === 'success' ? '200 Submitted' : log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
