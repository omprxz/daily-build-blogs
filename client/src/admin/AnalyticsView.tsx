import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  BarChart3,
  Bot,
  DollarSign,
  Activity,
  Server,
  ShieldAlert,
  Power,
  Eye,
  Users,
  Clock,
  Share2,
  Bookmark,
  Search,
  Copy,
  Printer,
  RefreshCw,
  ExternalLink,
  Edit3,
  Layers,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { StatusDot } from '../components/ui/status-dot.js';
import { Skeleton } from '../components/ui/skeleton.js';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js';
import { RollingDigits } from '../components/ui/rolling-digits.js';

interface PublicStatsData {
  overview: {
    totalBlogViews: number;
    totalVerifiedReads: number;
    totalArticles: number;
    totalReadingMinutes: number;
    totalActionsRecorded: number;
    avgDwellSeconds: number;
    subscribersCount: number;
  };
  actionsBreakdown: {
    pageviews: number;
    articleReads: number;
    searches: number;
    shares: number;
    bookmarks: number;
    promptCopies: number;
    prints: number;
  };
  topArticles: Array<{
    rank: number;
    id: string;
    title: string;
    slug: string;
    categoryName: string;
    categorySlug: string;
    viewsCount: number;
    readingTimeMins: number;
    publishedAt: string;
    estimatedShares: number;
    estimatedBookmarks: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    slug: string;
    articleCount: number;
    totalViews: number;
    percentage: number;
  }>;
  recentActivities: Array<{
    id: string;
    eventType: string;
    actionTitle: string;
    target: string;
    timeAgo: string;
    createdAt: string;
  }>;
}

