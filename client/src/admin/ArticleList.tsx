import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Eye,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  X,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.js';

export const ArticleList: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Global counts for metrics strip
  const [summaryCounts, setSummaryCounts] = useState<{
    total: number;
    published: number;
    drafts: number;
    inReview: number;
  }>({
    total: 0,
    published: 0,
    drafts: 0,
    inReview: 0,
  });

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadSummaryCounts = useCallback(async () => {
    try {
      const summary = await api.getAnalyticsSummary();
      if (summary?.articles) {
        setSummaryCounts({
          total: Number(summary.articles.total) || 0,
          published: Number(summary.articles.published) || 0,
          drafts: Number(summary.articles.drafts) || 0,
          inReview: Number(summary.articles.inReview) || 0,
        });
      }
    } catch (e: any) {
      console.warn('Could not load summary counts:', e.message);
    }
  }, []);

  const loadArticles = useCallback(
    async (
      targetPage: number = page,
      targetLimit: number = pageSize,
      targetStatus: string = statusFilter,
      targetSearch: string = search
    ) => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page: targetPage,
          limit: targetLimit,
          status: targetStatus,
        };
        if (targetSearch.trim()) {
          params.search = targetSearch.trim();
        }

        const res = await api.getArticles(params);
        if (res?.data) {
          setArticles(res.data);
          const total = Number(res.pagination?.total) ?? res.data.length;
          const pages = Number(res.pagination?.totalPages) ?? Math.max(1, Math.ceil(total / targetLimit));
          setTotalArticles(total);
          setTotalPages(pages);
        }
      } catch (err: any) {
        console.error('Failed to load articles:', err.message);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, statusFilter, search]
  );

  useEffect(() => {
    loadSummaryCounts();
  }, [loadSummaryCounts]);

  useEffect(() => {
    setPage(1);
    loadArticles(1, pageSize, statusFilter, search);
  }, [statusFilter, pageSize]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadArticles(1, pageSize, statusFilter, value);
    }, 250);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page || loading) return;
    setPage(newPage);
    loadArticles(newPage, pageSize, statusFilter, search);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    loadArticles(1, newSize, statusFilter, search);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteArticle(deleteTarget.id);
      setDeleteTarget(null);
      loadArticles(page, pageSize, statusFilter, search);
      loadSummaryCounts();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const renderPaginationControls = (position: 'top' | 'bottom') => {
    const startItem = totalArticles === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalArticles);

    const getPageNumbers = () => {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      if (page <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages];
      }
      if (page >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      }
      return [1, '...', page - 1, page, page + 1, '...', totalPages];
    };

    const pageNumbers = getPageNumbers();

    return (
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl shadow-xs text-xs transition-all ${
          position === 'top' ? 'mb-4' : 'mt-4'
        }`}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{startItem}</span>–
            <span className="font-bold text-slate-900 dark:text-white">{endItem}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{totalArticles}</span> articles
          </span>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <label htmlFor={`page-size-${position}`} className="text-[11px] font-semibold hidden md:inline">
              Per page:
            </label>
            <select
              id={`page-size-${position}`}
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-xs"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => handlePageChange(1)}
            disabled={page <= 1 || loading}
            aria-label="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            <span className="hidden md:inline">Prev</span>
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${position}-${idx}`} className="px-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }
              const isCurrent = p === page;
              return (
                <button
                  key={`page-${position}-${p}`}
                  type="button"
                  onClick={() => handlePageChange(p as number)}
                  disabled={loading}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            icon={<ChevronRight className="w-3.5 h-3.5" />}
            iconPosition="end"
          >
            <span className="hidden md:inline">Next</span>
          </Button>

          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => handlePageChange(totalPages)}
            disabled={page >= totalPages || loading}
            aria-label="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

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

        <Link to="/admin/articles/new">
          <Button
            variant="default"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
          >
            Create New Article
          </Button>
        </Link>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          interactive
          onClick={() => setStatusFilter('all')}
          className={`transition-all ${
            statusFilter === 'all'
              ? 'ring-2 ring-primary bg-primary/10 border-primary/30'
              : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">All Articles</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summaryCounts.total}</div>
          </CardContent>
        </Card>

        <Card
          interactive
          onClick={() => setStatusFilter('published')}
          className={`transition-all ${
            statusFilter === 'published'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
              : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Published</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summaryCounts.published}</div>
          </CardContent>
        </Card>

        <Card
          interactive
          onClick={() => setStatusFilter('draft')}
          className={`transition-all ${
            statusFilter === 'draft'
              ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
              : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Drafts</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summaryCounts.drafts}</div>
          </CardContent>
        </Card>

        <Card
          interactive
          onClick={() => setStatusFilter('in_review')}
          className={`transition-all ${
            statusFilter === 'in_review'
              ? 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700'
              : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">In Review</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summaryCounts.inReview}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search headline, slug, or channel..."
              icon={<Search className="w-4 h-4" />}
              clearable
              onClear={() => handleSearchChange('')}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-primary" /> Filter:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses ({summaryCounts.total})</option>
              <option value="published">Published Only ({summaryCounts.published})</option>
              <option value="draft">Drafts Only ({summaryCounts.drafts})</option>
              <option value="in_review">In Review ({summaryCounts.inReview})</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* TOP PAGINATION CONTROLS */}
      {renderPaginationControls('top')}

      {/* Articles Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Headline &amp; Slug</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-md">
                    <Skeleton className="h-4 w-3/4 mb-1.5" />
                    <Skeleton className="h-3 w-1/2" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto rounded-lg" /></TableCell>
                </TableRow>
              ))
            ) : articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-xs">No articles found matching active filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              articles.map((art) => {
                const theme = getCategoryTheme(art.category?.slug || '');
                return (
                  <TableRow key={art.id}>
                    <TableCell className="font-bold text-slate-900 dark:text-white max-w-md">
                      <Link to={`/admin/articles/${art.id}`} className="hover:text-primary line-clamp-1">
                        {art.title}
                      </Link>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                        /article/{art.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5 font-medium">
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
                            : art.status === 'in_review'
                            ? 'purple'
                            : 'default'
                        }
                        size="sm"
                      >
                        {art.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {art.viewsCount ? art.viewsCount.toLocaleString() : 0}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(art.publishedAt || art.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {art.status === 'published' && (
                          <a
                            href={`/article/${art.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Preview Public Article"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link to={`/admin/articles/${art.id}`}>
                          <Button variant="ghost" size="icon-xs" title="Edit Article">
                            <Edit2 className="w-3.5 h-3.5 text-primary" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget({ id: art.id, title: art.title })}
                          title="Delete Article"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* BOTTOM PAGINATION CONTROLS */}
      {renderPaginationControls('bottom')}

      {/* Deletion Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent onClose={() => setDeleteTarget(null)} className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle>Confirm Article Deletion</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to permanently remove this article dispatch? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 my-2">
              "{deleteTarget.title}"
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={deleting}
              loadingText="Deleting..."
              onClick={confirmDelete}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleList;
