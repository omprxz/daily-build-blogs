import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  FileText,
  Eye,
  Bot,
  DollarSign,
  Radio,
  PlusCircle,
  Play,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import {
  deriveNextScheduledPublication,
  NextScheduledPublication,
} from '../utils/publishingSchedule.js';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingFeeds, setPollingFeeds] = useState(false);

  const [scheduledPublication, setScheduledPublication] = useState<NextScheduledPublication | null>(null);

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
      <div className="space-y-6 animate-pulse w-full">
        <div className="h-10 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.08] rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.08] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full pb-10">
      {/* Editorial Command Center Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Autonomous Pipeline Operational</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Editorial Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Publishing queue, dynamic AI model consumption &amp; autonomous pipeline telemetry.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <Link
            to="/admin/articles/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Article</span>
          </Link>
          <Link
            to="/admin/studio"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 border border-emerald-200 dark:border-emerald-800/50 rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI Studio</span>
          </Link>
          <button
            onClick={handlePollAll}
            disabled={pollingFeeds}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0c1220] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] rounded-xl transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${pollingFeeds ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{pollingFeeds ? 'Polling...' : 'Poll Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Next Scheduled Publication Section (Derived from configured publishing flow, shown only when active) */}
      {scheduledPublication && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/60 dark:from-indigo-950/40 dark:via-[#0c1220] dark:to-sky-950/20 border border-indigo-200/80 dark:border-indigo-800/50 shadow-xs transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Publishing Flow</span>
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {scheduledPublication.workflowName}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Next Scheduled Article Publication</span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {scheduledPublication.fullFormatted}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap pt-0.5">
                <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/70 dark:border-indigo-800/50">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{scheduledPublication.timeRemaining}</span>
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Cadence: {scheduledPublication.explanation}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch md:self-center justify-end shrink-0 pt-2 md:pt-0">
              {/* Micro eye icon link which opens view link in new tab */}
              <a
                href={scheduledPublication.previewUrl || '/'}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs flex items-center justify-center shrink-0"
                title="View Live Publication in New Tab"
                aria-label="View Live Publication in New Tab"
              >
                <Eye className="w-4 h-4" />
              </a>

              <Link
                to="/admin/automation"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl transition-colors shadow-2xs shrink-0"
              >
                <span>Publishing Flow Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total & Published Articles */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Articles</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary?.articles?.total || 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary?.articles?.published || 0} Published</span>
            <span>•</span>
            <span>{summary?.articles?.drafts || 0} Drafts</span>
          </div>
        </div>

        {/* Total Pageviews */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary?.articles?.totalViews ? summary.articles.totalViews.toLocaleString() : 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            First-party verified telemetry
          </div>
        </div>

        {/* AI Tokens & Consumption */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Tokens Processed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary?.aiUsage?.totalTokens ? summary.aiUsage.totalTokens.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Dynamic hybrid multi-model routing
          </div>
        </div>

        {/* Estimated AI Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estimated Cost</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {summary?.aiUsage?.estimatedCostUsd || '$0.0000'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            High-efficiency cost containment
          </div>
        </div>
      </div>

      {/* Two-Column Operations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Research Sources & Model Hub (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Research Sources Health */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-500" />
                <span>RSS Ingestion Telemetry</span>
              </h2>
              <Link to="/admin/sources" className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                Manage Feeds
              </Link>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Healthy Active Feeds</span>
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {summary?.sources?.healthy || 0} / {summary?.sources?.total || 10}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Failing Feeds</span>
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {summary?.sources?.errorCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* AI Providers Quick Link Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 dark:from-indigo-950/30 dark:via-[#0c1220] dark:to-sky-950/20 border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Bot className="w-4 h-4" />
              <span>Multi-Provider AI Mesh</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Autonomous Content &amp; Media Synthesis
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Anthropic Claude, Google Gemini, Groq, local Codex, and local browser agents with custom prompt engineering.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/admin/providers"
                className="inline-flex items-center justify-between px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800/80 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Configure AI Providers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/admin/workflows"
                className="inline-flex items-center justify-between px-3.5 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800/80 border border-purple-200/70 dark:border-purple-800/60 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Automated Workflow Orchestrator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Articles Pipeline Table (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Publishing Pipeline
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Latest drafts, scheduled publications, and live dispatches
              </p>
            </div>
            <Link
              to="/admin/articles"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">Headline</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Views</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {recentArticles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No recent articles found in publishing pipeline.
                    </td>
                  </tr>
                ) : (
                  recentArticles.map((art) => {
                    const theme = getCategoryTheme(art.category?.slug || '');
                    return (
                      <tr key={art.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          <Link to={`/admin/articles/${art.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                            {art.title}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                            <span>{art.category?.name || 'General'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            art.status === 'published'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : art.status === 'draft'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                          }`}>
                            {art.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {art.viewsCount || 0}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/admin/articles/${art.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                          >
                            <span>Edit</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
