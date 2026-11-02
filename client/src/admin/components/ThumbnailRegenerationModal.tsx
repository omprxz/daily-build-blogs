import React, { useState, useEffect } from 'react';
import { useImageGeneration } from '../../context/ImageGenerationContext.js';
import { api } from '../../services/api.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  RotateCcw,
  Bot,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
} from 'lucide-react';

interface ThumbnailRegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    slug?: string;
    featuredImage?: string | null;
    category?: { name?: string; slug?: string } | null;
  } | null;
  onGenerationStarted?: (job: any) => void;
  onArticleUpdated?: (articleId: string, newFeaturedImage?: string) => void;
}

export function buildEditorialPrompt(title: string, category: string = 'Technology'): string {
  const safeTitle = (title || 'Technology Innovation').trim();
  const safeCategory = (category || 'Technology').trim();

  return `Create a minimalist, hand-drawn editorial thumbnail for the article "${safeTitle}", in the category "${safeCategory}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;
}

export const ThumbnailRegenerationModal: React.FC<ThumbnailRegenerationModalProps> = ({
  isOpen,
  onClose,
  article,
  onGenerationStarted,
  onArticleUpdated,
}) => {
  const { startGeneration, isGenerating } = useImageGeneration();

  // Local Agent is selected by default to match ArticleEditor.tsx
  const [provider, setProvider] = useState<'agent' | 'codex' | 'agy' | 'gemini'>('agent');
  const [geminiModel, setGeminiModel] = useState<string>('imagen-3.0-generate-002');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [pollingAgent, setPollingAgent] = useState<boolean>(false);
  const [currentPreviewImage, setCurrentPreviewImage] = useState<string | null>(null);

  // Initialize or reset prompt & state whenever article changes
  useEffect(() => {
    if (article) {
      const defaultPrompt = buildEditorialPrompt(article.title, article.category?.name);
      setCustomPrompt(defaultPrompt);
      setCurrentPreviewImage(article.featuredImage || null);
      setError(null);
      setAgentNotice(null);
      setPollingAgent(false);
    }
  }, [article]);

  // Polling for article featured image when dispatched to local ChatGPT webhook agent
  useEffect(() => {
    if (!pollingAgent || !article?.id) return;

    let attempts = 0;
    const maxAttempts = 100; // 3s * 100 = 5 minutes
    const interval = setInterval(async () => {
      attempts++;
      try {
        const latest = await api.getArticle(article.id, { adminEdit: true });
        if (latest?.featuredImage && latest.featuredImage !== currentPreviewImage) {
          setCurrentPreviewImage(latest.featuredImage);
          setPollingAgent(false);
          setAgentNotice('✨ Featured 16:9 thumbnail synthesized by ChatGPT agent and applied to article!');
          onArticleUpdated?.(article.id, latest.featuredImage);
          clearInterval(interval);
        }
      } catch (e: any) {
        console.warn('Error polling article for generated image:', e?.message);
      }

      if (attempts >= maxAttempts) {
        setPollingAgent(false);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingAgent, article?.id, currentPreviewImage, onArticleUpdated]);

  if (!article) return null;

  const currentJobGenerating = isGenerating(article.id);

  const handleStart = async () => {
    setSubmitting(true);
    setError(null);
    setAgentNotice(null);

    // Option 1: Local Agent (ChatGPT Webhook / Automation queue)
    if (provider === 'agent') {
      try {
        const res = await api.createAutomationJob({
          articleId: article.id,
          prompt: customPrompt.trim(),
          autoPublishOnComplete: true,
        });

        const noticeText = res?.dispatchedWebhook
          ? 'Dispatched to Local AI Agent via Webhook! Generating 16:9 featured image in ChatGPT... Modal will auto-refresh as soon as ready.'
          : 'Queued for Local AI Agent polling! When your laptop agent connects, it will generate the 16:9 image.';

        setAgentNotice(noticeText);
        setPollingAgent(true);
        onGenerationStarted?.(res?.job);
      } catch (err: any) {
        setError(err.message || 'Failed to dispatch job to local AI agent');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Option 2: Codex CLI, Antigravity, or Gemini
    try {
      const job = await startGeneration({
        articleId: article.id,
        provider,
        modelId: provider === 'gemini' ? geminiModel : undefined,
        customPrompt: customPrompt.trim(),
      });
      onGenerationStarted?.(job);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger image generation');
      setSubmitting(false);
    }
  };

  const handleResetPrompt = () => {
    setCustomPrompt(buildEditorialPrompt(article.title, article.category?.name));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onClose={onClose}
        className="max-w-xl bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-5 sm:p-6"
      >
        <DialogHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Regenerate Article Thumbnail
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                Synthesize custom 16:9 editorial visual for "{article.title}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 mb-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {agentNotice && (
          <div className="p-3 mb-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{agentNotice}</div>
          </div>
        )}

        {(currentJobGenerating || pollingAgent) && (
          <div className="p-3 mb-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
              <span>
                {pollingAgent
                  ? 'Local ChatGPT Agent is generating 16:9 image. Auto-polling article status...'
                  : 'An image generation is already running for this article in the background.'}
              </span>
            </div>
            <Badge variant="purple" size="sm">
              Running
            </Badge>
          </div>
        )}

        <div className="space-y-4">
          {/* Target Article Snippet & Current Visual */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/[0.06] text-xs flex items-start gap-3">
            {currentPreviewImage ? (
              <img
                src={currentPreviewImage}
                alt={article.title}
                className="w-16 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shrink-0"
              />
            ) : (
              <div className="w-16 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0 text-slate-400">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Headline
              </div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                {article.title}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="font-medium text-primary">{article.category?.name || 'Technology'}</span>
                <span>•</span>
                <span className="font-mono text-[10px] truncate">/article/{article.slug || article.id}</span>
              </div>
            </div>
          </div>

          {/* Model / Provider Engine Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                AI Generation Engine
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                {provider === 'agent' && 'Local Laptop Agent (ChatGPT Webhook)'}
                {provider === 'codex' && 'OpenAI Codex CLI (Direct Prompt)'}
                {provider === 'agy' && 'Google Antigravity CLI (agy)'}
                {provider === 'gemini' && 'Google Gemini (Imagen & Flash)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProvider('agent')}
                className={`py-2 px-2 rounded-lg transition-all text-center truncate ${
                  provider === 'agent'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Local Agent
              </button>
              <button
                type="button"
                onClick={() => setProvider('codex')}
                className={`py-2 px-2 rounded-lg transition-all text-center truncate ${
                  provider === 'codex'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Codex CLI
              </button>
              <button
                type="button"
                onClick={() => setProvider('agy')}
                className={`py-2 px-2 rounded-lg transition-all text-center truncate ${
                  provider === 'agy'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Antigravity
              </button>
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`py-2 px-2 rounded-lg transition-all text-center truncate ${
                  provider === 'gemini'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Gemini
              </button>
            </div>
          </div>

          {/* Engine Explanation / Variant Selection */}
          {provider === 'agent' && (
            <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-xl text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-[11px]">Local AI Agent Webhook Queue</div>
                <p className="text-[11px] text-sky-700/90 dark:text-sky-300/80 leading-relaxed">
                  Dispatches 16:9 prompt to your connected local agent (ChatGPT/MCP or polling daemon).
                  Generated visual will be auto-applied and watermarked with Daily Build.
                </p>
              </div>
            </div>
          )}

          {provider === 'gemini' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Gemini Model Variant</span>
                <span className="text-[10px] text-primary font-normal">Imagen & Flash Models</span>
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
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

          {/* Editable Prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                16:9 Thumbnail Prompt
              </label>
              <button
                type="button"
                onClick={handleResetPrompt}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Editorial Formula</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Refine visual prompt..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <DialogFooter className="mt-5 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleStart}
            loading={submitting || pollingAgent}
            loadingText={
              provider === 'agent'
                ? submitting
                  ? 'Queueing Job for Agent...'
                  : 'ChatGPT Generating Image...'
                : 'Queueing Generation...'
            }
            icon={
              provider === 'agent' ? (
                <Bot className={`w-3.5 h-3.5 ${submitting || pollingAgent ? 'animate-spin' : ''}`} />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )
            }
          >
            {provider === 'agent'
              ? pollingAgent
                ? 'Generating in ChatGPT (Auto-refreshing)...'
                : 'Generate with Local AI Agent (16:9 ChatGPT)'
              : currentJobGenerating
              ? 'Restart Generation'
              : 'Generate Visual'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
