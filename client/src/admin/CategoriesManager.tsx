import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Layers, Plus, Save, Trash2 } from 'lucide-react';

export const CategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [policy, setPolicy] = useState('manual');

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

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-500" /> Categories &amp; Editorial Policies
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure publication policy (Manual approval vs Automatic publishing) independently per category.
        </p>
      </div>

      {/* Add New Category */}
      <form onSubmit={handleCreate} className="clay-card p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
          Create New Category
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Category Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
            }}
            className="px-3.5 py-2 text-xs clay-input"
          />
          <input
            type="text"
            required
            placeholder="slug (e.g. quantum-computing)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="px-3.5 py-2 text-xs clay-input font-mono"
          />
          <select
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            className="px-3.5 py-2 text-xs clay-input font-bold cursor-pointer"
          >
            <option value="manual">Manual Approval</option>
            <option value="draft">Draft Only</option>
            <option value="auto">Automatic Publishing</option>
          </select>
        </div>
        <textarea
          rows={2}
          placeholder="Brief description for category archive..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3.5 py-2 text-xs clay-input"
        />
        <button
          type="submit"
          className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </form>

      {/* Category List */}
      <div className="clay-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold border-b border-slate-200/80">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Publishing Policy</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {cat.name}
                  {cat.description && (
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">{cat.description}</div>
                  )}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600">
                  /category/{cat.slug}
                </td>
                <td className="py-3.5 px-4">
                  <select
                    value={cat.publishingPolicy || 'manual'}
                    onChange={(e) => handleUpdatePolicy(cat, e.target.value)}
                    className="px-2.5 py-1 text-xs bg-gray-50 dark:bg-gray-800 border rounded font-semibold"
                  >
                    <option value="manual">Manual Approval</option>
                    <option value="draft">Draft Only</option>
                    <option value="auto">Automatic Publishing</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
