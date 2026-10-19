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
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingFeeds, setPollingFeeds] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getAnalyticsSummary(),
      api.getArticles({ limit: 6, status: 'all' }),
    ])
      .then(([stats, arts]) => {
        setSummary(stats);
        if (arts?.data) setRecentArticles(arts.data);
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
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-28 bg-white dark:bg-gray-800 rounded-xl"></div>
          <div className="h-28 bg-white dark:bg-gray-800 rounded-xl"></div>
          <div className="h-28 bg-white dark:bg-gray-800 rounded-xl"></div>
          <div className="h-28 bg-white dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Editorial Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Publishing queue, dynamic AI model consumption &amp; autonomous pipeline health.
          </p>
        </div>

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0">
          <Link
            to="/admin/articles/new"
            className="clay-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" /> New Article
          </Link>
          <Link
            to="/admin/studio"
            className="clay-btn px-3.5 py-2 text-xs flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> AI Studio
          </Link>
          <button
            onClick={handlePollAll}
            disabled={pollingFeeds}
            className="clay-btn px-3.5 py-2 text-xs text-slate-700 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${pollingFeeds ? 'animate-spin text-indigo-600' : ''}`} />
            {pollingFeeds ? 'Polling...' : 'Poll Feeds'}
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total & Published Articles */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Articles</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {summary?.articles?.total || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <span className="text-emerald-600 font-bold">{summary?.articles?.published || 0} Published</span>
            <span>•</span>
            <span>{summary?.articles?.drafts || 0} Drafts</span>
          </div>
        </div>

        {/* Total Pageviews */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shadow-inner">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {summary?.articles?.totalViews || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Privacy-first first-party tracking
          </div>
        </div>

        {/* AI Tokens & Consumption */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AI Token Usage</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {summary?.aiUsage?.totalTokens ? summary.aiUsage.totalTokens.toLocaleString() : '0'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Gemini, Groq, Headless ChatGPT &amp; APIs
          </div>
        </div>

        {/* Estimated AI Cost */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimated Cost</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {summary?.aiUsage?.estimatedCostUsd || '$0.0000'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Low-overhead hybrid model routing
          </div>
        </div>
      </div>

      {/* Source Health & Automation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Research Sources Health */}
        <div className="clay-card p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-indigo-500" /> Source Ingestion Health
            </h3>
            <Link to="/admin/sources" className="text-xs text-indigo-600 font-bold hover:underline">Manage Feeds</Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Healthy Active Feeds
              </span>
              <span className="font-extrabold text-slate-900">{summary?.sources?.healthy || 0} / {summary?.sources?.total || 10}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Failing Feeds
              </span>
              <span className="font-extrabold text-slate-900">{summary?.sources?.errorCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Model Discovery Callout */}
        <div className="lg:col-span-2 clay-card p-6 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 border border-indigo-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Bot className="w-4 h-4" /> Live Dynamic Model Categorization
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Configured for Text, Image, Video &amp; Coding Modalities
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl font-medium">
              All models are classified across Text, Image, and Video generation with live provider probing. Train the AI directly on any custom blogs to mimic exact editorial tone.
            </p>
          </div>
          <div className="pt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/admin/providers"
              className="clay-btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0"
            >
              Configure AI Providers &rarr;
            </Link>
            <Link
              to="/admin/training"
              className="clay-btn px-4 py-2 text-xs font-bold flex items-center gap-1.5 text-amber-700 bg-amber-50 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Blog Training Lab
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Articles Queue */}
      <div className="clay-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">
            Recent Publishing Pipeline
          </h3>
          <Link to="/admin/articles" className="text-xs text-indigo-600 font-bold hover:underline">
            View All Articles &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentArticles.map((art) => (
                <tr key={art.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                    <Link to={`/admin/articles/${art.id}`} className="hover:text-indigo-600">
                      {art.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {art.category?.name || 'General'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      art.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : art.status === 'draft'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      {art.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono font-medium">
                    {art.viewsCount || 0}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(art.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/admin/articles/${art.id}`}
                      className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
