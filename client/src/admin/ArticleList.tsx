import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { PlusCircle, Search, Edit2, Trash2, Eye, Filter } from 'lucide-react';

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
    api.getArticles({ status: statusFilter, limit: 50, search })
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
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Article Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage drafts, schedule publications, review revisions, and edit content.
          </p>
        </div>

        <Link
          to="/admin/articles/new"
          className="clay-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" /> Create New Article
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 clay-card p-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter articles..."
            className="w-full pl-9 pr-3 py-2 text-xs clay-input"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs clay-input cursor-pointer"
          >
            <option value="all">All Articles</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="in_review">In Review</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="clay-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Views</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">Loading articles...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">No articles found matching filters.</td>
                </tr>
              ) : (
                filtered.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm truncate">
                      <Link to={`/admin/articles/${art.id}`} className="hover:text-indigo-600">
                        {art.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {art.category?.name || 'General'}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-slate-600 font-mono font-medium">
                      {art.viewsCount || 0}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : new Date(art.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {art.status === 'published' && (
                          <a
                            href={`/article/${art.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg clay-btn text-slate-500 hover:text-indigo-600"
                            title="View live"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to={`/admin/articles/${art.id}`}
                          className="p-1.5 rounded-lg clay-btn text-slate-500 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(art.id, art.title)}
                          className="p-1.5 rounded-lg clay-btn text-slate-500 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
