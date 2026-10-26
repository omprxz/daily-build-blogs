import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import {
  Bot,
  Key,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Zap,
  FileText,
  Image as ImageIcon,
  Video,
  Code,
  Filter,
  Send,
  Terminal,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { StatusDot } from '@/components/ui/status-dot.js';

export type ModelCategory = 'all' | 'text' | 'image' | 'video' | 'code';

export function getModelCategory(model: any): 'text' | 'image' | 'video' | 'code' {
  const id = (model.modelId || model.id || '').toLowerCase();
  const name = (model.displayName || model.name || '').toLowerCase();
  const caps = Array.isArray(model.capabilities) ? model.capabilities : [];

  if (
    caps.includes('video_generation') ||
    id.includes('veo') ||
    id.includes('sora') ||
    id.includes('runway') ||
    id.includes('video') ||
    name.includes('video')
  ) {
    return 'video';
  }
  if (
    caps.includes('image_generation') ||
    id.includes('imagen') ||
    id.includes('dall-e') ||
    id.includes('diffusion') ||
    id.includes('flux') ||
    id.includes('image') ||
    name.includes('image')
  ) {
    return 'image';
  }
  if (id.includes('coder') || id.includes('code') || name.includes('code')) {
    return 'code';
  }
  return 'text';
}

export const AIProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingSlug, setTestingSlug] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [recentModelsMap, setRecentModelsMap] = useState<Record<string, any[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');
  
  // Collapsible UI state per provider slug
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  // Search filter query per provider slug
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // Add Custom Model State
  const [addingModelSlug, setAddingModelSlug] = useState<string | null>(null);
  const [customModelId, setCustomModelId] = useState<string>('');
  const [customModelDisplayName, setCustomModelDisplayName] = useState<string>('');
  const [customModelCategory, setCustomModelCategory] = useState<ModelCategory>('text');
  const [customModelContext, setCustomModelContext] = useState<string>('128000');
  const [isSubmittingCustomModel, setIsSubmittingCustomModel] = useState<boolean>(false);
  const [deletingModelKey, setDeletingModelKey] = useState<string | null>(null);
  
  // Macro Testing Workbench State
  const [testProvider, setTestProvider] = useState<string>('antigravity');
  const [testModel, setTestModel] = useState<string>('');
  const [testQuestion, setTestQuestion] = useState<string>('what is the capital of india?');
  const [testingResponse, setTestingResponse] = useState<boolean>(false);
  const [testResponseOutput, setTestResponseOutput] = useState<{
    text: string;
    model: string;
    durationMs: number;
    tokens?: number;
    isError?: boolean;
  } | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    setLoading(true);
    Promise.all([api.getAIProviders(), api.getRecentAIModels()])
      .then(([data, recents]) => {
        if (Array.isArray(data)) {
          setProviders(data);
          const urls: Record<string, string> = {};
          data.forEach((p) => {
            if (p.baseUrl) urls[p.slug] = p.baseUrl;
          });
          setBaseUrls(urls);

          // Initialize test model
          const currentP = data.find((p) => p.slug === testProvider) || data[0];
          if (currentP && currentP.models && currentP.models.length > 0) {
            setTestModel(currentP.models[0].modelId || currentP.models[0].id);
          }
        }
        if (recents && typeof recents === 'object') {
          setRecentModelsMap(recents);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleExecuteMacroTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testQuestion.trim()) return;

    setTestingResponse(true);
    setTestResponseOutput(null);
    const start = Date.now();

    try {
      const res = await api.generateAIContent({
        prompt: testQuestion.trim(),
        provider: testProvider,
        model: testModel || undefined,
        taskType: 'summary',
        systemInstruction: 'Answer concisely, accurately, and directly.',
      });

      setTestResponseOutput({
        text: res.content || '',
        model: res.model || testModel || 'default',
        durationMs: res.durationMs || Date.now() - start,
        tokens: res.outputTokens,
        isError: false,
      });
    } catch (err: any) {
      setTestResponseOutput({
        text: err.message || 'Model test execution failed.',
        model: testModel || testProvider,
        durationMs: Date.now() - start,
        isError: true,
      });
    } finally {
      setTestingResponse(false);
    }
  };

  const handleTestConnection = async (slug: string) => {
    setTestingSlug(slug);
    setTestResults((prev) => ({ ...prev, [slug]: null }));

    try {
      const res = await api.testAndDiscoverModels(slug, {
        apiKey: apiKeys[slug],
        baseUrl: baseUrls[slug],
      });
      setTestResults((prev) => ({ ...prev, [slug]: res }));
      if (res.success) {
        loadProviders();
        setExpandedProviders((prev) => ({ ...prev, [slug]: true }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [slug]: { success: false, message: err.message, models: [] },
      }));
    } finally {
      setTestingSlug(null);
    }
  };

  const handleSave = async (slug: string, isEnabled?: boolean) => {
    setSavingSlug(slug);
    try {
      const prov = providers.find((p) => p.slug === slug);
      await api.updateAIProvider(slug, {
        apiKey: apiKeys[slug] !== undefined ? apiKeys[slug] : undefined,
        baseUrl: baseUrls[slug],
        isEnabled: isEnabled !== undefined ? isEnabled : prov?.isEnabled,
      });
      alert(`Provider ${prov?.name} saved successfully.`);
      loadProviders();
    } catch (err: any) {
      alert(`Error saving provider: ${err.message}`);
    } finally {
      setSavingSlug(null);
    }
  };

  const handleToggleModelCheck = async (slug: string, modelId: string, isChecked: boolean) => {
    const prov = providers.find((p) => p.slug === slug);
    if (!prov) return;

    const allModelIds = (prov.models || []).map((m: any) => m.modelId);
    let currentChecked: string[] = Array.isArray(prov.settingsJson?.checkedModelIds)
      ? [...prov.settingsJson.checkedModelIds]
      : [...allModelIds];

    if (isChecked) {
      if (!currentChecked.includes(modelId)) currentChecked.push(modelId);
    } else {
      currentChecked = currentChecked.filter((id) => id !== modelId);
    }

    const updatedSettings = {
      ...(prov.settingsJson || {}),
      checkedModelIds: currentChecked,
    };

    setProviders((prev) =>
      prev.map((p) => {
        if (p.slug !== slug) return p;
        return {
          ...p,
          settingsJson: updatedSettings,
          checkedModelIds: currentChecked,
          models: (p.models || []).map((m: any) => ({
            ...m,
            isChecked: currentChecked.includes(m.modelId),
          })),
        };
      })
    );

    try {
      await api.updateAIProvider(slug, {
        settingsJson: updatedSettings,
      });
    } catch (err: any) {
      console.warn('Failed to persist model check preference:', err.message);
    }
  };

  const handleBulkCheckModels = async (slug: string, checkAll: boolean) => {
    const prov = providers.find((p) => p.slug === slug);
    if (!prov) return;

    const allModelIds = (prov.models || []).map((m: any) => m.modelId);
    const updatedChecked: string[] = checkAll ? allModelIds : [];

    const updatedSettings = {
      ...(prov.settingsJson || {}),
      checkedModelIds: updatedChecked,
    };

    setProviders((prev) =>
      prev.map((p) => {
        if (p.slug !== slug) return p;
        return {
          ...p,
          settingsJson: updatedSettings,
          checkedModelIds: updatedChecked,
          models: (p.models || []).map((m: any) => ({
            ...m,
            isChecked: checkAll,
          })),
        };
      })
    );

    try {
      await api.updateAIProvider(slug, {
        settingsJson: updatedSettings,
      });
    } catch (err: any) {
      console.warn('Failed to bulk persist model checks:', err.message);
    }
  };

  const toggleProviderExpanded = (slug: string) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const handleExpandAll = (expand: boolean) => {
    const map: Record<string, boolean> = {};
    providers.forEach((p) => {
      map[p.slug] = expand;
    });
    setExpandedProviders(map);
  };

  const handleSearchChange = (slug: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [slug]: query }));
  };

  const handleOpenAddCustomModel = (slug: string, initialId = '') => {
    setAddingModelSlug(slug);
    setCustomModelId(initialId);
    setCustomModelDisplayName(initialId ? initialId.replace(/[-_]/g, ' ') : '');
    setCustomModelCategory('text');
    setCustomModelContext('128000');
    setExpandedProviders((prev) => ({ ...prev, [slug]: true }));
  };

  const handleSubmitCustomModel = async (e: React.FormEvent, slug: string) => {
    e.preventDefault();
    if (!customModelId.trim()) return;

    setIsSubmittingCustomModel(true);
    try {
      const res = await api.addCustomAIModel(slug, {
        modelId: customModelId.trim(),
        displayName: customModelDisplayName.trim() || customModelId.trim(),
        category: customModelCategory === 'all' ? 'text' : customModelCategory,
        contextWindow: parseInt(customModelContext, 10) || 128000,
      });

      if (res.success && res.model) {
        setProviders((prev) =>
          prev.map((p) => {
            if (p.slug !== slug) return p;
            const existing = (p.models || []).filter((m: any) => m.modelId !== res.model.modelId);
            const currentChecked = Array.isArray(p.settingsJson?.checkedModelIds)
              ? [...p.settingsJson.checkedModelIds]
              : (p.models || []).map((m: any) => m.modelId);
            if (!currentChecked.includes(res.model.modelId)) {
              currentChecked.push(res.model.modelId);
            }
            return {
              ...p,
              settingsJson: { ...(p.settingsJson || {}), checkedModelIds: currentChecked },
              checkedModelIds: currentChecked,
              models: [res.model, ...existing],
            };
          })
        );

        setAddingModelSlug(null);
        setCustomModelId('');
        setCustomModelDisplayName('');
        setExpandedProviders((prev) => ({ ...prev, [slug]: true }));
      }
    } catch (err: any) {
      alert(`Failed to add custom model: ${err.message}`);
    } finally {
      setIsSubmittingCustomModel(false);
    }
  };

  const handleDeleteModel = async (slug: string, modelId: string, displayName: string) => {
    if (!window.confirm(`Are you sure you want to remove model "${displayName}" (${modelId})?`)) {
      return;
    }
    const key = `${slug}:${modelId}`;
    setDeletingModelKey(key);
    try {
      await api.deleteAIModel(slug, modelId);
      setProviders((prev) =>
        prev.map((p) => {
          if (p.slug !== slug) return p;
          const updatedModels = (p.models || []).filter((m: any) => m.modelId !== modelId);
          const currentChecked = (p.settingsJson?.checkedModelIds || []).filter((id: string) => id !== modelId);
          return {
            ...p,
            settingsJson: { ...(p.settingsJson || {}), checkedModelIds: currentChecked },
            checkedModelIds: currentChecked,
            models: updatedModels,
          };
        })
      );
    } catch (err: any) {
      alert(`Failed to delete model: ${err.message}`);
    } finally {
      setDeletingModelKey(null);
    }
  };

  // Count models by category across all providers
  const allModels = providers.flatMap((p) => p.models || []);
  const textCount = allModels.filter((m) => getModelCategory(m) === 'text').length;
  const imageCount = allModels.filter((m) => getModelCategory(m) === 'image').length;
  const videoCount = allModels.filter((m) => getModelCategory(m) === 'video').length;
  const codeCount = allModels.filter((m) => getModelCategory(m) === 'code').length;

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
            <Bot className="w-5 h-5 text-primary" /> AI Providers &amp; Model Orchestration
          </h1>
          <p className="text-[11px] text-slate-500">
            Configure host system CLIs (Codex, Antigravity agy, tgpt) and cloud API keys for Gemini, Groq, Claude, and Ollama.
          </p>
        </div>
      </div>

      {/* MACRO MODEL TESTING WORKBENCH */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Macro Model Testing Workbench
              </h2>
              <p className="text-[10px] text-slate-500">
                Test live responses from any configured provider and model on the host system.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 font-semibold">
            Interactive Test Runner
          </span>
        </div>

        <form onSubmit={handleExecuteMacroTest} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Provider Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Provider (Enabled Only)
              </label>
              <select
                value={testProvider}
                onChange={(e) => {
                  const pSlug = e.target.value;
                  setTestProvider(pSlug);
                  const prov = providers.find((p) => p.slug === pSlug);
                  if (pSlug === 'antigravity' || pSlug === 'codex') {
                    setTestModel('automatic');
                  } else {
                    const mList = (prov?.models || []).filter((m: any) => m.isChecked !== false);
                    if (mList.length > 0) {
                      setTestModel(mList[0].modelId || mList[0].id);
                    } else {
                      setTestModel('');
                    }
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(providers.filter((p) => p.isEnabled).length > 0
                  ? providers.filter((p) => p.isEnabled)
                  : providers
                ).map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} {p.isEnabled ? '✓' : '(Disabled)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selector */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Model
              </label>
              {testProvider === 'antigravity' || testProvider === 'codex' ? (
                <div className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 italic flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Automatic Model Selection (Controlled by local engine)
                </div>
              ) : (
                <select
                  value={testModel}
                  onChange={(e) => setTestModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {(() => {
                    const prov = providers.find((p) => p.slug === testProvider);
                    const mList = (prov?.models || []).filter((m: any) => m.isChecked !== false);
                    if (mList.length === 0) {
                      return <option value="">Default / First Available Model</option>;
                    }
                    return mList.map((m: any) => (
                      <option key={m.id || m.modelId} value={m.modelId || m.id}>
                        {m.displayName || m.name || m.modelId} ({m.modelId})
                      </option>
                    ));
                  })()}
                </select>
              )}
            </div>
          </div>

          {/* Question / Prompt Input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Test Prompt / Question
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                placeholder="Ask any test prompt..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={testingResponse || !testQuestion.trim()}
                className="py-1.5 px-3.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
              >
                {testingResponse ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Test Response</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Output Response Box */}
        {testResponseOutput && (
          <div
            className={`p-3 rounded-lg border text-xs space-y-1.5 ${
              testResponseOutput.isError
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="font-bold">
                {testResponseOutput.isError ? 'Execution Error' : `Model: ${testResponseOutput.model}`}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {testResponseOutput.durationMs}ms {testResponseOutput.tokens ? `• ${testResponseOutput.tokens} tokens` : ''}
              </span>
            </div>
            <div className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text">
              {testResponseOutput.text}
            </div>
          </div>
        )}
      </div>

      {/* MODEL CATEGORY TABS & GLOBAL COLLAPSE TOGGLE */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 overflow-x-auto min-w-max">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Filter className="w-3 h-3" />
            All ({allModels.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('text')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'text'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3 h-3 text-blue-500" />
            Text ({textCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('image')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'image'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3 h-3 text-emerald-500" />
            Image ({imageCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('video')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'video'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Video className="w-3 h-3 text-purple-500" />
            Video ({videoCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('code')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'code'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Code className="w-3 h-3 text-amber-500" />
            Code ({codeCount})
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 py-0.5 shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => handleExpandAll(true)}
            className="text-slate-600 dark:text-slate-400 hover:text-primary font-semibold transition-colors"
          >
            Expand All Models
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={() => handleExpandAll(false)}
            className="text-slate-600 dark:text-slate-400 hover:text-primary font-semibold transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((prov) => {
            const testResult = testResults[prov.slug];
            const isTesting = testingSlug === prov.slug;
            const isSaving = savingSlug === prov.slug;

            // Filter models by selected category & search query
            const rawModels = prov.models || [];
            const categoryModels =
              selectedCategory === 'all'
                ? rawModels
                : rawModels.filter((m: any) => getModelCategory(m) === selectedCategory);

            const query = (searchQueries[prov.slug] || '').trim().toLowerCase();
            const filteredModels = query
              ? categoryModels.filter(
                  (m: any) =>
                    (m.modelId || '').toLowerCase().includes(query) ||
                    (m.displayName || '').toLowerCase().includes(query)
                )
              : categoryModels;

            // Skip rendering provider card only if category filter is active and provider has 0 matching models
            if (selectedCategory !== 'all' && categoryModels.length === 0) {
              return null;
            }

            const isExpanded = Boolean(expandedProviders[prov.slug]);
            const activeCount = rawModels.filter((m: any) => m.isChecked !== false).length;

            return (
              <div
                key={prov.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 shadow-2xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {prov.slug === 'gemini' ? (
                        <Sparkles className="w-4 h-4" />
                      ) : prov.slug === 'groq' ? (
                        <Zap className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{prov.name}</h2>
                        {prov.slug === 'antigravity' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> agy -p CLI
                          </span>
                        )}
                        {prov.slug === 'codex' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> codex sandbox read-only
                          </span>
                        )}
                        {prov.isFreeTierAvailable && prov.slug !== 'antigravity' && prov.slug !== 'codex' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Free Tier
                          </span>
                        )}
                        {prov.slug === 'ollama' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            Self-Hosted
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{prov.rateLimitsInfo || 'Configurable generative models.'}</p>
                    </div>
                  </div>

                  {/* Enable Switch & Docs */}
                  <div className="flex items-center gap-2.5">
                    {prov.pricingDocUrl && (
                      <a
                        href={prov.pricingDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-400 hover:text-primary flex items-center gap-0.5 font-medium"
                      >
                        Pricing <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {(() => {
                      const isLocalCli = prov.slug === 'antigravity' || prov.slug === 'codex' || prov.slug === 'tgpt' || prov.slug === 'ollama';
                      const hasKeyOrLocal = isLocalCli || prov.hasApiKey || (apiKeys[prov.slug] && apiKeys[prov.slug].trim().length > 0);
                      return (
                        <label
                          className={`flex items-center gap-1.5 ${hasKeyOrLocal ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                          title={!hasKeyOrLocal ? 'Configure a valid API key to enable this provider' : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={prov.isEnabled}
                            disabled={!hasKeyOrLocal}
                            onChange={(e) => {
                              if (!hasKeyOrLocal && e.target.checked) {
                                alert('A valid API key must be configured and saved before enabling this provider.');
                                return;
                              }
                              handleSave(prov.slug, e.target.checked);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {prov.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      );
                    })()}
                  </div>
                </div>

                {/* Configuration Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* API Key or System CLI Notice */}
                  {prov.slug === 'antigravity' || prov.slug === 'codex' || prov.slug === 'tgpt' ? (
                    <div className="flex flex-col justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {prov.slug === 'antigravity'
                          ? 'Google Antigravity CLI (agy -p "prompt")'
                          : prov.slug === 'codex'
                          ? 'OpenAI Codex CLI (codex exec --sandbox read-only ...)'
                          : 'Terminal GPT (tgpt)'}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        Direct CLI binary integration on host. No manual API key required.
                      </p>
                    </div>
                  ) : prov.slug !== 'ollama' ? (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                        <Key className="w-3 h-3 text-slate-400" />
                        API Key {prov.hasApiKey && <span className="text-emerald-500 font-normal">(Encrypted)</span>}
                      </label>
                      <input
                        type="password"
                        value={apiKeys[prov.slug] !== undefined ? apiKeys[prov.slug] : ''}
                        onChange={(e) => setApiKeys({ ...apiKeys, [prov.slug]: e.target.value })}
                        placeholder={prov.hasApiKey ? '••••••••••••••••••••••••' : 'Enter API Key...'}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ) : null}

                  {/* Base URL */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" /> Base Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={baseUrls[prov.slug] !== undefined ? baseUrls[prov.slug] : prov.baseUrl || ''}
                      onChange={(e) => setBaseUrls({ ...baseUrls, [prov.slug]: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Action Buttons: Test Connection & Save */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(prov.slug)}
                    disabled={isTesting}
                    className="py-1.5 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    {isTesting ? 'Testing...' : 'Test Connection & Models'}
                  </button>

                  <button
                    onClick={() => handleSave(prov.slug)}
                    disabled={isSaving}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                {/* Test Feedback */}
                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-[11px]">{testResult.message}</div>
                      {testResult.latencyMs && (
                        <div className="text-[10px] opacity-80 mt-0.5">Roundtrip latency: {testResult.latencyMs}ms</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Categorized Models List / Automatic Banner */}
                {prov.slug === 'antigravity' || prov.slug === 'codex' ? (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold">Automatic Model Selection Active</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Model selection is governed automatically by the local {prov.name} agent engine. Manual model overrides are disabled for this integration.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    {/* Collapsible Header Accordion Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleProviderExpanded(prov.slug)}
                        className="flex-1 flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/70 dark:border-slate-700/70 group text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 group-hover:text-primary transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                            Models ({rawModels.length})
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {activeCount} active
                          </span>
                          {rawModels.some((m: any) => m.pricingNotes === 'Custom Model') && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                              Custom Models Added
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span className="hidden sm:inline">
                            {isExpanded ? 'Hide Models' : 'Expand Models & Search'}
                          </span>
                        </div>
                      </button>

                      {/* Quick Add Custom Model Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenAddCustomModel(prov.slug)}
                        className="py-2 px-3 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                        title="Add custom model identifier"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Model</span>
                      </button>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="space-y-3 pt-1">
                        {/* Search & Actions Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                          {/* Search Input */}
                          <div className="relative flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={searchQueries[prov.slug] || ''}
                              onChange={(e) => handleSearchChange(prov.slug, e.target.value)}
                              placeholder={`Search ${prov.name} models (e.g. flash, llama)...`}
                              className="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {searchQueries[prov.slug] && (
                              <button
                                type="button"
                                onClick={() => handleSearchChange(prov.slug, '')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Quick selection & count */}
                          <div className="flex items-center gap-1.5 text-[10px] normal-case flex-wrap">
                            <span className="text-slate-400 mr-1 text-[10px]">
                              Showing {filteredModels.length} of {rawModels.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleBulkCheckModels(prov.slug, true)}
                              className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/15 font-bold border border-primary/20"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkCheckModels(prov.slug, false)}
                              className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 font-medium border border-slate-200 dark:border-slate-700"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        {/* Inline Form: Add Custom Model */}
                        {addingModelSlug === prov.slug && (
                          <form
                            onSubmit={(e) => handleSubmitCustomModel(e, prov.slug)}
                            className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-2.5"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-primary/20">
                              <div className="flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  Add Custom Model to {prov.name}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAddingModelSlug(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              {/* Model ID */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Model Identifier / ID <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={customModelId}
                                  onChange={(e) => setCustomModelId(e.target.value)}
                                  placeholder="e.g. llama-3.3-70b-versatile"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>

                              {/* Display Name */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Display Name (Optional)
                                </label>
                                <input
                                  type="text"
                                  value={customModelDisplayName}
                                  onChange={(e) => setCustomModelDisplayName(e.target.value)}
                                  placeholder="e.g. Llama 3.3 70B"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>

                              {/* Category */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Model Category
                                </label>
                                <select
                                  value={customModelCategory}
                                  onChange={(e) => setCustomModelCategory(e.target.value as any)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="text">Text / Chat</option>
                                  <option value="code">Code Generation</option>
                                  <option value="image">Image Generation</option>
                                  <option value="video">Video Generation</option>
                                </select>
                              </div>

                              {/* Context Window */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Context Window (Tokens)
                                </label>
                                <input
                                  type="number"
                                  min="1000"
                                  step="1000"
                                  value={customModelContext}
                                  onChange={(e) => setCustomModelContext(e.target.value)}
                                  placeholder="128000"
                                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setAddingModelSlug(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmittingCustomModel || !customModelId.trim()}
                                className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                {isSubmittingCustomModel ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving Model...</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Save Custom Model</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Model Grid or Empty Search State */}
                        {filteredModels.length === 0 ? (
                          <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/40">
                            {query ? (
                              <>
                                <p className="text-xs text-slate-500">
                                  No models matching <span className="font-semibold text-slate-800 dark:text-slate-200">"{query}"</span> found in {prov.name}.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddCustomModel(prov.slug, query)}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 text-xs font-bold transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add "{query}" as Custom Model
                                </button>
                              </>
                            ) : rawModels.length === 0 ? (
                              <>
                                <p className="text-xs text-slate-500">
                                  No models discovered yet for {prov.name}. Click "Test Connection & Models" or add custom models manually.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddCustomModel(prov.slug)}
                                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add First Model
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500">
                                No models match the selected category filter.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {filteredModels.map((m: any) => {
                              const category = getModelCategory(m);
                              const isChecked = m.isChecked !== false;
                              const isCustom = m.pricingNotes === 'Custom Model';
                              const modelKey = `${prov.slug}:${m.modelId}`;
                              const isDeleting = deletingModelKey === modelKey;

                              return (
                                <div
                                  key={m.id || m.modelId}
                                  className={`p-2.5 rounded-lg flex flex-col justify-between space-y-1.5 border transition-all ${
                                    isChecked
                                      ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs'
                                      : 'border-slate-200/50 dark:border-slate-800/40 opacity-60 bg-slate-50/50 dark:bg-slate-900/20'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0 select-none">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => handleToggleModelCheck(prov.slug, m.modelId, e.target.checked)}
                                          className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                                        />
                                        <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate" title={m.displayName || m.modelId}>
                                          {m.displayName || m.modelId}
                                        </span>
                                      </label>

                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* Custom Badge */}
                                        {isCustom && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                            Custom
                                          </span>
                                        )}

                                        {/* Category Badge */}
                                        {category === 'text' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            Text
                                          </span>
                                        )}
                                        {category === 'image' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            Image
                                          </span>
                                        )}
                                        {category === 'video' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                            Video
                                          </span>
                                        )}
                                        {category === 'code' && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                            Code
                                          </span>
                                        )}

                                        {/* Delete Custom Model Button */}
                                        {isCustom && (
                                          <button
                                            type="button"
                                            disabled={isDeleting}
                                            onClick={() => handleDeleteModel(prov.slug, m.modelId, m.displayName || m.modelId)}
                                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors"
                                            title="Delete custom model"
                                          >
                                            {isDeleting ? (
                                              <Loader2 className="w-3 h-3 animate-spin text-rose-500" />
                                            ) : (
                                              <Trash2 className="w-3 h-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-[9px] pl-5 font-mono text-slate-400 truncate" title={m.modelId}>
                                      {m.modelId}
                                    </div>
                                  </div>

                                  {/* Status & Capabilities */}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[9px]">
                                    {isChecked ? (
                                      <span className="text-primary font-semibold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-primary" /> Active
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium">
                                        Excluded
                                      </span>
                                    )}
                                    <span className="text-slate-400 font-mono">
                                      {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k ctx` : 'Generative'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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
  );
};
