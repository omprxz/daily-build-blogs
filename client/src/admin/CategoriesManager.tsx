import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Layers, Plus, Save, Trash2, CheckCircle2, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [policy, setPolicy] = useState('manual');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    setLoading(true);
    api.getCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createCategory({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        publishingPolicy: policy,
      });
      setName('');
      setSlug('');
      setDescription('');
      loadCategories();
    } catch (err: any) {
      alert(`Error creating category: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePolicy = async (cat: any, newPolicy: string) => {
    try {
      await api.updateCategory(cat.id, { publishingPolicy: newPolicy });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, publishingPolicy: newPolicy } : c));
    } catch (err: any) {
      alert(`Failed to update policy: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (confirm(`Are you sure you want to delete category "${catName}"? Articles in this category will become uncategorized.`)) {
      try {
        await api.deleteCategory(id);
        setCategories(categories.filter(c => c.id !== id));
      } catch (err: any) {
        alert(`Failed to delete category: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-500" />
            <span>Categories &amp; Publishing Policies</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Configure editorial taxonomy, article counts, and automated vs manual approval gates per channel.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {categories.length} Channels Configured
        </div>
      </div>

      {/* Two-Column Split: Creator (4 cols) & Channel Directory (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Creator Form (4 cols) */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-500" />
              <span>Create New Channel</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Define a new editorial vertical and set its default review gate.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Quantum Computing"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL Slug
              </label>
              <div className="flex items-center">
                <span className="px-2.5 py-2 text-[11px] bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-slate-500 font-mono">
                  /category/
                </span>
                <input
                  type="text"
                  required
                  placeholder="quantum-computing"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Publishing Policy
              </label>
              <select
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="manual">Manual Approval (Editorial Review)</option>
                <option value="draft">Draft Only (Never auto-publish)</option>
                <option value="auto">Automatic Publishing (Direct-to-Feed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Channel Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief editorial scope and topic coverage for readers and SEO archives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{creating ? 'Adding Channel...' : 'Add Channel'}</span>
            </button>
          </form>
        </div>

        {/* Channels Directory Table (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Category Directory
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verified published article counts and live editorial policies
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
              {categories.reduce((acc, c) => acc + (c.articleCount || 0), 0)} Total Dispatches
            </span>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[550px]">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[11px] tracking-wider border-b border-slate-200/80 dark:border-white/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">Channel Name</th>
                  <th className="py-2.5 px-3">Slug</th>
                  <th className="py-2.5 px-3 text-center">Published</th>
                  <th className="py-2.5 px-3">Publishing Policy</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">Loading categories...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">No categories found.</td>
                  </tr>
                ) : (
                  categories.map((cat) => {
                    const theme = getCategoryTheme(cat.slug);
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                            <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                          </div>
                          {cat.description && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                              {cat.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          /category/{cat.slug}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {cat.articleCount ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={cat.publishingPolicy || 'manual'}
                            onChange={(e) => handleUpdatePolicy(cat, e.target.value)}
                            className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="manual">Manual Approval</option>
                            <option value="draft">Draft Only</option>
                            <option value="auto">Auto-Publish</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
