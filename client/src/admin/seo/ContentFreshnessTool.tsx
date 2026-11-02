import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  History,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const ContentFreshnessTool: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [olderThanDays, setOlderThanDays] = useState<number>(90);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [summaryInput, setSummaryInput] = useState<string>('Refreshed technical dependencies and verified API examples.');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFreshnessQueue(days);
      setQueue(data?.queue || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch freshness review queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(olderThanDays);
  }, [olderThanDays]);

  const handleMarkRefreshed = async (articleId: string) => {
    setUpdatingId(articleId);
    setStatusMsg(null);
    try {
      await api.markArticleRefreshed({
        articleId,
        summaryOfChanges: summaryInput,
      });
      setStatusMsg('Article revision recorded and freshness updated!');
      await fetchQueue(olderThanDays);
    } catch (err: any) {
      setError(err.message || 'Failed to update freshness');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            <span>Content Freshness &amp; Update Scheduler</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Detects aging articles, outdated technical versions, and flags content requiring maintenance review.
          </p>
        </div>

        {/* Filter Interval */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Aging Threshold:</span>
          <select
            value={olderThanDays}
            onChange={(e) => setOlderThanDays(Number(e.target.value))}
            className="text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-medium outline-none"
          >
            <option value={30}>Older than 30 Days</option>
            <option value={60}>Older than 60 Days</option>
            <option value={90}>Older than 90 Days</option>
            <option value={180}>Older than 180 Days</option>
          </select>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Freshness Policy Notice */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-400">
        <span className="font-bold text-slate-900 dark:text-white">Ethical Freshness Rule: </span>
        <span>Publication dates are never arbitrarily bumped. Freshness logs record genuine structural and technical improvements.</span>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>Articles Requiring Maintenance Review ({queue.length})</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Review aging articles to prevent ranking decay and ensure software versions remain accurate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <Spinner className="w-6 h-6 text-primary" />
              <p className="text-xs text-slate-500">Checking article timestamps and historical revisions...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">All content is fresh!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No articles exceed the {olderThanDays}-day review threshold.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs space-y-4">
              {queue.map((item: any) => (
                <div key={item.id} className="pt-3.5 first:pt-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        /{item.slug} &bull; Published: {new Date(item.publishedAt).toLocaleDateString()} ({item.daysSincePublished} days ago)
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={updatingId === item.id}
                        onClick={() => handleMarkRefreshed(item.id)}
                        className="text-xs"
                      >
                        {updatingId === item.id ? <Spinner className="w-3.5 h-3.5 mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                        Record Review &amp; Refresh
                      </Button>
                    </div>
                  </div>

                  {item.outdatedSignals && item.outdatedSignals.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Potentially Outdated References: </span>
                        <span>{item.outdatedSignals.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
