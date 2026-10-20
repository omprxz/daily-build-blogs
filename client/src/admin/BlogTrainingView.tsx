import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api.js';
import {
  GraduationCap,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Plus,
  Tag,
  Check,
  X,
  Edit2,
  Compass
} from 'lucide-react';

interface TrainingTopic {
  id: string;
  text: string;
  type: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const BlogTrainingView: React.FC = () => {
  // Corpus state
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);
  const [expandedBlogId, setExpandedBlogId] = useState<string | null>(null);

  // Topics & Directives state
  const [topics, setTopics] = useState<TrainingTopic[]>([]);
  const [newTopicText, setNewTopicText] = useState('');
  const [newTopicType, setNewTopicType] = useState('topic');
  const [addingTopic, setAddingTopic] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingType, setEditingType] = useState('topic');
  const [filterType, setFilterType] = useState<string>('all');
  const topicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllData();
    // Auto refresh status every 8 seconds if any are pending
    const interval = setInterval(() => {
      api.getTrainingBlogs()
        .then((data) => {
          if (Array.isArray(data)) setBlogs(data);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      api.getTrainingBlogs().catch(() => []),
      api.getTrainingTopics().catch(() => [])
    ])
      .then(([blogsData, topicsData]) => {
        if (Array.isArray(blogsData)) setBlogs(blogsData);
        if (Array.isArray(topicsData)) setTopics(topicsData);
      })
      .finally(() => setLoading(false));
  };

  // --- Topic Management Handlers ---
  const handleAddTopic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTopicText.trim();
    if (!trimmed) return;

    setAddingTopic(true);
    try {
      const res = await api.createTrainingTopic({
        text: trimmed,
        type: newTopicType
      });
      if (res && res.item) {
        setTopics((prev) => [res.item, ...prev]);
      } else {
        // Reload all topics
        const latest = await api.getTrainingTopics();
        if (Array.isArray(latest)) setTopics(latest);
      }
      setNewTopicText('');
      // Keep focus on input for continuous task-list style entry
      setTimeout(() => topicInputRef.current?.focus(), 50);
    } catch (err: any) {
      alert(`Failed to save directive: ${err.message}`);
    } finally {
      setAddingTopic(false);
    }
  };

  const handleToggleTopicActive = async (topic: TrainingTopic) => {
    const updatedStatus = !topic.isActive;
    // Optimistic update
    setTopics((prev) =>
      prev.map((t) => (t.id === topic.id ? { ...t, isActive: updatedStatus } : t))
    );
    try {
      await api.updateTrainingTopic(topic.id, { isActive: updatedStatus });
    } catch (err: any) {
      // Revert on failure
      setTopics((prev) =>
        prev.map((t) => (t.id === topic.id ? { ...t, isActive: topic.isActive } : t))
      );
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleStartEditTopic = (topic: TrainingTopic) => {
    setEditingTopicId(topic.id);
    setEditingText(topic.text);
    setEditingType(topic.type || 'topic');
  };

  const handleSaveEditTopic = async (id: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) return;

    try {
      await api.updateTrainingTopic(id, {
        text: trimmed,
        type: editingType
      });
      setTopics((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, text: trimmed, type: editingType } : t
        )
      );
      setEditingTopicId(null);
    } catch (err: any) {
      alert(`Failed to update directive: ${err.message}`);
    }
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      await api.deleteTrainingTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // --- Blog Corpus Handlers ---
  const handleSubmitUrls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const urls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 5);

    if (urls.length === 0) return;

    setSubmitting(true);
    try {
      await api.submitTrainingBlogs({ urls });
      setUrlInput('');
      const updated = await api.getTrainingBlogs();
      if (Array.isArray(updated)) setBlogs(updated);
    } catch (err: any) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrain = async (id: string) => {
    setRetrainingId(id);
    try {
      await api.retrainBlog(id);
      const updated = await api.getTrainingBlogs();
      if (Array.isArray(updated)) setBlogs(updated);
    } catch (err: any) {
      alert(`Retrain error: ${err.message}`);
    } finally {
      setRetrainingId(null);
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm('Remove this blog from the AI training corpus?')) return;
    try {
      await api.deleteTrainingBlog(id);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const totalTrained = blogs.filter((b) => b.status === 'trained').length;
  const totalWords = blogs.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  const activeTopicsCount = topics.filter((t) => t.isActive).length;

  const filteredTopics = topics.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'active') return t.isActive;
    if (filterType === 'inactive') return !t.isActive;
    return t.type === filterType;
  });

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'keyword':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800';
      case 'phrase':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'instruction':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'category':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'sentence':
        return 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl">
      {/* Top Metrics Bar (Flat UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Focus Directives
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {activeTopicsCount} <span className="text-xs font-normal text-slate-500">/ {topics.length} saved</span>
            </div>
          </div>
          <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Trained Reference Blogs
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {totalTrained} <span className="text-xs font-normal text-slate-500">/ {blogs.length} urls</span>
            </div>
          </div>
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Corpus Words Digested
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {totalWords.toLocaleString()}
            </div>
          </div>
          <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
        </div>
      </div>

      {/* SECTION 1: Persistent Keywords, Topics & Editorial Directives */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Focus Keywords, Topics &amp; Editorial Directives
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active entries are continuously injected into the AI generation pipeline to guide topic discovery, research, and voice.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'active', 'topic', 'keyword', 'instruction'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded capitalize transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Task-List Style Entry Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleAddTopic} className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <input
                ref={topicInputRef}
                type="text"
                required
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                placeholder="Enter topic, keyword phrase, sentence, or writing rule (e.g. Next.js 15 Server Actions, Always include code benchmarks)..."
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newTopicType}
                onChange={(e) => setNewTopicType(e.target.value)}
                className="px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="topic">Topic</option>
                <option value="keyword">Keyword</option>
                <option value="phrase">Phrase</option>
                <option value="category">Category</option>
                <option value="instruction">Writing Rule</option>
                <option value="sentence">Sentence</option>
              </select>

              <button
                type="submit"
                disabled={addingTopic || !newTopicText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry</span>
              </button>
            </div>
          </form>
        </div>

        {/* Entries List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[380px] overflow-y-auto">
          {filteredTopics.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No directives found. Add keywords or topic instructions above to steer AI article generation.
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isEditing = editingTopicId === topic.id;

              return (
                <div
                  key={topic.id}
                  className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                    topic.isActive
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 opacity-70'
                  }`}
                >
                  {/* Left: Active Toggle & Content */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleTopicActive(topic)}
                      title={topic.isActive ? 'Active (Click to disable)' : 'Disabled (Click to enable)'}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        topic.isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                      }`}
                    >
                      {topic.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs border border-indigo-500 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditTopic(topic.id);
                            if (e.key === 'Escape') setEditingTopicId(null);
                          }}
                        />
                        <select
                          value={editingType}
                          onChange={(e) => setEditingType(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                        >
                          <option value="topic">Topic</option>
                          <option value="keyword">Keyword</option>
                          <option value="phrase">Phrase</option>
                          <option value="category">Category</option>
                          <option value="instruction">Writing Rule</option>
                          <option value="sentence">Sentence</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveEditTopic(topic.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded"
                          title="Save changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTopicId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border shrink-0 ${getTypeBadgeClass(
                            topic.type
                          )}`}
                        >
                          {topic.type}
                        </span>
                        <span
                          className={`truncate font-medium ${
                            topic.isActive
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-400 line-through'
                          }`}
                        >
                          {topic.text}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditTopic(topic)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                        title="Edit directive"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete directive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION 2: Reference Blog Crawler & Training Corpus */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Surf &amp; Train on Blog URLs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Crawl article URLs to extract tone, structural patterns, and vocabulary into the AI model.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmitUrls} className="space-y-3">
            <textarea
              rows={3}
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste article URLs (one per line)..."
              className="w-full p-2.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-y"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !urlInput.trim()}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                <span>{submitting ? 'Surfing & Digesting...' : 'Surf & Train AI'}</span>
              </button>
            </div>
          </form>

          {/* Submitted Blogs List */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trained Sources ({blogs.length})
              </span>
              <button
                onClick={loadAllData}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded"
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {blogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No training blogs added yet. Enter URLs above to begin corpus ingestion.
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {blogs.map((b) => {
                  const isTrained = b.status === 'trained';
                  const isFailed = b.status === 'failed';
                  const isFetching =
                    b.status === 'fetching' || b.status === 'training' || b.status === 'pending';
                  const isExpanded = expandedBlogId === b.id;

                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTrained && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Trained
                              </span>
                            )}
                            {isFetching && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3" /> Ingesting...
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3 h-3" /> Ingestion Failed
                              </span>
                            )}

                            {b.wordCount > 0 && (
                              <span className="text-[10px] font-mono text-slate-500">
                                {b.wordCount.toLocaleString()} words
                              </span>
                            )}

                            {b.fetchedAt && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(b.fetchedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-slate-900 dark:text-white mt-1 truncate">
                            {b.title || 'Untitled Reference Post'}
                          </h3>

                          <a
                            href={b.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-lg"
                          >
                            <span className="truncate">{b.url}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isTrained && (
                            <button
                              type="button"
                              onClick={() => setExpandedBlogId(isExpanded ? null : b.id)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Hide Data' : 'View Learned Data'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={retrainingId === b.id}
                            onClick={() => handleRetrain(b.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                            title="Re-crawl and re-train"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${retrainingId === b.id ? 'animate-spin' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlog(b.id)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600"
                            title="Remove source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isFailed && b.errorMessage && (
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{b.errorMessage}</span>
                        </div>
                      )}

                      {/* Expanded Summary */}
                      {isExpanded && isTrained && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                          {b.summary && (
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                                Distilled Summary:
                              </span>
                              <p className="mt-0.5 leading-relaxed">{b.summary}</p>
                            </div>
                          )}

                          {b.extractedStyle?.tone && (
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-200 block">
                                Tone &amp; Style:
                              </span>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                                {b.extractedStyle.tone}
                              </span>
                            </div>
                          )}

                          {b.extractedStyle?.keyInsights?.length > 0 && (
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-1">
                                Core Takeaways:
                              </span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {b.extractedStyle.keyInsights.map((insight: string, idx: number) => (
                                  <li key={idx}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
