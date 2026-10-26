import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Layers, Plus, Trash2, CheckCircle2, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table.js';

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
            <Layers className="w-6 h-6 text-primary" />
            <span>Categories &amp; Channels</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage taxonomy, content channels, and automated publishing policies.
          </p>
        </div>

        <Badge variant="outline" size="md">
          {categories.length} Channels
        </Badge>
      </div>

      {/* Two-Column Split: Creator (4 cols) & Channel Directory (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Creator Form (4 cols) */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <CardTitle className="text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                <span>Create Channel</span>
              </CardTitle>
              <CardDescription>
                Add a new topic vertical and set review policy.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Name
                  </label>
                  <Input
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
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center">
                    <span className="px-2.5 py-1.5 text-[11px] bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-xl text-slate-500 font-mono">
                      /category/
                    </span>
                    <Input
                      type="text"
                      required
                      placeholder="quantum-computing"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="rounded-l-none font-mono"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="default"
                  loading={creating}
                  loadingText="Adding Channel..."
                  className="w-full mt-2"
                  icon={<Plus className="w-4 h-4" />}
                >
                  Add Channel
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Channels Directory Table (8 cols) */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Active Category Directory</CardTitle>
                  <CardDescription>
                    Verified published article counts and live editorial policies
                  </CardDescription>
                </div>
                <Badge variant="purple" size="sm">
                  {categories.reduce((acc, c) => acc + (c.articleCount || 0), 0)} Total Dispatches
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-center">Published</TableHead>
                    <TableHead>Publishing Policy</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400">Loading categories...</TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-400">No categories found.</TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat) => {
                      const theme = getCategoryTheme(cat.slug);
                      return (
                        <TableRow key={cat.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                              <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                            </div>
                            {cat.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                                {cat.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            /category/{cat.slug}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                              {cat.articleCount ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>
                            <select
                              value={cat.publishingPolicy || 'manual'}
                              onChange={(e) => handleUpdatePolicy(cat, e.target.value)}
                              className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="manual">Manual Approval</option>
                              <option value="draft">Draft Only</option>
                              <option value="auto">Auto-Publish</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDelete(cat.id, cat.name)}
                              title="Delete category"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
      </div>
    </div>
  );
};

export default CategoriesManager;
