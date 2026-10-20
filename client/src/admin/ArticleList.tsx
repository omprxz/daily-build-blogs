import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { PlusCircle, Search, Edit2, Trash2, Eye, Filter, FileText, CheckCircle2, Clock, X, ArrowUpRight } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const ArticleList: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadArticles();
  }, [statusFilter]);

  const loadArticles = () => {
    setLoading(true);
    api.getArticles({ status: statusFilter, limit: 100, search })
      .then((res) => {
        if (res?.data) setArticles(res.data);
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete article "${title}"? This cannot be undone.`)) {
      try {
        await api.deleteArticle(id);
        setArticles(articles.filter(a => a.id !== id));
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.category?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.slug || '').toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = articles.filter(a => a.status === 'published').length;
  const draftCount = articles.filter(a => a.status === 'draft').length;
  const inReviewCount = articles.filter(a => a.status === 'in_review').length;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Article Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage publication dispatches, drafts, editorial review states, and metadata.
          </p>
        </div>

        <Link
          to="/admin/articles/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Article</span>
        </Link>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
              : 'bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">All Articles</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{articles.length}</div>
        </div>

        <div
          onClick={() => setStatusFilter('published')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'published'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
              : 'bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Published</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{publishedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('draft')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'draft'
              ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
              : 'bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Drafts</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{draftCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_review')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'in_review'
              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700'
              : 'bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">In Review</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{inReviewCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headline, slug, or channel..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses ({articles.length})</option>
            <option value="published">Published Only</option>
            <option value="draft">Drafts Only</option>
            <option value="in_review">In Review</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200/80 dark:border-white/[0.06]">
              <tr>
                <th className="py-3 px-4">Headline &amp; Slug</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading articles...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No articles found matching active filters.
                  </td>
                </tr>
              ) : (
                filtered.map((art) => {
                  const theme = getCategoryTheme(art.category?.slug || '');
                  return (
                    <tr key={art.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-md">
                        <Link to={`/admin/articles/${art.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1">
                          {art.title}
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                          /article/{art.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                          <span>{art.category?.name || 'General'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          art.status === 'published'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : art.status === 'draft'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {art.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {art.viewsCount || 0}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : new Date(art.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {art.status === 'published' && (
                            <a
                              href={`/article/${art.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              title="View Live Article"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            to={`/admin/articles/${art.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Article"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(art.id, art.title)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Article"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
  );
};
