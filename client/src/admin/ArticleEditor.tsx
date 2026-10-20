import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  Save,
  ArrowLeft,
  Sparkles,
  Eye,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  ExternalLink,
  History,
  RotateCcw,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Bot,
  Loader2,
  Check,
  Copy,
  Info,
  X,
  Wand2,
} from 'lucide-react';
import { RichTextEditor } from './components/RichTextEditor.js';

export const ArticleEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [persistedId, setPersistedId] = useState<string | null>(id && id !== 'new' ? id : null);
  const isNew = !persistedId && (!id || id === 'new');
  const navigate = useNavigate();

  useEffect(() => {
    if (id && id !== 'new') {
      setPersistedId(id);
    }
  }, [id]);

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(Boolean(id && id !== 'new'));
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('draft');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageOption, setImageOption] = useState<'upload' | 'url' | 'agent'>('agent');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [queueingAgent, setQueueingAgent] = useState(false);
  const [pollingAgentImage, setPollingAgentImage] = useState(false);
  const [activeAgentJobId, setActiveAgentJobId] = useState<string | null>(null);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Advanced AI Image Engine Selection
  const [aiImageEngine, setAiImageEngine] = useState<'agent' | 'codex' | 'agy' | 'gemini'>('codex');
  const [geminiImageModel, setGeminiImageModel] = useState<string>('imagen-3.0-generate-002');
  const [customImagePrompt, setCustomImagePrompt] = useState<string>('');
  const [generatedImagePath, setGeneratedImagePath] = useState<string | null>(null);
  const [imageGenSuccessNotice, setImageGenSuccessNotice] = useState<string | null>(null);

  const getDynamicThumbnailPrompt = () => {
    const titleText = title.trim() || 'Modern Technology Innovation';
    const catName = categories.find((c) => c.id === categoryId)?.name || 'Technology';

    return `Create a minimalist, hand-drawn editorial thumbnail for the article "${titleText}", in the category "${catName}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;
  };

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isFeaturedLead, setIsFeaturedLead] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Revisions & Sources
  const [revisions, setRevisions] = useState<any[]>([]);
  const [sources, setSources] = useState<{ sourceName: string; url: string; claimExtracted?: string }[]>([]);

  // AI Assistant & Title Generation State
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [titleProvider, setTitleProvider] = useState('antigravity');
  const [titleModel, setTitleModel] = useState('');

  // AI Content Studio / Rewriter State
  const [showRewriterModal, setShowRewriterModal] = useState(false);
  const [rewriterSelectedText, setRewriterSelectedText] = useState('');
  const [rewriterPreset, setRewriterPreset] = useState<'professional' | 'brief' | 'detailed' | 'indepth'>('professional');
  const [rewriterCustomPrompt, setRewriterCustomPrompt] = useState('');
  const [rewriterProvider, setRewriterProvider] = useState('antigravity');
  const [rewriterModel, setRewriterModel] = useState('');
  const [rewritingContent, setRewritingContent] = useState(false);
  const [rewrittenOutput, setRewrittenOutput] = useState('');

  // Auto-polling for image generated by ChatGPT webhook agent
  useEffect(() => {
    const activeArticleId = persistedId || (id && id !== 'new' ? id : null);
    if (!pollingAgentImage || !activeArticleId) return;

    let attempts = 0;
    const maxAttempts = 100; // poll up to 5 minutes (3s * 100)
    const interval = setInterval(async () => {
      attempts++;
      try {
        const latest = await api.getArticle(activeArticleId, { adminEdit: true });
        if (latest?.featuredImage && latest.featuredImage !== featuredImage) {
          setFeaturedImage(latest.featuredImage);
          if (latest.featuredImageAlt) setFeaturedImageAlt(latest.featuredImageAlt);
          if (latest.status) setStatus(latest.status);
          setPollingAgentImage(false);
          setAgentNotice('✨ Featured 16:9 image was generated by ChatGPT and applied automatically!');
          clearInterval(interval);
        }
      } catch (e) {
        console.warn('Error polling article for generated image:', e);
      }

      if (attempts >= maxAttempts) {
        setPollingAgentImage(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingAgentImage, persistedId, id, featuredImage]);

  useEffect(() => {
    api.getCategories().then((cats) => {
      if (Array.isArray(cats)) {
        setCategories(cats);
        if (isNew && cats.length > 0) setCategoryId(cats[0].id);
      }
    });

    api.getAIProviders(true).then((provs) => {
      if (Array.isArray(provs)) {
        setAiProviders(provs);
        if (provs.length > 0) {
          setTitleProvider(provs[0].slug);
          setRewriterProvider(provs[0].slug);
        }
      }
    }).catch(() => {});

    if (!isNew && id) {
      setLoading(true);
      api.getArticle(id, { adminEdit: true })
        .then((data) => {
          setTitle(data.title || '');
          setSlug(data.slug || '');
          setExcerpt(data.excerpt || '');
          setContentHtml(data.contentHtml || '');
          setCategoryId(data.categoryId || '');
          setStatus(data.status || 'draft');
          setFeaturedImage(data.featuredImage || '');
          setFeaturedImageAlt(data.featuredImageAlt || '');
          setMetaTitle(data.metaTitle || '');
          setMetaDescription(data.metaDescription || '');
          setIsFeaturedLead(data.isFeaturedLead || false);
          setIsTrending(data.isTrending || false);
          setTagsInput(Array.isArray(data.tags) ? data.tags.join(', ') : '');
          setRevisions(data.revisions || []);
          setSources(data.sources || []);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !excerpt.trim() || !contentHtml.trim()) {
      alert('Title, excerpt, and content body are required.');
      return;
    }

    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const payload = {
      title,
      slug: slug.trim() || undefined,
      excerpt,
      contentHtml,
      categoryId,
      status,
      featuredImage: featuredImage.trim() || null,
      featuredImageAlt: featuredImageAlt.trim() || title,
      metaTitle: metaTitle.trim() || title,
      metaDescription: metaDescription.trim() || excerpt,
      isFeaturedLead,
      isTrending,
      tags,
      sources,
    };

    try {
      const activeArticleId = persistedId || (id && id !== 'new' ? id : null);
      if (activeArticleId) {
        await api.updateArticle(activeArticleId, payload);
        alert('Article updated successfully!');
      } else {
        const created = await api.createArticle(payload);
        setPersistedId(created.id);
        alert('Article created successfully!');
        navigate(`/admin/articles/${created.id}`);
      }
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTitles = async () => {
    setGeneratingTitles(true);
    try {
      const res = await api.generateTitles({
        prompt: title || excerpt || 'Advanced Enterprise Technology',
        topic: title || excerpt,
        provider: titleProvider,
        model: (titleProvider === 'antigravity' || titleProvider === 'codex') ? undefined : titleModel,
        count: 4,
      });
      if (res?.titles && res.titles.length > 0) {
        setTitleSuggestions(res.titles);
      }
    } catch (err: any) {
      alert(`Title generation failed: ${err.message}`);
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleApplyTitle = (chosenTitle: string) => {
    setTitle(chosenTitle);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) {
      setSlug(chosenTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
    setShowTitleModal(false);
  };

  const handleOpenRewriter = (selectedSnippet?: string) => {
    setRewriterSelectedText(selectedSnippet || '');
    setRewrittenOutput('');
    setShowRewriterModal(true);
  };

  const handleExecuteRewrite = async () => {
    if (!contentHtml.trim() && !rewriterSelectedText.trim()) {
      alert('Article content or selected text is required to rewrite.');
      return;
    }
    setRewritingContent(true);
    setRewrittenOutput('');
    try {
      const res = await api.rewriteContent({
        content: contentHtml,
        selectedText: rewriterSelectedText || undefined,
        preset: rewriterPreset,
        customPrompt: rewriterCustomPrompt || undefined,
        provider: rewriterProvider,
        model: (rewriterProvider === 'antigravity' || rewriterProvider === 'codex') ? undefined : rewriterModel,
      });
      if (res?.rewritten) {
        setRewrittenOutput(res.rewritten);
      }
    } catch (err: any) {
      alert(`Content generation/rewrite failed: ${err.message}`);
    } finally {
      setRewritingContent(false);
    }
  };

  const handleApplyRewritten = () => {
    if (!rewrittenOutput) return;
    if (rewriterSelectedText && contentHtml.includes(rewriterSelectedText)) {
      setContentHtml(contentHtml.replace(rewriterSelectedText, rewrittenOutput));
    } else {
      setContentHtml(rewrittenOutput);
    }
    setShowRewriterModal(false);
  };

  const handleAddSource = () => {
    setSources([...sources, { sourceName: '', url: '', claimExtracted: '' }]);
  };

  const handleRestoreRevision = (rev: any) => {
    if (confirm(`Restore revision #${rev.revisionNumber}? Current editor text will be replaced.`)) {
      setTitle(rev.title);
      setContentHtml(rev.contentHtml);
      if (rev.excerpt) setExcerpt(rev.excerpt);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-12 animate-pulse space-y-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 w-full pb-16">
      {/* Top Header */}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/articles')}
            className="p-2.5 rounded-xl clay-btn text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isNew ? 'Create New Article' : 'Edit Article'}
            </h1>
            <div className="text-xs text-slate-500 font-medium">Editorial CMS &amp; SEO Engine</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold clay-input cursor-pointer"
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="clay-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Article'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Article Headline
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowTitleModal(true);
                  if (titleSuggestions.length === 0) {
                    handleGenerateTitles();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Titles</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Breakthrough in Sub-Nanosecond Reasoning Architectures"
              className="w-full px-4 py-3 text-base font-bold clay-input text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              URL Slug (Canonical Permalinks)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono font-bold">/article/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="leave blank to auto-generate from headline"
                className="flex-1 px-3 py-2 text-xs clay-input font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Editorial Excerpt (Standfirst)
            </label>
            <textarea
              required
              rows={3}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Concise, captivating 2-sentence technical summary..."
              className="w-full px-3 py-2 text-xs clay-input text-slate-900 font-serif leading-relaxed"
            />
          </div>

          {/* HTML / Body Content with RichTextEditor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Article Body &amp; Rich-Text Content
              </label>
              <button
                type="button"
                onClick={() => handleOpenRewriter()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI Content Studio</span>
              </button>
            </div>
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              articleTitle={title}
              onOpenAiRewriter={handleOpenRewriter}
              placeholder="Write or edit full editorial HTML with live formatting..."
            />
          </div>

          {/* Sources Section */}
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Primary Sources &amp; Fact Checking Citations
              </h3>
              <button
                type="button"
                onClick={handleAddSource}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Add Source Citation
              </button>
            </div>

            {sources.map((s, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Source Name (e.g. Google DeepMind)"
                  value={s.sourceName}
                  onChange={(e) => {
                    const copy = [...sources];
                    copy[idx].sourceName = e.target.value;
                    setSources(copy);
                  }}
                  className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded"
                />
                <input
                  type="url"
                  placeholder="Canonical URL"
                  value={s.url}
                  onChange={(e) => {
                    const copy = [...sources];
                    copy[idx].url = e.target.value;
                    setSources(copy);
                  }}
                  className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded"
                />
                <input
                  type="text"
                  placeholder="Extracted claim / quote"
                  value={s.claimExtracted || ''}
                  onChange={(e) => {
                    const copy = [...sources];
                    copy[idx].claimExtracted = e.target.value;
                    setSources(copy);
                  }}
                  className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border rounded"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Meta, Media, SEO, Revisions */}
        <div className="space-y-6">
          {/* Category & Placement */}
          <div className="clay-card p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Taxonomy &amp; Placement
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Primary Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs clay-input text-slate-800 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="AI, LLMs, Linux, Rust"
                className="w-full px-3 py-2 text-xs clay-input"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeaturedLead}
                  onChange={(e) => setIsFeaturedLead(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700">Featured Lead Story on Homepage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold text-slate-700">Mark as Trending Intelligence</span>
              </label>
            </div>
          </div>

          {/* Featured Thumbnail */}
          <div className="clay-card p-5 space-y-3 relative overflow-hidden border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/20">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Featured Thumbnail &amp; Cover
              </h3>
              {featuredImage && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Ready (16:9)
                </span>
              )}
            </div>

            {/* Current Image Preview */}
            {featuredImage ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xs bg-slate-950/20">
                <img src={featuredImage} alt={featuredImageAlt || 'Cover preview'} className="w-full h-36 object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-3">
                  <span className="text-white text-[11px] font-semibold bg-black/60 px-2 py-1 rounded">
                    16:9 Featured Cover
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeaturedImage('');
                      setFeaturedImageAlt('');
                    }}
                    className="text-[11px] bg-rose-600 text-white px-2 py-1 rounded hover:bg-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-gray-400 text-xs">
                <ImageIcon className="w-6 h-6 mb-1 opacity-50 text-indigo-500" />
                <span>No featured cover selected</span>
              </div>
            )}

            {/* 3 Featured Image Options Tab Bar */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setImageOption('agent')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  imageOption === 'agent'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                Local AI Agent
              </button>
              <button
                type="button"
                onClick={() => setImageOption('upload')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  imageOption === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-500" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImageOption('url')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  imageOption === 'url'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                Image URL
              </button>
            </div>

            {/* Option 1: AI Image Generation Engines */}
            {imageOption === 'agent' && (
              <div className="space-y-3 pt-1">
                {/* Engine Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      AI Generation Engine:
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {aiImageEngine === 'agent' && 'Local Laptop Agent (ChatGPT Webhook)'}
                      {aiImageEngine === 'codex' && 'OpenAI Codex CLI (Direct Prompt)'}
                      {aiImageEngine === 'agy' && 'Google Antigravity CLI (agy)'}
                      {aiImageEngine === 'gemini' && 'Google Gemini (Imagen & Flash)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAiImageEngine('agent')}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center truncate ${
                        aiImageEngine === 'agent'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Local Agent
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiImageEngine('codex')}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center truncate ${
                        aiImageEngine === 'codex'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Codex CLI
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiImageEngine('agy')}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center truncate ${
                        aiImageEngine === 'agy'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Antigravity
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiImageEngine('gemini')}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center truncate ${
                        aiImageEngine === 'gemini'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Gemini
                    </button>
                  </div>
                </div>

                {/* Gemini Model Selector (Shown when Gemini is selected) */}
                {aiImageEngine === 'gemini' && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Gemini Image Model</span>
                      <span className="text-[10px] text-indigo-500 font-normal">Imagen & Flash Models</span>
                    </label>
                    <select
                      value={geminiImageModel}
                      onChange={(e) => setGeminiImageModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <optgroup label="Imagen Variants">
                        <option value="imagen-3.0-generate-002">imagen-3.0-generate-002 (Imagen 3 High Quality)</option>
                        <option value="imagen-3.0-fast-generate-001">imagen-3.0-fast-generate-001 (Imagen 3 Fast)</option>
                        <option value="imagegeneration@006">imagegeneration@006 (Vertex Imagen 2)</option>
                      </optgroup>
                      <optgroup label="Gemini Flash Visual Models">
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Flash Visual SVG)</option>
                        <option value="gemini-3.8-flash">gemini-3.8-flash (Flash 3.8 Visual SVG)</option>
                        <option value="gemini-latest-flash">gemini-latest-flash (Flash Latest Visual SVG)</option>
                      </optgroup>
                    </select>
                  </div>
                )}

                {/* Prompt Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Generation Prompt:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomImagePrompt(getDynamicThumbnailPrompt())}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Reset to Headline
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPromptModal(true)}
                        title="View Full Thumbnail Prompt"
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={customImagePrompt || getDynamicThumbnailPrompt()}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="Enter or refine visual prompt..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Status / Output File Path Notice */}
                {generatedImagePath && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold">Image Generated Successfully!</div>
                      <div className="font-mono text-[10px] truncate mt-0.5 text-emerald-700 dark:text-emerald-400">
                        Output: {generatedImagePath}
                      </div>
                    </div>
                  </div>
                )}

                {agentNotice && (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{agentNotice}</span>
                  </div>
                )}

                {/* Polling banner for Local Agent */}
                {pollingAgentImage && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                      <span>Waiting for ChatGPT to generate & upload 16:9 cover...</span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setPollingAgentImage(false);
                        setAgentNotice(null);
                        if (activeAgentJobId) {
                          try {
                            await api.cancelAutomationJob(activeAgentJobId);
                          } catch {}
                          setActiveAgentJobId(null);
                        }
                      }}
                      className="text-[10px] underline text-amber-700 hover:text-amber-900 ml-2"
                    >
                      Stop & Cancel
                    </button>
                  </div>
                )}

                {/* Action Trigger Buttons */}
                {aiImageEngine === 'agent' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={queueingAgent}
                      onClick={async () => {
                        if (!title) {
                          alert('Please enter an article headline first.');
                          return;
                        }
                        setQueueingAgent(true);
                        setAgentNotice(null);
                        try {
                          let targetId = persistedId || (id && id !== 'new' ? id : null);
                          if (!targetId) {
                            const saved = await api.createArticle({
                              title,
                              slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                              excerpt: excerpt || title,
                              contentHtml: contentHtml || '<p>Draft</p>',
                              categoryId,
                              status: 'draft',
                            });
                            targetId = saved.id;
                            setPersistedId(saved.id);
                            navigate(`/admin/articles/${saved.id}`, { replace: true });
                          }

                          const res = await api.createAutomationJob({
                            articleId: targetId!,
                            prompt: customImagePrompt || getDynamicThumbnailPrompt(),
                            autoPublishOnComplete: true,
                          });

                          if (res?.job?.id) {
                            setActiveAgentJobId(res.job.id);
                          }

                          setAgentNotice(
                            res.dispatchedWebhook
                              ? 'Dispatched to Local AI Agent via Webhook! Generating 16:9 featured image in ChatGPT... It will auto-refresh and display here as soon as ready.'
                              : 'Queued for Local AI Agent polling! When your laptop agent connects, it will generate the 16:9 image.'
                          );
                          setPollingAgentImage(true);
                        } catch (err: any) {
                          alert(`Could not queue agent job: ${err.message}`);
                        } finally {
                          setQueueingAgent(false);
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Bot className={`w-3.5 h-3.5 ${queueingAgent || pollingAgentImage ? 'animate-spin' : ''}`} />
                      {queueingAgent ? 'Queueing Job for Agent...' : pollingAgentImage ? 'ChatGPT Generating Image... (Auto-refreshing)' : 'Generate with Local AI Agent (16:9 ChatGPT)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPromptModal(true)}
                      title="Preview full dynamic 16:9 thumbnail prompt"
                      aria-label="View actual thumbnail prompt"
                      className="p-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-600 transition-colors shadow-2xs flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={generatingImage}
                    onClick={async () => {
                      if (!title) {
                        alert('Please enter an article headline first.');
                        return;
                      }
                      setGeneratingImage(true);
                      setGeneratedImagePath(null);
                      try {
                        const targetId = persistedId || (id && id !== 'new' ? id : undefined);
                        const catName = categories.find((c) => c.id === categoryId)?.name;
                        const promptToSend = customImagePrompt || getDynamicThumbnailPrompt();
                        const res = await api.generateFeaturedImage({
                          title,
                          topic: excerpt || title,
                          category: catName,
                          content: contentHtml,
                          provider: aiImageEngine,
                          modelId: aiImageEngine === 'gemini' ? geminiImageModel : undefined,
                          customPrompt: promptToSend,
                          articleId: targetId,
                        });

                        setFeaturedImage(res.imageUrl);
                        setFeaturedImageAlt(res.altText || title);
                        setGeneratedImagePath(res.imageUrl);

                        // If article is already saved in DB, automatically update its featured image
                        if (targetId) {
                          api.updateArticle(targetId, {
                            featuredImage: res.imageUrl,
                            featuredImageAlt: res.altText || title,
                          }).catch(() => {});
                        }
                      } catch (err: any) {
                        alert(`Image Generation Failed: ${err.message}`);
                      } finally {
                        setGeneratingImage(false);
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    {generatingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Visual with {aiImageEngine.toUpperCase()}...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          Generate 16:9 Image ({aiImageEngine === 'codex' ? 'Codex CLI' : aiImageEngine === 'agy' ? 'Antigravity agy' : `Gemini - ${geminiImageModel}`})
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* Article Editor Thumbnail Prompt Modal */}
                {showPromptModal && (
                  <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="article-prompt-modal-title"
                  >
                    <div className="bg-white max-w-2xl w-full p-6 space-y-4 rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                            <Eye className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 id="article-prompt-modal-title" className="font-bold text-sm text-slate-900">
                              Actual Thumbnail Generation Prompt
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Full actual prompt dispatched to AI visual synthesis engine.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPromptModal(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          aria-label="Close modal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>16:9 Aspect Ratio • 1920x1080 • Editorial Cover</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live Prompt
                          </span>
                        </div>
                        <textarea
                          readOnly
                          value={customImagePrompt || getDynamicThumbnailPrompt()}
                          rows={12}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          Dynamically updates with current article title, excerpt, and content.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPromptModal(false)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(customImagePrompt || getDynamicThumbnailPrompt());
                              setPromptCopied(true);
                              setTimeout(() => setPromptCopied(false), 2000);
                            }}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            {promptCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            {promptCopied ? 'Prompt Copied!' : 'Copy Prompt'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Option 2: Upload File From Local Computer */}
            {imageOption === 'upload' && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-gray-500 leading-snug">
                  Choose an image file from your computer (JPEG, PNG, WebP) to use as the 16:9 featured cover.
                </p>
                <label className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                  <Upload className={`w-6 h-6 text-emerald-600 mb-1.5 ${uploadingImage ? 'animate-bounce' : ''}`} />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {uploadingImage ? 'Uploading Image to Server...' : 'Click or Drag to Upload Image'}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, or WebP up to 15MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const res = await api.uploadFeaturedImageFile(file);
                        setFeaturedImage(res.publicUrl);
                        setFeaturedImageAlt(title || file.name);
                      } catch (err: any) {
                        alert(`Upload failed: ${err.message}`);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Option 3: External Image URL */}
            {imageOption === 'url' && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-gray-500 leading-snug">
                  Paste a direct external web URL for the cover image:
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /uploads/..."
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Search Console Preview
            </h3>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-xs">
              <div className="text-[11px] text-gray-500">blogs.dailybuild.tech &gt; article &gt; {slug || 'slug'}</div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
                {metaTitle || title || 'Article Title'}
              </div>
              <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5 font-serif">
                {metaDescription || excerpt || 'Search engine preview snippet description...'}
              </div>
            </div>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="Meta Title"
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border rounded"
            />
            <textarea
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Meta Description"
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border rounded"
            />
          </div>

          {/* Revisions History Log */}
          {revisions.length > 0 && (
            <div className="bg-white dark:bg-[#0f172a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <History className="w-4 h-4 text-gray-400" /> Revisions ({revisions.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {revisions.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800/60 rounded">
                    <div>
                      <span className="font-bold">v{rev.revisionNumber}</span>: {rev.changeSummary || 'Update'}
                      <div className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleString()}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreRevision(rev)}
                      className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                      title="Restore this revision"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Title Suggestions Modal */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Headline Generator</h3>
                  <p className="text-[11px] text-slate-500">
                    Generates 3–4 editorial headlines derived from blog training voice and RSS sources.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTitleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Provider</label>
                <select
                  value={titleProvider}
                  onChange={(e) => setTitleProvider(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs"
                >
                  {aiProviders.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Model</label>
                {titleProvider === 'antigravity' || titleProvider === 'codex' ? (
                  <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 italic rounded-lg text-xs">
                    Automatic Selection
                  </div>
                ) : (
                  <select
                    value={titleModel}
                    onChange={(e) => setTitleModel(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs"
                  >
                    {(() => {
                      const prov = aiProviders.find((p) => p.slug === titleProvider);
                      const mList = (prov?.models || []).filter((m: any) => m.isChecked !== false);
                      if (mList.length === 0) return <option value="">Default Model</option>;
                      return mList.map((m: any) => (
                        <option key={m.id || m.modelId} value={m.modelId || m.id}>
                          {m.displayName || m.modelId}
                        </option>
                      ));
                    })()}
                  </select>
                )}
              </div>
            </div>

            {/* Suggestions List */}
            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Editorial Suggestions ({titleSuggestions.length}):
              </label>
              {generatingTitles ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span>Synthesizing high-impact headlines...</span>
                </div>
              ) : titleSuggestions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Click below to generate suggestions for this article.
                </div>
              ) : (
                titleSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                    onClick={() => handleApplyTitle(suggestion)}
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {suggestion}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTitle(suggestion);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shrink-0 hover:bg-indigo-700"
                    >
                      Use Title
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleGenerateTitles}
                disabled={generatingTitles}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generatingTitles ? 'Generating...' : titleSuggestions.length > 0 ? 'Regenerate Titles' : 'Generate Titles'}
              </button>
              <button
                type="button"
                onClick={() => setShowTitleModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Content Studio / Rewriting Assistant Modal */}
      {showRewriterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Content Studio &amp; Rewriting Assistant</h3>
                  <p className="text-[11px] text-slate-500">
                    {rewriterSelectedText
                      ? `Rewriting active text selection (${rewriterSelectedText.length} chars)`
                      : 'Full-article generation, expansion, and tone restructuring'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRewriterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Editorial Writing Preset:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'professional', label: 'Professional', desc: 'Authoritative, rigorous & clear' },
                  { id: 'brief', label: 'Brief', desc: 'Crisp & executive-focused' },
                  { id: 'detailed', label: 'Detailed', desc: 'Deep architecture & code' },
                  { id: 'indepth', label: 'In-depth', desc: 'Comprehensive technical study' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRewriterPreset(preset.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      rewriterPreset === preset.id
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{preset.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider and Model selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Engine</label>
                <select
                  value={rewriterProvider}
                  onChange={(e) => setRewriterProvider(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs"
                >
                  {aiProviders.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Model</label>
                {rewriterProvider === 'antigravity' || rewriterProvider === 'codex' ? (
                  <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 italic rounded-lg text-xs">
                    Automatic Routing
                  </div>
                ) : (
                  <select
                    value={rewriterModel}
                    onChange={(e) => setRewriterModel(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs"
                  >
                    {(() => {
                      const prov = aiProviders.find((p) => p.slug === rewriterProvider);
                      const mList = (prov?.models || []).filter((m: any) => m.isChecked !== false);
                      if (mList.length === 0) return <option value="">Default Model</option>;
                      return mList.map((m: any) => (
                        <option key={m.id || m.modelId} value={m.modelId || m.id}>
                          {m.displayName || m.modelId}
                        </option>
                      ));
                    })()}
                  </select>
                )}
              </div>
            </div>

            {/* Custom Instruction Prompt */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Prompt Instructions (Optional):
              </label>
              <textarea
                rows={2}
                value={rewriterCustomPrompt}
                onChange={(e) => setRewriterCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on distributed state synchronization, add a benchmark summary, refine conclusion..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            {/* Preview of Rewritten Result */}
            {rewrittenOutput && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Generated Output Preview:
                </label>
                <div
                  className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto text-xs font-serif prose dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: rewrittenOutput }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteRewrite}
                  disabled={rewritingContent}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {rewritingContent ? 'Generating...' : rewrittenOutput ? 'Regenerate' : 'Execute Rewrite'}
                </button>
                {rewrittenOutput && (
                  <button
                    type="button"
                    onClick={handleApplyRewritten}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes to Editor
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRewriterModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
