import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Sparkles, ArrowRight, Save, Copy, Check, Clock, RefreshCw, Image as ImageIcon, CheckCircle2, ChevronRight, FileText, Eye, X, Info, Wand2, ShieldCheck, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThumbnailPromptBuilder, PromptBuilderValues } from './components/ThumbnailPromptBuilder.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Input } from '../components/ui/input.js';
import { StatusDot } from '../components/ui/status-dot.js';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert.js';

interface RecentModelItem {
  modelId: string;
  lastUsedAt: string;
  count: number;
}

const POPULAR_AI_NEWS_TOPICS = [
  'Top Two AI Platforms: ChatGPT vs Claude — Which One Wins in 2026?',
  'OpenAI vs Google Gemini: The Battle for the Future of Search Engines',
  'Top 10 Everyday AI Tools Everyone Is Using for Work and Productivity',
  'Apple Intelligence vs ChatGPT: Which Wins for Everyday Users?',
  'The Biggest AI Breakthroughs and Tech Announcements Happening This Week',
  'How AI-Powered Coding Assistants are Changing Software Development',
];

export const AIContentStudio: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [recentModelsMap, setRecentModelsMap] = useState<Record<string, RecentModelItem[]>>({});
  const navigate = useNavigate();

  // Step 1: Topic with Persistence
  const [topic, setTopic] = useState(() => {
    try {
      const saved = localStorage.getItem('dailybuild_studio_last_topic');
      if (saved) return saved;
    } catch {}
    return 'Top Two AI Platforms: ChatGPT vs Claude — Which One Wins in 2026?';
  });

  const [suggestedTopics, setSuggestedTopics] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dailybuild_studio_suggested_topics');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return POPULAR_AI_NEWS_TOPICS;
  });

  const persistTopic = (t: string) => {
    setTopic(t);
    try {
      localStorage.setItem('dailybuild_studio_last_topic', t);
    } catch {}
  };

  const persistSuggestedTopics = (topics: string[]) => {
    setSuggestedTopics(topics);
    try {
      localStorage.setItem('dailybuild_studio_suggested_topics', JSON.stringify(topics));
    } catch {}
  };

  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [topicProvider, setTopicProvider] = useState('gemini');
  const [topicModel, setTopicModel] = useState('');
  const [rssNotice, setRssNotice] = useState<string | null>(null);

  // Step 2: Full Article Generation & Config (Default to Google Antigravity CLI)
  const [selectedProvider, setSelectedProvider] = useState('antigravity');
  const [selectedModel, setSelectedModel] = useState('antigravity-flash');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [recent16Titles, setRecent16Titles] = useState<string[]>([]);

  // Featured Image Provider & Parametric Prompt Builder
  const [imageProvider, setImageProvider] = useState('antigravity');
  const [customThumbnailPrompt, setCustomThumbnailPrompt] = useState('');
  const [thumbnailPromptMetadata, setThumbnailPromptMetadata] = useState<PromptBuilderValues | null>(null);
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);

  // Generated Result & Thumbnail
  const [result, setResult] = useState<{
    title: string;
    excerpt: string;
    content: string;
    model: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    // 1. Fetch AI Providers (only checked models active in settings)
    const loadProviders = () => {
      api.getAIProviders(true).then((list) => {
        if (Array.isArray(list)) {
          setProviders(list);

          // Check if Gemini is enabled/configured, else pick first available
          const geminiProv = list.find((p) => p.slug === 'gemini');
          if (geminiProv) {
            setTopicProvider('gemini');
            const geminiModels = (geminiProv.models || []).filter((m: any) => m.isChecked !== false);
            if (geminiModels.length > 0) {
              setTopicModel((prev) => (geminiModels.some((m: any) => (m.modelId || m.id) === prev) ? prev : (geminiModels[0].modelId || geminiModels[0].id)));
            }
          } else if (list.length > 0) {
            setTopicProvider(list[0].slug);
            const firstM = (list[0].models || []).filter((m: any) => m.isChecked !== false);
            if (firstM.length > 0) setTopicModel(firstM[0].modelId || firstM[0].id);
          }

          const agy = list.find((p) => p.slug === 'antigravity');
          const activeModels = (agy?.models || []).filter((m: any) => m.isChecked !== false);
          if (activeModels.length > 0) {
            setSelectedModel(activeModels[0].modelId);
          } else {
            const first = list[0];
            if (first) {
              setSelectedProvider(first.slug);
              const firstModels = (first.models || []).filter((m: any) => m.isChecked !== false);
              if (firstModels.length > 0) setSelectedModel(firstModels[0].modelId);
            }
          }
        }
      });
    };

    loadProviders();
    window.addEventListener('focus', loadProviders);

    // 2. Fetch Categories
    api.getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
        setSelectedCategory(cats[0].id);
      }
    });

    // 3. Fetch Last 7 Days Models Used
    api.getRecentAIModels().then((recents) => {
      if (recents && typeof recents === 'object') {
        setRecentModelsMap(recents);
      }
    });

    // 4. Fetch Recent 16 Article Titles to strictly exclude duplicate topics
    api.getRecentArticleTitles().then((titles) => {
      if (Array.isArray(titles)) {
        setRecent16Titles(titles);
      }
    }).catch(() => {});

    return () => window.removeEventListener('focus', loadProviders);
  }, []);

  // Ensure topicModel always stays synchronized with enabled models for the active topicProvider
  useEffect(() => {
    const p = providers.find((prov) => prov.slug === topicProvider);
    const mList = (p?.models || []).filter((m: any) => m.isChecked !== false);
    if (mList.length > 0 && !mList.some((m: any) => (m.modelId || m.id) === topicModel)) {
      setTopicModel(mList[0].modelId || mList[0].id);
    }
  }, [providers, topicProvider, topicModel]);

  const activeProvider = providers.find((p) => p.slug === selectedProvider);
  const availableModels = (activeProvider?.models || []).filter((m: any) => m.isChecked !== false);
  const recentModelsForProvider = recentModelsMap[selectedProvider] || [];

  const handleProviderChange = async (slug: string) => {
    setSelectedProvider(slug);
    try {
      const res = await api.getProviderModels(slug, false, true);
      const fetched = res?.models || [];
      if (fetched.length > 0) {
        setSelectedModel(fetched[0].modelId || fetched[0].id);
        // Update local providers state with newly fetched models
        setProviders((prev) =>
          prev.map((p) => (p.slug === slug ? { ...p, models: fetched } : p))
        );
        return;
      }
    } catch {
      // Fallback to locally known models
    }

    const p = providers.find((prov) => prov.slug === slug);
    const pModels = (p?.models || []).filter((m: any) => m.isChecked !== false);
    const recents = (recentModelsMap[slug] || []).filter((r: any) =>
      pModels.some((m: any) => m.modelId === r.modelId)
    );

    if (recents.length > 0) {
      setSelectedModel(recents[0].modelId);
    } else if (pModels.length > 0) {
      setSelectedModel(pModels[0].modelId);
    } else {
      setSelectedModel('');
    }
  };

  // Step 1 Helper: Generate 5 Fresh Popular Topics based on RSS feeds (or stale ones if 0 new)
  const handleSuggestTopics = async () => {
    setGeneratingTopics(true);
    setRssNotice(null);
    try {
      const res = await api.suggestTopicsFromRss({
        provider: topicProvider,
        model: topicModel || undefined,
        count: 5,
        excludedRecentTitles: recent16Titles,
      });

      if (res.topics && res.topics.length > 0) {
        persistSuggestedTopics(res.topics);
        persistTopic(res.topics[0]);
        if (res.usedStale) {
          setRssNotice(`Generated from ${res.storiesCount || 'archive'} RSS stories (0 new active stories, used existing archive; ${recent16Titles.length} recent topics excluded).`);
        } else {
          setRssNotice(`Generated from ${res.storiesCount} fresh live RSS stories (${recent16Titles.length} recent topics excluded).`);
        }
      } else {
        // Fallback to standard prompt if no items found with strict exclusion of recent 16 article titles
        const exclusionPrompt = recent16Titles.length > 0
          ? `\n\nCRITICAL EXCLUSION RULE (MANDATORY): Under NO circumstances suggest topics or headlines duplicating or closely relating to any of these ${recent16Titles.length} recently published articles:\n${recent16Titles.map((t, i) => `${i + 1}. "${t}"`).join('\n')}\nYou MUST ONLY suggest completely fresh, distinct, and unique topics other than these existing ones.`
          : '';

        const fallbackRes = await api.generateAIContent({
          taskType: 'summary',
          prompt: `Suggest 5 trending, popular, highly engaging technology and AI news article headlines for a modern digital publication. Focus on popular platforms (e.g. ChatGPT, Claude, Gemini, Apple Intelligence, everyday AI tools, top tech comparisons).${exclusionPrompt} Return each topic on a new line, nothing else.`,
          systemInstruction: 'You are an editorial director for a top tech news publication. Output only a list of 5 catchy, high-interest headlines, one per line. Strictly avoid any topic matching the excluded recent articles list.',
          provider: topicProvider,
          model: topicModel || undefined,
        });

        const lines = fallbackRes.content
          .split('\n')
          .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter((l: string) => l.length > 10);

        if (lines.length > 0) {
          persistSuggestedTopics(lines);
          persistTopic(lines[0]);
        }
      }
    } catch (err: any) {
      alert(`Could not generate topics: ${err.message}`);
    } finally {
      setGeneratingTopics(false);
    }
  };

  // Step 2: Generate the Complete Article and Data
  const handleGenerateWholeArticle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      alert('Please enter or select a topic first.');
      return;
    }

    // Check against recent 16 article titles
    const isRecentDuplicate = recent16Titles.some((t) => {
      const a = t.toLowerCase().replace(/[^a-z0-9]/g, '');
      const b = topic.toLowerCase().replace(/[^a-z0-9]/g, '');
      return a === b || (a.length > 15 && b.length > 15 && (a.includes(b) || b.includes(a)));
    });

    if (isRecentDuplicate) {
      if (!confirm(`Warning: "${topic}" closely matches one of the 16 most recently generated articles. Do you still want to generate this article?`)) {
        return;
      }
    }

    setGeneratingArticle(true);
    setResult(null);
    setThumbnailUrl(null);
    setSavedArticleId(null);

    const fullArticlePrompt = `Write an authoritative, highly detailed, and beautifully organized full-length technical article about: "${topic}".
Target audience: Developers, architects, engineering leaders, and technology professionals.

Structure & Required Sections:
1. First line MUST strictly be: [EXCERPT]: A compelling 2-sentence summary of the article.
2. Structure the body using clean, semantic HTML:
   - <h2>Executive Summary & Problem Context</h2>: Outline the technological paradigm shift, current state, and fundamental motivation.
   - <h2>Technical Architecture & Core Mechanisms</h2>: Detailed technical breakdown of how it works under the hood, key algorithms, protocols, or infrastructure components.
   - <h2>Real-World Practical Applications & Examples</h2>: Concrete implementation scenarios and architecture patterns. Keep code blocks to an absolute minimum, emphasizing architectural explanation, practical workflows, and real-world mechanisms over lengthy code snippets.
   - <h2>Comparative Evaluation & Benchmark Analysis</h2>: Direct comparison with existing paradigms, architectural trade-offs, and design compromises.
   - <h2>Known Limitations, Scalability & Security Trade-Offs</h2>: Honest, critical examination of bottlenecks, edge-case failures, cost considerations, and operational overhead.
   - <h2>Strategic Outlook & Editorial Conclusion</h2>: Clear forward-looking trajectory and key takeaways for engineering teams.
3. Tone & Code Blocks Policy: High-signal, informative, precise, authoritative, zero promotional fluff or filler. Significantly decrease code blocks—focus on deep analytical prose, mechanisms, and architectural tradeoffs, using code blocks (<pre><code>) only sparingly when strictly essential.`;

    try {
      const res = await api.generateAIContent({
        taskType: 'article',
        prompt: fullArticlePrompt,
        provider: selectedProvider,
        model: selectedModel || undefined,
        systemInstruction: 'You are a Principal Systems Architect and Lead Technology Editor for DailyBuild Tech. You write authoritative, rigorous, and beautifully formatted technical journalism.',
      });

      // Extract excerpt if formatted
      let excerpt = `${topic} — Comprehensive analysis of the top platforms and latest tech developments.`;
      let content = res.content || '';

      const excerptMatch = content.match(/\[EXCERPT\]:\s*([^\n]+)/i);
      if (excerptMatch) {
        excerpt = excerptMatch[1].trim();
        content = content.replace(/\[EXCERPT\]:\s*[^\n]+\n*/i, '').trim();
      }

      setResult({
        title: topic.trim(),
        excerpt,
        content,
        model: res.model,
        durationMs: res.durationMs,
        inputTokens: res.inputTokens,
        outputTokens: res.outputTokens,
        estimatedCostUsd: res.estimatedCostUsd,
      });

      // Record model usage in 7-day tracking
      if (selectedModel) {
        api.recordModelUsage(selectedProvider, selectedModel, 'article').catch(() => {});
      }
    } catch (err: any) {
      alert(`Article generation failed: ${err.message}`);
    } finally {
      setGeneratingArticle(false);
    }
  };

  // Action: Save Draft and Open Article Page
  const handleSaveAndOpenArticle = async () => {
    if (!result || savingDraft) return;
    setSavingDraft(true);
    try {
      const targetCat = selectedCategory || categories[0]?.id;
      if (savedArticleId) {
        // If already saved, update the existing draft instead of creating a second duplicate article
        await api.updateArticle(savedArticleId, {
          title: result.title,
          excerpt: result.excerpt,
          contentHtml: result.content,
          categoryId: targetCat,
          featuredImage: thumbnailUrl || undefined,
        });
        navigate(`/admin/articles/${savedArticleId}`);
        return;
      }

      const created = await api.createArticle({
        title: result.title,
        excerpt: result.excerpt,
        contentHtml: result.content,
        categoryId: targetCat,
        featuredImage: thumbnailUrl || undefined,
        status: 'draft',
        aiMetadata: {
          provider: selectedProvider,
          model: selectedModel,
          imageProvider,
          thumbnailPrompt: customThumbnailPrompt,
          thumbnailMetadata: thumbnailPromptMetadata,
        },
      });
      setSavedArticleId(created.id);
      navigate(`/admin/articles/${created.id}`);
    } catch (err: any) {
      alert(`Error saving draft: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  // Action: Generate Thumbnail with selected Image Provider and Parametric Prompt
  const handleGenerateThumbnail = async () => {
    if (!result) return;

    setGeneratingThumbnail(true);
    try {
      const catName = categories.find((c) => c.id === selectedCategory)?.name || 'AI & Technology';
      const promptToUse = customThumbnailPrompt || getActualThumbnailPrompt();

      const imgRes = await api.generateFeaturedImage({
        title: result.title,
        topic: result.excerpt,
        category: catName,
        content: result.content,
        provider: imageProvider,
        customPrompt: promptToUse,
        articleId: savedArticleId || undefined,
      });
      setThumbnailUrl(imgRes.imageUrl);

      // If draft was already created, update its featuredImage directly
      if (savedArticleId) {
        api.updateArticle(savedArticleId, { featuredImage: imgRes.imageUrl }).catch(() => {});
      }
    } catch (err: any) {
      alert(`Thumbnail generation error: ${err.message}`);
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const getActualThumbnailPrompt = () => {
    const titleText = result?.title || topic.trim() || 'Modern Technology Breakdown';
    const catName = categories.find((c) => c.id === selectedCategory)?.name || 'Technology';

    return `Create a minimalist, hand-drawn editorial thumbnail for the article "${titleText}", in the category "${catName}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;
  };

  const handleCopyPrompt = () => {
    const promptText = getActualThumbnailPrompt();
    navigator.clipboard.writeText(promptText);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleCopyHtml = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> AI Content Studio
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Generation Pipeline
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            2-step editorial workflow: Formulate topic from RSS / trends, then generate complete article & 16:9 visual cover.
          </p>
        </div>
      </div>

      {/* STEP 1: GENERATE OR SELECT A TOPIC */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
                  1
                </span>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Generate or Choose a Topic
                </CardTitle>
              </div>
              <CardDescription>
                Select an AI & tech news headline or formulate from fresh RSS sources.
              </CardDescription>
            </div>

            {/* Dedicated Topic Controls Toolbar */}
            <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Provider:</label>
                <select
                  value={topicProvider}
                  onChange={(e) => {
                    const pSlug = e.target.value;
                    setTopicProvider(pSlug);
                    const p = providers.find((prov) => prov.slug === pSlug);
                    const mList = (p?.models || []).filter((m: any) => m.isChecked !== false);
                    if (mList.length > 0) {
                      setTopicModel(mList[0].modelId || mList[0].id);
                    } else {
                      setTopicModel('');
                    }
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[120px] truncate"
                >
                  {providers.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Model:</label>
                <select
                  value={topicModel}
                  onChange={(e) => setTopicModel(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer max-w-[160px] truncate font-mono"
                >
                  {(() => {
                    const p = providers.find((prov) => prov.slug === topicProvider);
                    const mList = (p?.models || []).filter((m: any) => m.isChecked !== false);
                    if (mList.length === 0) {
                      return <option value={topicModel}>{topicModel || 'No models enabled'}</option>;
                    }
                    return mList.map((m: any) => (
                      <option key={m.modelId || m.id} value={m.modelId || m.id}>
                        {m.displayName || m.name || m.modelId || m.id}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={generatingTopics}
                onClick={handleSuggestTopics}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingTopics ? 'animate-spin text-primary' : ''}`} />
                {generatingTopics ? 'Formulating...' : 'Suggest Topics'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* RSS Intelligence Notice */}
          {rssNotice && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Radio className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{rssNotice}</span>
            </div>
          )}

          {/* 16 Recent Topics Exclusion Indicator */}
          {recent16Titles.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Auto-Exclusion Active: {recent16Titles.length} most recent published articles are excluded from suggestions to ensure non-duplicate topics.</span>
            </div>
          )}

          {/* Popular Topic Ideas (Pills) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Suggested Headlines:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg text-left transition-all font-medium border ${
                    topic === t
                      ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Input Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Active Headline
            </label>
            <Input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. ChatGPT vs Claude: Top Two AI Platforms Compared in 2026"
            />
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: GENERATE THE WHOLE ARTICLE, CONTENT & DATA */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="w-5 h-5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] flex items-center justify-center">
            2
          </span>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Generate Article &amp; Structure
            </h2>
            <p className="text-[11px] text-slate-500">
              Synthesizes formatted HTML, executive summary, taxonomy, and technical depth.
            </p>
          </div>
        </div>

        {/* Model, Provider & Image Engine Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-semibold text-slate-500">Text Provider</label>
              {selectedProvider === 'antigravity' && (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> agy -p
                </span>
              )}
              {selectedProvider === 'codex' && (
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> codex sandbox
                </span>
              )}
            </div>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name} {p.isFreeTierAvailable ? '(Free Tier)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Text Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200"
            >
              {availableModels.length > 0 ? (
                availableModels.map((m: any) => (
                  <option key={m.id} value={m.modelId}>
                    {m.displayName || m.modelId}
                  </option>
                ))
              ) : (
                <option value={selectedModel || 'default'}>{selectedModel || 'Default Model'}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Featured Cover Engine</label>
            <select
              value={imageProvider}
              onChange={(e) => setImageProvider(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-primary"
            >
              <option value="antigravity">Google Antigravity CLI (agy)</option>
              <option value="codex">OpenAI Codex CLI</option>
              <option value="headless-chatgpt">Local AI Agent (ChatGPT)</option>
              <option value="gemini">Google Gemini Imagen</option>
            </select>
          </div>
        </div>

        {/* Last 7 Days Models Pills */}
        {recentModelsForProvider.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block mb-1 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-primary" /> Recent:
            </span>
            <div className="flex flex-wrap gap-1">
              {recentModelsForProvider.slice(0, 4).map((rm) => (
                <button
                  key={rm.modelId}
                  type="button"
                  onClick={() => setSelectedModel(rm.modelId)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                    selectedModel === rm.modelId
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {rm.modelId}
                  {rm.count > 1 && <span className="ml-1 opacity-75 text-[9px]">({rm.count}x)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate Article CTA Button */}
        <button
          type="button"
          disabled={generatingArticle}
          onClick={handleGenerateWholeArticle}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <Sparkles className={`w-3.5 h-3.5 ${generatingArticle ? 'animate-spin' : ''}`} />
          {generatingArticle
            ? 'Generating Full Article & Data...'
            : 'Generate Complete Article & Data'}
        </button>
      </div>

      {/* RESULT & ACTIONS: OPEN ARTICLE / GENERATE THUMBNAIL */}
      {result && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" /> Generated Successfully
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {result.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{result.excerpt}</p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>{result.durationMs}ms</span>
              <span>•</span>
              <span>{result.outputTokens} tokens</span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">${result.estimatedCostUsd}</span>
            </div>
          </div>

          {/* Action Row: Open Article, Generate Thumbnail, and Tune Prompt */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleSaveAndOpenArticle}
              className="py-1.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs transition-colors"
            >
              <FileText className="w-3 h-3" /> Save &amp; Open Article
            </button>

            <button
              type="button"
              onClick={() => setShowPromptBuilder(!showPromptBuilder)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap border ${
                showPromptBuilder
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Wand2 className="w-3 h-3 text-primary" />
              {showPromptBuilder ? 'Hide Prompt Builder' : 'Tune 16:9 Prompt'}
              {showPromptBuilder ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 shadow-2xs shrink-0">
              <button
                type="button"
                disabled={generatingThumbnail}
                onClick={handleGenerateThumbnail}
                className="py-1.5 px-3 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <ImageIcon className="w-3 h-3" />
                {generatingThumbnail ? 'Generating...' : 'Generate 16:9 Cover'}
              </button>
              <button
                type="button"
                onClick={() => setShowPromptModal(true)}
                title="Preview full dynamic thumbnail prompt"
                aria-label="View actual thumbnail prompt"
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-primary border-l border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyHtml}
              className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap ml-auto sm:ml-0 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'HTML Copied' : 'Copy HTML'}
            </button>
          </div>

          {/* Embedded Dedicated Thumbnail Prompt Builder Panel */}
          {showPromptBuilder && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-primary/20 shadow-xs animate-in fade-in duration-200">
              <ThumbnailPromptBuilder
                initialTopic={result.title}
                initialCategory={categories.find((c) => c.id === selectedCategory)?.name || 'AI & LLMs'}
                onPromptChange={(prompt, meta) => {
                  setCustomThumbnailPrompt(prompt);
                  setThumbnailPromptMetadata(meta);
                }}
              />
            </div>
          )}

          {/* Thumbnail Prompt Preview Modal */}
          {showPromptModal && (
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="prompt-modal-title"
            >
              <div className="bg-white max-w-2xl w-full p-6 space-y-4 rounded-2xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 id="prompt-modal-title" className="font-bold text-sm text-slate-900">
                        Actual Thumbnail Generation Prompt
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Dynamic context composed with current headline, category, excerpt &amp; 16:9 specs.
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
                    value={getActualThumbnailPrompt()}
                    rows={12}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    Includes unsaved article headline and editorial adjustments.
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
                      onClick={handleCopyPrompt}
                      className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      {promptCopied ? <Check className="w-3.5 h-3.5 text-primary-foreground" /> : <Copy className="w-3.5 h-3.5" />}
                      {promptCopied ? 'Prompt Copied!' : 'Copy Prompt'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thumbnail Preview if Generated */}
          {thumbnailUrl && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" /> Generated Thumbnail Preview:
              </span>
              <div className="max-w-md overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-slate-950/20">
                <img src={thumbnailUrl} alt="Article Thumbnail" className="w-full h-44 object-contain" />
              </div>
              <p className="text-[11px] text-gray-400">
                Thumbnail is ready and will be attached automatically when opening the article draft.
              </p>
            </div>
          )}

          {/* Formatted Article Preview */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
              Formatted Article Content:
            </span>
            <div className="prose dark:prose-invert max-w-none text-xs font-mono whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-5 rounded-xl overflow-x-auto max-h-[500px] border border-gray-200 dark:border-gray-800">
              {result.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
