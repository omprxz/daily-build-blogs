import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api.js';
import { 
  Radio, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  CheckSquare, 
  Square,
  Loader2,
  AlertCircle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table.js';
import { Input } from '@/components/ui/input.js';

interface BulkFeedItem {
  rawUrl: string;
  feedUrl: string;
  name: string;
  inspecting?: boolean;
  error?: string;
  selected?: boolean;
}

export const SourcesManager: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Mode toggling: 'single' or 'bulk'
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

  // Single Feed Form State
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [isInspectingSingle, setIsInspectingSingle] = useState(false);
  const [singleInspectError, setSingleInspectError] = useState<string | null>(null);

  // Bulk Feeds Form State
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkItems, setBulkItems] = useState<BulkFeedItem[]>([]);
  const [isInspectingBulk, setIsInspectingBulk] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  const navigate = useNavigate();
  const inspectDebounceRef = useRef<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getSources(), api.getDiscoveredItems()])
      .then(([srcs, disc]) => {
        if (Array.isArray(srcs)) {
          setSources(srcs);
          setSelectedIds(prev => {
            const next = new Set<string>();
            const existingIds = new Set(srcs.map(s => s.id));
            prev.forEach(id => {
              if (existingIds.has(id)) next.add(id);
            });
            return next;
          });
        }
        if (Array.isArray(disc)) setDiscovered(disc);
      })
      .catch((err) => {
        console.error('Failed to load sources:', err);
      })
      .finally(() => setLoading(false));
  };

  const handleSingleUrlChange = (val: string) => {
    setNewFeedUrl(val);
    setSingleInspectError(null);

    if (inspectDebounceRef.current) {
      clearTimeout(inspectDebounceRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed || !trimmed.startsWith('http')) {
      return;
    }

    inspectDebounceRef.current = setTimeout(async () => {
      setIsInspectingSingle(true);
      try {
        const res = await api.inspectSourceUrl(trimmed);
        if (res && res.title) {
          setNewFeedName(res.title);
        }
      } catch {
        try {
          const parsed = new URL(trimmed);
          const hostParts = parsed.hostname.replace(/^www\./i, '').split('.');
          const deduced = hostParts[0]?.charAt(0).toUpperCase() + hostParts[0]?.slice(1) || 'RSS Source';
          setNewFeedName(deduced);
        } catch {
          // ignore
        }
        setSingleInspectError('Notice: Could not auto-detect title, please verify manually.');
      } finally {
        setIsInspectingSingle(false);
      }
    }, 400);
  };

  const handleAddSingleFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    try {
      await api.createSource({
        name: newFeedName.trim() || 'New RSS Feed',
        feedUrl: newFeedUrl.trim(),
        priority: 1,
        pollingIntervalMins: 30,
        isEnabled: true,
      });
      setShowAdd(false);
      setNewFeedName('');
      setNewFeedUrl('');
      loadData();
    } catch (err: any) {
      alert(`Failed to add source: ${err.message}`);
    }
  };

  const handleParseAndInspectBulk = async () => {
    const lines = bulkRawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      alert('Please enter at least one feed URL.');
      return;
    }

    setIsInspectingBulk(true);

    const initialItems: BulkFeedItem[] = lines.map(raw => {
      let feedUrl = raw;
      let name = 'RSS Feed';
      try {
        const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        feedUrl = parsed.toString();
        const cleanHost = parsed.hostname.replace(/^www\./i, '').split('.')[0] || '';
        name = cleanHost ? cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1) : 'RSS Feed';
      } catch {
        // invalid URL
      }
      return {
        rawUrl: raw,
        feedUrl,
        name,
        inspecting: true,
        selected: true,
      };
    });

    setBulkItems(initialItems);

    const inspectedItems = await Promise.all(
      initialItems.map(async (item) => {
        try {
          const res = await api.inspectSourceUrl(item.feedUrl);
          return {
            ...item,
            feedUrl: res.feedUrl || item.feedUrl,
            name: res.title || item.name,
            inspecting: false,
          };
        } catch {
          return {
            ...item,
            inspecting: false,
            error: 'XML title extraction failed',
          };
        }
      })
    );

    setBulkItems(inspectedItems);
    setIsInspectingBulk(false);
  };

  const handleUpdateBulkItem = (index: number, field: keyof BulkFeedItem, val: any) => {
    setBulkItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveBulkItem = (index: number) => {
    setBulkItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveBulkFeeds = async () => {
    const selected = bulkItems.filter(b => b.selected !== false);
    if (selected.length === 0) {
      alert('Please select at least one feed to save.');
      return;
    }

    setIsSubmittingBulk(true);
    try {
      const payload = selected.map(item => ({
        name: item.name.trim() || 'RSS Feed',
        feedUrl: item.feedUrl.trim(),
        priority: 1,
        pollingIntervalMins: 30,
        isEnabled: true,
      }));

      await api.createSourcesBulk(payload);
      setShowAdd(false);
      setBulkRawText('');
      setBulkItems([]);
      loadData();
    } catch (err: any) {
      alert(`Bulk add failed: ${err.message}`);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const handleDeleteSingle = async (id: string, name: string) => {
    if (!window.confirm(`Delete feed "${name}"?`)) return;
    try {
      await api.deleteSource(id);
      loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === sources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sources.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Permanently delete ${ids.length} selected RSS sources?`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      await api.bulkDeleteSources(ids);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      alert(`Bulk delete error: ${err.message}`);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handlePollSingle = async (id: string) => {
    setPollingId(id);
    try {
      const res = await api.pollSource(id);
      alert(res.message);
      loadData();
    } catch (err: any) {
      alert(`Poll failed: ${err.message}`);
    } finally {
      setPollingId(null);
    }
  };

  const allSelected = sources.length > 0 && selectedIds.size === sources.length;

  return (
    <div className="space-y-6 w-full max-w-7xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <span>RSS Feeds &amp; Ingestion</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Industry publications polled by the research engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="xs"
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              loading={isDeletingBulk}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete ({selectedIds.size})
            </Button>
          )}

          <Button
            variant="default"
            size="xs"
            onClick={() => {
              setShowAdd(!showAdd);
              if (!showAdd) setSingleInspectError(null);
            }}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {showAdd ? 'Close' : 'Add Sources'}
          </Button>
        </div>
      </div>

      {/* Add / Bulk Import Drawer */}
      {showAdd && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={addMode === 'single' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setAddMode('single')}
              >
                Single URL
              </Button>
              <Button
                type="button"
                variant={addMode === 'bulk' ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setAddMode('bulk')}
                icon={<Layers className="w-3.5 h-3.5" />}
              >
                Bulk Import
              </Button>
            </div>
          </div>

          {/* Single Feed Form */}
          {addMode === 'single' && (
            <form onSubmit={handleAddSingleFeed} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Feed URL
                  </label>
                  <Input
                    type="url"
                    required
                    placeholder="https://example.com/rss.xml"
                    value={newFeedUrl}
                    onChange={(e) => handleSingleUrlChange(e.target.value)}
                    className="font-mono text-xs"
                  />
                  {singleInspectError && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {singleInspectError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Feed Name</span>
                    {isInspectingSingle && (
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Detecting...
                      </span>
                    )}
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Tech Weekly"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="xs"
                  disabled={!newFeedUrl.trim()}
                >
                  Save Feed
                </Button>
              </div>
            </form>
          )}

          {/* Bulk Feed Form */}
          {addMode === 'bulk' && (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={bulkRawText}
                onChange={(e) => setBulkRawText(e.target.value)}
                placeholder="Paste feed URLs (one per line)..."
                className="w-full p-2.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {bulkItems.length > 0 ? `${bulkItems.length} feeds parsed` : 'One URL per line'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleParseAndInspectBulk}
                  disabled={isInspectingBulk || !bulkRawText.trim()}
                  loading={isInspectingBulk}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Parse Feeds
                </Button>
              </div>

              {/* Bulk Items Preview */}
              {bulkItems.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="max-h-56 overflow-y-auto space-y-1.5">
                    {bulkItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${
                          item.selected !== false
                            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950'
                            : 'border-slate-100 dark:border-slate-900 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected !== false}
                          onChange={(e) => handleUpdateBulkItem(idx, 'selected', e.target.checked)}
                          className="rounded border-slate-300 text-primary focus:ring-primary shrink-0"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateBulkItem(idx, 'name', e.target.value)}
                          className="w-1/3 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                        />
                        <span className="flex-1 truncate font-mono text-[11px] text-slate-500">
                          {item.feedUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setBulkItems([])}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="xs"
                      onClick={handleSaveBulkFeeds}
                      disabled={isSubmittingBulk || bulkItems.filter(b => b.selected !== false).length === 0}
                      loading={isSubmittingBulk}
                    >
                      Add Selected
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Active Feeds Table */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Feeds ({sources.length})
            </span>
            {selectedIds.size > 0 && (
              <Badge variant="default" size="sm">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => api.pollAllSources().then(() => loadData())}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Poll All
          </Button>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {allSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                </button>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Feed URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Checked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No RSS feeds configured. Click "Add Sources" above to connect feeds.
                </TableCell>
              </TableRow>
            )}
            {sources.map((s) => {
              const isSelected = selectedIds.has(s.id);
              return (
                <TableRow
                  key={s.id}
                  className={isSelected ? 'bg-primary/5' : undefined}
                >
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(s.id)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">
                    {s.name}
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-xs truncate font-mono text-[11px]">
                    <a
                      href={s.feedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-primary"
                    >
                      <span className="truncate">{s.feedUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.lastStatus === 'success'
                          ? 'success'
                          : s.lastStatus === 'error'
                          ? 'destructive'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {s.lastStatus || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-[11px]">
                    {s.lastFetchedAt ? new Date(s.lastFetchedAt).toLocaleTimeString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handlePollSingle(s.id)}
                        disabled={pollingId === s.id}
                        className="text-primary hover:text-primary"
                      >
                        {pollingId === s.id ? 'Polling...' : 'Poll'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteSingle(s.id, s.name)}
                        title="Delete Feed"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Discovered Stories Stream */}
      <Card className="p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Discovered Research Stories ({discovered.length})
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {discovered.length === 0 && (
            <p className="text-xs text-slate-400 py-3">No stories fetched yet. Click "Poll All" to gather latest headlines.</p>
          )}
          {discovered.slice(0, 12).map((item) => (
            <div key={item.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="max-w-2xl min-w-0">
                <a
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-xs text-slate-900 dark:text-white hover:text-primary flex items-center gap-1 truncate"
                >
                  <span className="truncate">{item.headline}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                </a>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {item.summary}
                </p>
              </div>

              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate('/admin/studio')}
                className="text-primary hover:text-primary gap-1 shrink-0 self-start sm:self-auto"
              >
                <span>Draft</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