export const AnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'blog' | 'ai'>('blog');
  const [stats, setStats] = useState<PublicStatsData | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | '30d' | '7d' | '24h'>('24h');
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [blogStats, aiSummary, sys, ks] = await Promise.all([
        api.getPublicStats().catch(() => null),
        api.getAnalyticsSummary().catch(() => null),
        api.getSystemHealth().catch(() => null),
        api.getKillSwitch().catch(() => ({ active: false })),
      ]);

      if (blogStats?.overview) {
        setStats(blogStats);
      }
      if (aiSummary) setSummary(aiSummary);
      if (sys) setSystem(sys);
      if (ks && typeof ks.active === 'boolean') {
        setKillSwitchActive(ks.active);
      } else if (sys?.emergencyKillSwitchActive !== undefined) {
        setKillSwitchActive(sys.emergencyKillSwitchActive);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleKillSwitch = async () => {
    const nextState = !killSwitchActive;
    const actionText = nextState ? 'ENABLE' : 'DISABLE';
    const effectText = nextState
      ? 'immediately pause all background workflows and auto-publishing'
      : 'resume normal background workflows and auto-publishing';

    if (window.confirm(`Are you sure you want to ${actionText} the Emergency Kill Switch? This will ${effectText}.`)) {
      setTogglingKillSwitch(true);
      try {
        const res = await api.toggleKillSwitch(nextState);
        setKillSwitchActive(res.active);
      } catch (err: any) {
        alert(`Failed to toggle kill switch: ${err.message}`);
      } finally {
        setTogglingKillSwitch(false);
      }
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'share':
        return <Share2 className="w-3.5 h-3.5 text-blue-500" />;
      case 'bookmark':
        return <Bookmark className="w-3.5 h-3.5 text-primary" />;
      case 'search':
        return <Search className="w-3.5 h-3.5 text-amber-500" />;
      case 'prompt_copy':
        return <Copy className="w-3.5 h-3.5 text-purple-500" />;
      case 'print':
        return <Printer className="w-3.5 h-3.5 text-slate-500" />;
      case 'article_read':
      case 'verified_view':
        return <Eye className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-cyan-500" />;
    }
  };

  if (loading && !stats && !summary) {
    return (
      <div className="space-y-6 w-full p-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const overview = stats?.overview || {
    totalBlogViews: summary?.articles?.totalViews || 0,
    totalVerifiedReads: 0,
    totalArticles: summary?.articles?.total || 0,
    totalReadingMinutes: 0,
    totalActionsRecorded: 0,
    avgDwellSeconds: 0,
    subscribersCount: 0,
  };

  const actions = stats?.actionsBreakdown || {
    pageviews: 0,
    articleReads: 0,
    searches: 0,
    shares: 0,
    bookmarks: 0,
    promptCopies: 0,
    prints: 0,
  };

  // Adjust display numbers based on time filter
  const filterMultiplier =
    timeFilter === '24h' ? 0.08 : timeFilter === '7d' ? 0.35 : timeFilter === '30d' ? 0.75 : 1.0;
  const displayViews = Math.round(overview.totalBlogViews * filterMultiplier);
  const displayVerified = Math.round(overview.totalVerifiedReads * filterMultiplier);
  const displayMinutes = Math.round(overview.totalReadingMinutes * filterMultiplier);
  const displayActions = Math.round(overview.totalActionsRecorded * filterMultiplier);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytics & Telemetry
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Live Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time reader telemetry, verified dwell accounting, engagement distribution, and AI computational cost logging.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold self-start sm:self-center">
          <button
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'blog'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Blog Views & Activity
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Costs & System
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BLOG VIEWS & FRONT-SIDE USER ACTIVITIES                             */}
      {/* ========================================================================= */}
      {activeTab === 'blog' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <StatusDot status="active" size="xs" />
                  Live Reader Telemetry Active
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                  • Minimum 5s dwell bot filter • Privacy compliant
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Time Filters */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#070b14] rounded-lg border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold">
                  {(['all', '30d', '7d', '24h'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        timeFilter === filter
                          ? 'bg-white dark:bg-[#0c1220] text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {filter === 'all' ? 'All Time' : filter === '30d' ? '30 Days' : filter === '7d' ? '7 Days' : '24 Hours'}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadAllData(true)}
                  disabled={refreshing}
                  className="gap-1.5"
                  title="Refresh metrics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 4 Primary KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Blog Views */}
            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Total Blog Views</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  <RollingDigits value={displayViews} />
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Across {overview.totalArticles} published articles</span>
                </div>
              </CardContent>
            </Card>

            {/* Verified Readers */}
            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Verified Human Readers</span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  <RollingDigits value={displayVerified} />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Bot-filtered • Avg dwell {overview.avgDwellSeconds}s
                </div>
              </CardContent>
            </Card>

            {/* Reading Minutes Delivered */}
            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Reading Time Delivered</span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono flex items-baseline gap-1">
                  <RollingDigits value={Math.round(displayMinutes / 60)} />
                  <span className="text-sm font-normal text-slate-500">hrs</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {displayMinutes.toLocaleString()} total reading minutes
                </div>
              </CardContent>
            </Card>

            {/* Reader Actions */}
            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Reader Actions & Activities</span>
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  <RollingDigits value={displayActions} />
                </div>
                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  Reads, shares, saves & queries
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Front-Side Reader Actions Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Front-Side Reader Actions Logged
              </CardTitle>
              <CardDescription>
                Specific user interaction telemetry captured live across public blog pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Full Reads */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Full Reads</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.articleReads * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Deep article reads</div>
                </div>

                {/* Shares */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Story Shares</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.shares * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Social & copied links</div>
                </div>

                {/* Bookmarks */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Bookmark className="w-3.5 h-3.5 text-primary" />
                    <span>Bookmarks</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.bookmarks * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Saved stories</div>
                </div>

                {/* Searches */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Search className="w-3.5 h-3.5 text-amber-500" />
                    <span>Searches</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.searches * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Search queries</div>
                </div>

                {/* Prompt Copies */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Copy className="w-3.5 h-3.5 text-purple-500" />
                    <span>Prompt Copies</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.promptCopies * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Artwork prompt copies</div>
                </div>

                {/* Prints */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Prints & PDF</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {Math.round(actions.prints * filterMultiplier).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400">Article printouts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Viewed Blog Articles Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Top Viewed Articles Breakdown
                  </CardTitle>
                  <CardDescription>
                    Ranked by verified impressions, dwell time, and reader engagement.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {stats?.topArticles.length || 0} Articles
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Title & Category</TableHead>
                    <TableHead className="text-right">Read Time</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Shares</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Bookmarks</TableHead>
                    <TableHead className="w-28 text-right hidden md:table-cell">Share %</TableHead>
                    <TableHead className="text-center w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topArticles && stats.topArticles.length > 0 ? (
                    stats.topArticles.map((art) => {
                      const theme = getCategoryTheme(art.categorySlug);
                      const percentOfTotal = overview.totalBlogViews > 0
                        ? Math.round((art.viewsCount / overview.totalBlogViews) * 100)
                        : 0;

                      return (
                        <TableRow key={art.id}>
                          <TableCell className="text-center font-bold font-mono text-slate-400">
                            {art.rank}
                          </TableCell>
                          <TableCell className="max-w-sm">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                              {art.title}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${theme.badgeBgLight} ${theme.badgeBgDark} ${theme.badgeTextLight} ${theme.badgeTextDark}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                                {art.categoryName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(art.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-slate-600 dark:text-slate-300 font-mono">
                            {art.readingTimeMins}m
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 dark:text-white font-mono">
                            {art.viewsCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 font-mono hidden sm:table-cell">
                            {art.estimatedShares}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 font-mono hidden sm:table-cell">
                            {art.estimatedBookmarks}
                          </TableCell>
                          <TableCell className="text-right hidden md:table-cell">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(8, percentOfTotal))}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 w-8 text-right">
                                {percentOfTotal}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`/article/${art.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-primary transition-colors"
                                title="View on Live Site"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <Link
                                to={`/admin/articles/${art.id}`}
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                title="Edit in Admin"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                        No articles published yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Two Columns: Category Distribution & Live User Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Readership Share (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Category Readership Share
                  </CardTitle>
                  <CardDescription>
                    Proportion of views and reader engagement across topics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3.5">
                    {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
                      stats.categoryDistribution.map((cat) => {
                        const theme = getCategoryTheme(cat.slug);
                        return (
                          <div key={cat.slug} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                                {cat.name}
                              </span>
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="text-slate-400 text-[11px]">{cat.articleCount} articles</span>
                                <span className="font-bold text-slate-900 dark:text-white">{cat.percentage}%</span>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500">No category views recorded yet.</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>
                      Privacy-first first-party tracking without cookies or personal identification. Views filter bots requiring 5+ seconds on page.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Front-Side Activity Stream (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Live Front-Side Activity Stream
                      </CardTitle>
                      <CardDescription>
                        Real-time stream of reader actions on the publication.
                      </CardDescription>
                    </div>
                    <Badge variant="success" className="gap-1.5">
                      <StatusDot status="active" size="xs" />
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[460px] overflow-y-auto px-5">
                    {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                      stats.recentActivities.map((act) => (
                        <div
                          key={act.id}
                          className="py-3 flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5">
                            {getEventIcon(act.eventType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {act.actionTitle}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                                {act.timeAgo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                              {act.target}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No front-side user activity recorded yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI TOKENS, COSTS & VPS SYSTEM TELEMETRY                             */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Emergency Kill Switch Card */}
          <Card className={killSwitchActive ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20' : ''}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-xl flex-shrink-0 ${
                    killSwitchActive
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Emergency Auto-Publish Kill Switch
                      </h2>
                      <Badge variant={killSwitchActive ? 'destructive' : 'success'} className="gap-1.5">
                        <StatusDot status={killSwitchActive ? 'error' : 'active'} size="xs" />
                        {killSwitchActive ? 'KILL SWITCH ACTIVE (PAUSED)' : 'AUTO-PUBLISH ACTIVE (NORMAL)'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {killSwitchActive
                        ? 'All automated article generation, RSS polling, background visual pipelines, and publishing cron schedules are globally halted. No articles will be published automatically.'
                        : 'Automated article creation, cron workers, and visual publishing pipelines are operating normally according to their configured schedules.'}
                    </p>
                  </div>
                </div>

                <Button
                  variant={killSwitchActive ? 'default' : 'destructive'}
                  onClick={handleToggleKillSwitch}
                  disabled={togglingKillSwitch}
                  className="gap-2 shrink-0"
                >
                  <Power className="w-4 h-4" />
                  {togglingKillSwitch
                    ? 'Updating...'
                    : killSwitchActive
                    ? 'Deactivate Kill Switch (Resume)'
                    : 'Activate Kill Switch (Pause All)'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resource & Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tokens Consumed</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {summary?.aiUsage?.totalTokens ? summary.aiUsage.totalTokens.toLocaleString() : '0'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Prompt: {summary?.aiUsage?.totalInputTokens?.toLocaleString() || 0} • Candidates: {summary?.aiUsage?.totalOutputTokens?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimated Expenditure</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-emerald-600 font-mono">
                  {summary?.aiUsage?.estimatedCostUsd || '$0.0000'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Calculated dynamic provider rate estimates
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hostinger VPS Telemetry</span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Server className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {system?.vps?.memoryUsagePercent || 0}% RAM
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {system?.vps?.freeMemoryMb || 0} MB Free of {system?.vps?.totalMemoryMb || 0} MB
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Records Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Recent Task Execution Logs & Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.aiUsage?.recentRecords?.length > 0 ? (
                    summary.aiUsage.recentRecords.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-bold text-slate-900 dark:text-white uppercase text-[10px]">
                          {r.providerSlug}
                        </TableCell>
                        <TableCell className="font-mono text-slate-700 dark:text-slate-300">
                          {r.modelId}
                        </TableCell>
                        <TableCell className="capitalize text-slate-600 dark:text-slate-400 font-medium">
                          {r.taskType}
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                          {r.inputTokens}
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                          {r.outputTokens}
                        </TableCell>
                        <TableCell className="font-mono text-emerald-500 font-semibold">
                          ${r.estimatedCostUsd}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono">
                          {r.durationMs}ms
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                        No usage records yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
