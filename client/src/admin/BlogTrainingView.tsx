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
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';

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
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary border-primary/20 dark:border-primary/30';
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl">
      {/* Top Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card interactive className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Focus Directives
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {activeTopicsCount} <span className="text-xs font-normal text-slate-500">/ {topics.length} saved</span>
            </div>
          </div>
          <Compass className="w-5 h-5 text-primary shrink-0" />
        </Card>

        <Card interactive className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Trained Reference Blogs
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {totalTrained} <span className="text-xs font-normal text-slate-500">/ {blogs.length} urls</span>
            </div>
          </div>
          <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </Card>

        <Card interactive className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Corpus Words Digested
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {totalWords.toLocaleString()}
            </div>
          </div>
          <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
        </Card>
      </div>

      {/* SECTION 1: Persistent Keywords, Topics & Editorial Directives */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Focus Directives &amp; Tone Rules
            </CardTitle>
            <CardDescription>
              Injected into the AI generation pipeline to guide topic discovery and voice.
            </CardDescription>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'active', 'topic', 'keyword', 'instruction'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'ghost'}
                size="xs"
                onClick={() => setFilterType(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </CardHeader>

        {/* Task-List Style Entry Input */}
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50">
          <form onSubmit={handleAddTopic} className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <Input
                ref={topicInputRef}
                type="text"
                required
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                placeholder="Enter topic, keyword phrase, or writing rule..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newTopicType}
                onChange={(e) => setNewTopicType(e.target.value)}
                className="px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="topic">Topic</option>
                <option value="keyword">Keyword</option>
                <option value="phrase">Phrase</option>
                <option value="category">Category</option>
                <option value="instruction">Writing Rule</option>
                <option value="sentence">Sentence</option>
              </select>

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={addingTopic || !newTopicText.trim()}
                loading={addingTopic}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Directive
              </Button>
            </div>
          </form>
        </div>

        {/* Entries List */}
        <div className="divide-y divide-slate-100 dark:divide-white/[0.06] max-h-[380px] overflow-y-auto">
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
                          ? 'bg-primary border-primary text-white'
                          : 'border-slate-300 dark:border-slate-700 hover:border-primary'
                      }`}
                    >
                      {topic.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditTopic(topic.id);
                            if (e.key === 'Escape') setEditingTopicId(null);
                          }}
                        />
                        <select
                          value={editingType}
                          onChange={(e) => setEditingType(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                        >
                          <option value="topic">Topic</option>
                          <option value="keyword">Keyword</option>
                          <option value="phrase">Phrase</option>
                          <option value="category">Category</option>
                          <option value="instruction">Writing Rule</option>
                          <option value="sentence">Sentence</option>
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleSaveEditTopic(topic.id)}
                          className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                          title="Save changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditingTopicId(null)}
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Badge variant="outline" size="sm" className="shrink-0 uppercase">
                          {topic.type}
                        </Badge>
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleStartEditTopic(topic)}
                        className="text-slate-400 hover:text-primary"
                        title="Edit directive"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Delete directive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* SECTION 2: Reference Blog Crawler & Training Corpus */}
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-white/[0.06]">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Learn from Reference Articles
          </CardTitle>
          <CardDescription>
            Crawl article URLs to extract tone, structural patterns, and vocabulary.
          </CardDescription>
        </CardHeader>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmitUrls} className="space-y-3">
            <textarea
              rows={3}
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste article URLs (one per line)..."
              className="w-full p-2.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={submitting || !urlInput.trim()}
                loading={submitting}
                loadingText="Surfing & Ingesting..."
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Digest &amp; Train Voice
              </Button>
            </div>
          </form>

          {/* Submitted Blogs List */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trained Sources ({blogs.length})
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={loadAllData}
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
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
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTrained && (
                              <Badge variant="success" size="sm">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Trained
                              </Badge>
                            )}
                            {isFetching && (
                              <Badge variant="warning" size="sm">
                                <Clock className="w-3 h-3 mr-1" /> Ingesting...
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge variant="destructive" size="sm">
                                <XCircle className="w-3 h-3 mr-1" /> Failed
                              </Badge>
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
                            className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5 truncate max-w-lg"
                          >
                            <span className="truncate">{b.url}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isTrained && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => setExpandedBlogId(isExpanded ? null : b.id)}
                            >
                              <span>{isExpanded ? 'Hide' : 'Details'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            disabled={retrainingId === b.id}
                            onClick={() => handleRetrain(b.id)}
                            className="text-slate-400 hover:text-primary"
                            title="Re-crawl and re-train"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${retrainingId === b.id ? 'animate-spin' : ''}`} />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteBlog(b.id)}
                            className="text-slate-400 hover:text-rose-600"
                            title="Remove source"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {isFailed && b.errorMessage && (
                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{b.errorMessage}</span>
                        </div>
                      )}

                      {/* Expanded Summary */}
                      {isExpanded && isTrained && (
                        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
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
                              <Badge variant="default" size="sm" className="mt-0.5">
                                {b.extractedStyle.tone}
                              </Badge>
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
      </Card>
    </div>
  );
};
