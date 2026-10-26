import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  FileText,
  Eye,
  Users,
  Bot,
  Radio,
  PlusCircle,
  RotateCw,
  Clock,
  ArrowRight,
  Calendar,
  Timer,
  Pencil,
  Cpu,
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import {
  deriveNextScheduledPublication,
  NextScheduledPublication,
  getTimerBreakdown,
} from '../utils/publishingSchedule.js';
import cronstrue from 'cronstrue';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card.js';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table.js';
import { StatusDot } from '@/components/ui/status-dot.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { Switch } from '@/components/ui/switch.js';
import { RollingDigits } from '@/components/ui/rolling-digits.js';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingFeeds, setPollingFeeds] = useState(false);

  const [scheduledPublication, setScheduledPublication] = useState<NextScheduledPublication | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getAnalyticsSummary(),
      api.getArticles({ limit: 8, status: 'all' }),
      api.getWorkflows().catch(() => []),
    ])
      .then(([stats, arts, workflows]) => {
        setSummary(stats);
        if (arts?.data) setRecentArticles(arts.data);
        if (Array.isArray(workflows)) {
          const derived = deriveNextScheduledPublication(workflows);
          setScheduledPublication(derived);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleToggleScheduledFlow = async (newActive: boolean) => {
    if (!scheduledPublication?.workflowId) return;
    const targetId = scheduledPublication.workflowId;

    // Optimistic UI update
    setScheduledPublication((prev) => (prev ? { ...prev, isActive: newActive } : null));

    try {
      await api.toggleWorkflow(targetId);
      const workflows = await api.getWorkflows();
      if (Array.isArray(workflows)) {
        const derived = deriveNextScheduledPublication(workflows);
        setScheduledPublication(derived);
      }
    } catch (err: any) {
      alert(`Could not toggle flow: ${err.message}`);
      loadData();
    }
  };

  const handlePollAll = async () => {
    setPollingFeeds(true);
    try {
      const res = await api.pollAllSources();
      alert(`Polled feeds successfully! Found ${res.totalNewStories} new stories.`);
      loadData();
    } catch (err: any) {
      alert(`Poll error: ${err.message}`);
    } finally {
      setPollingFeeds(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex justify-between items-center pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-80 rounded-2xl" />
          <Skeleton className="lg:col-span-4 h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Dashboard
            </h1>
            <Badge variant="outline" size="sm" dot dotPulse className="text-[11px] font-semibold">
              Live
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publishing queue, audience reach, and automated workflow status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePollAll}
            loading={pollingFeeds}
            loadingText="Polling..."
            icon={<RotateCw className="w-3.5 h-3.5 text-slate-500" />}
          >
            Poll Feeds
          </Button>

          <Button variant="default" size="sm" asChild>
            <Link to="/admin/articles/new" className="flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>New Article</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Next Scheduled Publication Section */}
      {scheduledPublication && (
        <Card className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-card to-sky-50/30 dark:from-primary/15 dark:via-card dark:to-sky-950/15 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Next Scheduled Dispatch</span>
              </div>
              <Badge
                variant={scheduledPublication.isActive ? 'success' : 'secondary'}
                size="sm"
                dot
                dotPulse={scheduledPublication.isActive}
              >
                {scheduledPublication.isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                {/* Real-time Countdown Timer */}
                {(() => {
                  const timer = getTimerBreakdown(
                    scheduledPublication.nextDate.getTime(),
                    nowMs,
                    !scheduledPublication.isActive
                  );

                  if (timer.isPaused) {
                    return (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="font-mono text-lg font-bold">Schedule Paused</span>
                      </div>
                    );
                  }

                  if (timer.isDue) {
                    return (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                        <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="font-mono text-lg font-bold">Due Momentarily</span>
                      </div>
                    );
                  }

                  return (
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10">
                      <Timer className="w-4 h-4 text-primary mr-1" />
                      {timer.days > 0 && (
                        <>
                          <span className="font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
                            {timer.days}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 mr-1">d</span>
                        </>
                      )}
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {String(timer.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mr-1">h</span>
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {String(timer.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mr-1">m</span>
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {String(timer.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">s</span>
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span>
                    {scheduledPublication.fullFormatted.replace(/\s*GMT[+-]?\d*(?::\d+)?/gi, '').trim()} ({scheduledPublication.timezone})
                  </span>
                  <span>•</span>
                  <span>
                    Cadence:{' '}
                    {scheduledPublication.cronExpression
                      ? (() => {
                          try {
                            return cronstrue.toString(scheduledPublication.cronExpression, {
                              use24HourTimeFormat: false,
                            });
                          } catch {
                            return scheduledPublication.formattedTime;
                          }
                        })()
                      : scheduledPublication.formattedTime}
                  </span>
                </div>
              </div>

              {/* Ready-made Switch control */}
              <div className="flex items-center gap-3 pt-2 md:pt-0">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Auto-Publish
                </span>
                <Switch
                  checked={Boolean(scheduledPublication.isActive)}
                  onCheckedChange={handleToggleScheduledFlow}
                  size="md"
                  aria-label="Toggle scheduled publishing"
                />
                <Button variant="ghost" size="sm" asChild className="text-xs text-slate-500">
                  <Link to="/admin/automation">
                    Settings <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4 Metric KPI Cards with RollingDigits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Articles */}
        <Card interactive>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Articles
              </span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <RollingDigits value={summary?.articles?.total || 0} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                <RollingDigits value={summary?.articles?.published || 0} /> published
              </span>
              <span>·</span>
              <span><RollingDigits value={summary?.articles?.drafts || 0} /> drafts</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Impressions */}
        <Card interactive>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Impressions
              </span>
              <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <RollingDigits value={summary?.articles?.totalViews || 0} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Across all published posts
            </div>
          </CardContent>
        </Card>

        {/* Newsletter Subscribers */}
        <Card interactive>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subscribers
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <RollingDigits value={summary?.subscribersCount || 0} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Active newsletter readers
            </div>
          </CardContent>
        </Card>

        {/* AI Compute Cost */}
        <Card interactive>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AI Compute
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                <Cpu className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {summary?.aiUsage?.estimatedCostUsd || '$0.0000'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              <RollingDigits value={summary?.aiUsage?.totalTokens || 0} /> tokens processed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Articles (8 cols) & Live Telemetry (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Articles Pipeline Table (8 cols) */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Recent Publishing Timeline</CardTitle>
                  <CardDescription>
                    Latest drafts, scheduled publications, and live dispatches
                  </CardDescription>
                </div>
                <CardAction>
                  <Button variant="link" size="sm" asChild className="text-xs">
                    <Link to="/admin/articles" className="flex items-center gap-1">
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Headline</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right w-16">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentArticles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                        No recent articles found in publishing pipeline.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentArticles.map((art) => {
                      const theme = getCategoryTheme(art.category?.slug || '');
                      return (
                        <TableRow key={art.id}>
                          <TableCell className="font-bold text-slate-900 dark:text-white max-w-xs truncate">
                            <Link
                              to={`/admin/articles/${art.id}`}
                              className="hover:text-primary"
                            >
                              {art.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 font-medium text-xs">
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                              <span>{art.category?.name || 'General'}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                art.status === 'published'
                                  ? 'success'
                                  : art.status === 'draft'
                                  ? 'warning'
                                  : 'default'
                              }
                              size="sm"
                            >
                              {art.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-xs">
                            {art.viewsCount ? art.viewsCount.toLocaleString() : 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              asChild
                              title="Edit Article"
                              className="text-slate-500 hover:text-primary hover:bg-primary/10"
                            >
                              <Link to={`/admin/articles/${art.id}`} aria-label="Edit Article">
                                <Pencil className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Column: Sources & Live Activity (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Content Sources */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-primary" />
                  <span>Content Sources</span>
                </CardTitle>
                <CardAction>
                  <Button variant="link" size="sm" asChild className="text-xs">
                    <Link to="/admin/sources">Manage</Link>
                  </Button>
                </CardAction>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06]">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <StatusDot tone="success" size="xs" />
                  <span>Active Sources</span>
                </span>
                <Badge variant="success" size="sm">
                  {summary?.sources?.healthy || 0} / {summary?.sources?.total || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06]">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                  <StatusDot tone={summary?.sources?.errorCount > 0 ? 'error' : 'neutral'} size="xs" />
                  <span>Errors / Outages</span>
                </span>
                <Badge variant={summary?.sources?.errorCount > 0 ? 'destructive' : 'secondary'} size="sm">
                  {summary?.sources?.errorCount || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent AI Operations */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <span>AI Activity</span>
                </CardTitle>
                <CardAction>
                  <Button variant="link" size="sm" asChild className="text-xs">
                    <Link to="/admin/analytics">Details</Link>
                  </Button>
                </CardAction>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {summary?.aiUsage?.recentRecords && summary.aiUsage.recentRecords.length > 0 ? (
                summary.aiUsage.recentRecords.slice(0, 4).map((rec: any, idx: number) => (
                  <div
                    key={rec.id || idx}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/[0.04]"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate capitalize">
                        {(rec.taskType || 'generation').replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {rec.providerSlug} · {rec.modelId}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {((rec.inputTokens || 0) + (rec.outputTokens || 0)).toLocaleString()} tok
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ${rec.estimatedCostUsd || '0.000'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No recent AI operations recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
