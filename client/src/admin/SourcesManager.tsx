import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api.js';
import { 
  Radio, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Layers, 
  AlertCircle,
  Loader2,
  CheckSquare,
  Square
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // Multi-select state for existing sources
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Mode toggling: 'single' or 'bulk'
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

  // Single Feed Form State: only feedUrl and name (title)
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
          // Clean up selectedIds that no longer exist
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

  // -------------------------------------------------------------
  // Single Feed Inspection & Creation
  // -------------------------------------------------------------
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
      } catch (err: any) {
        // Fallback: deduce basic name from hostname if backend inspect failed
        try {
          const parsed = new URL(trimmed);
          const hostParts = parsed.hostname.replace(/^www\./i, '').split('.');
          const deduced = hostParts[0]?.charAt(0).toUpperCase() + hostParts[0]?.slice(1) || 'RSS Source';
          setNewFeedName(deduced);
        } catch {
          // invalid url
        }
        setSingleInspectError('Notice: Could not parse XML feed title directly, check or edit title manually.');
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

  // -------------------------------------------------------------
  // Bulk Feeds Parser & Inspection
  // -------------------------------------------------------------
  const handleParseAndInspectBulk = async () => {
    const lines = bulkRawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      alert('Please enter or paste at least one feed URL (one per line).');
      return;
    }

    setIsInspectingBulk(true);

    // Initial items populated with fallbacks
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

    // Concurrently poll feeds & extract XML title
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
        } catch (err: any) {
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

  // -------------------------------------------------------------
  // Deletion Actions (Single & Bulk)
  // -------------------------------------------------------------
  const handleDeleteSingle = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    try {
      await api.deleteSource(id);
      loadData();
    } catch (err: any) {
      alert(`Failed to delete source: ${err.message}`);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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

    if (!window.confirm(`Are you sure you want to permanently delete ${ids.length} selected RSS sources?`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      await api.bulkDeleteSources(ids);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      alert(`Bulk deletion failed: ${err.message}`);
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

  const handleDraftFromStory = (item: any) => {
    navigate('/admin/studio');
  };

  const allSelected = sources.length > 0 && selectedIds.size === sources.length;

  return (
    <div className="space-y-8 w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-500" /> RSS Sources &amp; Intelligence Feeds
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage, bulk import, poll, and delete active RSS/Atom news and engineering feeds.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="clay-btn bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2 text-xs flex items-center gap-1.5 border border-rose-200"
            >
              {isDeletingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Selected ({selectedIds.size})
            </button>
          )}

          <button
            onClick={() => {
              setShowAdd(!showAdd);
              if (!showAdd) {
                setSingleInspectError(null);
              }
            }}
            className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> {showAdd ? 'Close Add Panel' : 'Add / Bulk Import Feeds'}
          </button>
        </div>
      </div>

      {/* Add / Bulk Import Drawer */}
      {showAdd && (
        <div className="clay-card p-6 space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Import &amp; Auto-Extract RSS Feeds
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Paste any RSS feed URL. Feed name will be polled and extracted automatically from the XML content.
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  addMode === 'single'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single URL
              </button>
              <button
                type="button"
                onClick={() => setAddMode('bulk')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  addMode === 'bulk'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Bulk URLs
              </button>
            </div>
          </div>

          {/* Mode 1: Single URL Add (Feed URL + Title only) */}
          {addMode === 'single' && (
            <form onSubmit={handleAddSingleFeed} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>RSS / Atom Feed URL</span>
                  {isInspectingSingle && (
                    <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Polling XML to extract feed name...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    placeholder="https://openai.com/news/rss.xml"
                    value={newFeedUrl}
                    onChange={(e) => handleSingleUrlChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs clay-input font-mono"
                  />
                </div>
                {singleInspectError && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {singleInspectError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Feed Title</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Auto-extracted from RSS XML (or edit manually)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OpenAI Newsroom"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs clay-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="clay-btn px-4 py-2 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFeedUrl.trim()}
                  className="clay-btn-primary px-5 py-2 text-xs"
                >
                  Save RSS Feed
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Bulk URLs Import */}
          {addMode === 'bulk' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Paste Multiple RSS Feed URLs (One per line)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Batch poll will extract the feed name from XML content for each URL
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder={`https://news.ycombinator.com/rss\nhttps://openai.com/news/rss.xml\nhttps://blog.google/technology/ai/rss/\nhttps://feeds.arstechnica.com/arstechnica/index`}
                  className="w-full p-3 text-xs clay-input font-mono leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  {bulkItems.length > 0 ? `${bulkItems.length} parsed feeds ready for preview below.` : 'Click below to poll XML and extract feed names.'}
                </p>
                <button
                  type="button"
                  onClick={handleParseAndInspectBulk}
                  disabled={isInspectingBulk || !bulkRawText.trim()}
                  className="clay-btn px-4 py-2 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5"
                >
                  {isInspectingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Poll XML &amp; Extract Feed Names
                </button>
              </div>

              {/* Bulk Preview Table (only Title & Feed URL) */}
              {bulkItems.length > 0 && (
                <div className="clay-card-flat p-4 space-y-3 mt-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Feeds Preview ({bulkItems.filter(b => b.selected !== false).length} selected)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Edit any title or uncheck feeds before saving.
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {bulkItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all ${
                          item.selected !== false
                            ? 'bg-white border-slate-200 shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200 opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected !== false}
                          onChange={(e) => handleUpdateBulkItem(idx, 'selected', e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1 sm:mt-0"
                        />

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={item.name}
                              placeholder="Feed Title"
                              onChange={(e) => handleUpdateBulkItem(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-1 text-xs clay-input"
                            />
                          </div>

                          <div className="sm:col-span-7 font-mono text-[11px] text-slate-600 truncate flex items-center gap-1">
                            <span className="truncate">{item.feedUrl}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBulkItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setBulkItems([])}
                      className="clay-btn px-3 py-1.5 text-xs text-slate-600"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBulkFeeds}
                      disabled={isSubmittingBulk || bulkItems.filter(b => b.selected !== false).length === 0}
                      className="clay-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      {isSubmittingBulk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                      Add All Selected Feeds
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Feeds Table with Multi-Select and Delete actions */}
      <div className="clay-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Active Research Feeds ({sources.length})
            </h3>
            {selectedIds.size > 0 && (
              <span className="clay-badge px-2 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100">
                {selectedIds.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="clay-btn bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 text-xs flex items-center gap-1 font-bold border border-rose-200"
              >
                <Trash2 className="w-3 h-3" /> Delete Selected ({selectedIds.size})
              </button>
            )}

            <button
              onClick={() => {
                api.pollAllSources().then(() => loadData());
              }}
              className="clay-btn px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Poll All Feeds
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-slate-400 hover:text-slate-700"
                    title={allSelected ? 'Deselect All' : 'Select All'}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Feed URL</th>
                <th className="py-3 px-4">Interval</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Fetched</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No RSS feeds configured. Click "Add / Bulk Import Feeds" to add feeds.
                  </td>
                </tr>
              )}
              {sources.map((s) => {
                const isSelected = selectedIds.has(s.id);
                return (
                  <tr 
                    key={s.id} 
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(s.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      <a 
                        href={s.feedUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline flex items-center gap-1 text-slate-600 hover:text-indigo-600"
                      >
                        <span className="truncate">{s.feedUrl}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.pollingIntervalMins}m
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.lastStatus === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : s.lastStatus === 'error'
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {s.lastStatus || 'pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {s.lastFetchedAt ? new Date(s.lastFetchedAt).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePollSingle(s.id)}
                          disabled={pollingId === s.id}
                          className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                        >
                          {pollingId === s.id ? 'Polling...' : 'Test Poll'}
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(s.id, s.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Feed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discovered Items Stream */}
      <div className="clay-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" /> Discovered Breaking Stories ({discovered.length})
        </h3>

        <div className="divide-y divide-slate-100">
          {discovered.length === 0 && (
            <p className="text-xs text-slate-400 py-4">No stories fetched yet. Click "Poll All Feeds" to poll active sources.</p>
          )}
          {discovered.slice(0, 15).map((item) => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="max-w-2xl">
                <a
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-xs text-slate-900 hover:text-indigo-600 flex items-center gap-1"
                >
                  {item.headline} <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {item.summary}
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Relevance Score: {item.relevanceScore}% • Retrieved {new Date(item.retrievedAt).toLocaleTimeString()}
                </div>
              </div>

              <button
                onClick={() => handleDraftFromStory(item)}
                className="clay-btn px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center gap-1 flex-shrink-0"
              >
                <Sparkles className="w-3 h-3" /> Draft with AI
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
