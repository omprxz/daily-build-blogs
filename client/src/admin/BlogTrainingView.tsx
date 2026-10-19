import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import {
  GraduationCap,
  Sparkles,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const BlogTrainingView: React.FC = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retrainingId, setRetrainingId] = useState<string | null>(null);
  const [expandedBlogId, setExpandedBlogId] = useState<string | null>(null);

  useEffect(() => {
    loadBlogs();
    // Auto refresh status every 6 seconds if any are pending/fetching
    const interval = setInterval(() => {
      api.getTrainingBlogs().then((data) => {
        if (Array.isArray(data)) {
          setBlogs(data);
        }
      }).catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const loadBlogs = () => {
    setLoading(true);
    api.getTrainingBlogs()
      .then((data) => {
        if (Array.isArray(data)) setBlogs(data);
      })
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    // Split multiple lines or commas
    const urls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 5);

    if (urls.length === 0) return;

    setSubmitting(true);
    try {
      const res = await api.submitTrainingBlogs({ urls });
      alert(res.message || 'Blogs submitted! Web crawler is surfing and training AI.');
      setUrlInput('');
      loadBlogs();
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
      alert('Re-surfing and training triggered!');
      loadBlogs();
    } catch (err: any) {
      alert(`Retrain error: ${err.message}`);
    } finally {
      setRetrainingId(null);
    }
  };

  const handleDelete = async (id: string) => {
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

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-indigo-500" /> Blog Training &amp; Style Learning
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Paste high-quality blog URLs to surf, extract, and train your AI editorial voice on specific blogs and industry references.
        </p>
      </div>

      {/* Overview Stats (Claymorphic 3D Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center clay-badge flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Trained Blogs</div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{totalTrained} / {blogs.length}</div>
          </div>
        </div>

        <div className="clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center clay-badge flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Words Digested</div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{totalWords.toLocaleString()}</div>
          </div>
        </div>

        <div className="clay-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center clay-badge flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Style Models</div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">Active</div>
          </div>
        </div>
      </div>

      {/* URL Submission Form (Clay Card) */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" /> Surf &amp; Train on Blog URLs
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enter one or multiple URLs (one per line). The crawler will visit each page, extract the full text, and train the AI on its tone and concepts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Blog URLs to Learn From
            </label>
            <textarea
              rows={4}
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/blog/how-we-built-ai-search&#10;https://techcrunch.com/2026/02/10/next-gen-llms&#10;https://stratechery.com/2026/ai-platform-shift"
              className="w-full p-3.5 text-xs font-mono clay-input text-gray-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Crawls article text, strips ads, and extracts tone and vocabulary.
            </div>

            <button
              type="submit"
              disabled={submitting || !urlInput.trim()}
              className="py-2.5 px-6 clay-btn-primary font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
              {submitting ? 'Surfing & Learning...' : 'Surf & Train AI'}
            </button>
          </div>
        </form>
      </div>

      {/* Trained Blogs List */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Submitted Blogs &amp; Fetch Status ({blogs.length})
          </h2>
          <button
            onClick={loadBlogs}
            className="p-1.5 rounded-lg clay-btn text-gray-400 hover:text-indigo-500"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-2">
            <GraduationCap className="w-10 h-10 mx-auto opacity-40 text-indigo-400" />
            <p className="font-semibold text-xs text-gray-600 dark:text-gray-300">No training blogs added yet</p>
            <p className="text-[11px]">Paste your favorite tech or industry articles above to begin training the model.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blogs.map((b) => {
              const isTrained = b.status === 'trained';
              const isFailed = b.status === 'failed';
              const isFetching = b.status === 'fetching' || b.status === 'training' || b.status === 'pending';
              const isExpanded = expandedBlogId === b.id;

              return (
                <div
                  key={b.id}
                  className="clay-card-flat p-4 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badges */}
                        {isTrained && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 clay-badge">
                            <CheckCircle2 className="w-3 h-3" /> Fetched &amp; Trained
                          </span>
                        )}
                        {isFetching && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 clay-badge animate-pulse">
                            <Clock className="w-3 h-3" /> Surfing &amp; Learning...
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 clay-badge">
                            <XCircle className="w-3 h-3" /> Failed to Fetch
                          </span>
                        )}

                        {b.wordCount > 0 && (
                          <span className="text-[10px] font-mono text-gray-400">
                            {b.wordCount.toLocaleString()} words
                          </span>
                        )}

                        {b.fetchedAt && (
                          <span className="text-[10px] text-gray-400">
                            • Fetched {new Date(b.fetchedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-xs text-gray-900 dark:text-white mt-1.5 truncate">
                        {b.title || 'Untitled Blog Post'}
                      </h3>

                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-lg"
                      >
                        {b.url} <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0">
                      {isTrained && (
                        <button
                          type="button"
                          onClick={() => setExpandedBlogId(isExpanded ? null : b.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 clay-btn flex items-center gap-1"
                        >
                          {isExpanded ? 'Hide Learned Data' : 'View Learned Data'}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={retrainingId === b.id}
                        onClick={() => handleRetrain(b.id)}
                        className="p-1.5 rounded-lg clay-btn text-gray-400 hover:text-indigo-500 disabled:opacity-50"
                        title="Re-surf & re-train"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${retrainingId === b.id ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded-lg clay-btn text-gray-400 hover:text-rose-500"
                        title="Delete from training corpus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Failure error message if failed */}
                  {isFailed && b.errorMessage && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{b.errorMessage}</span>
                    </div>
                  )}

                  {/* Expanded Learned Knowledge Section */}
                  {isExpanded && isTrained && (
                    <div className="pt-3 border-t border-gray-200/60 dark:border-gray-800/60 space-y-2.5 text-xs">
                      {b.summary && (
                        <div>
                          <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider block">
                            Learned Editorial Summary:
                          </span>
                          <p className="text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                            {b.summary}
                          </p>
                        </div>
                      )}

                      {b.extractedStyle?.tone && (
                        <div>
                          <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider block">
                            Tone &amp; Style Traits:
                          </span>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                            {b.extractedStyle.tone}
                          </span>
                        </div>
                      )}

                      {b.extractedStyle?.keyInsights?.length > 0 && (
                        <div>
                          <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider block mb-1">
                            Key Knowledge Concepts Distilled:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 text-[11px]">
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
  );
};
