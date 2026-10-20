import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import {
  Image as ImageIcon,
  Sparkles,
  Clock,
  Check,
  Download,
  AlertCircle,
  Terminal,
  Copy,
  Trash2,
  ArrowUpRight,
  Play,
  ExternalLink,
  Bot,
  Radio,
  RefreshCw,
  Send,
  Shield,
  Layers,
  Settings,
  Eye,
  Wand2,
} from 'lucide-react';
import { ThumbnailPromptBuilder, PromptBuilderValues } from './components/ThumbnailPromptBuilder.js';

const POPULAR_AI_TOPICS = [
  { topic: 'Top Two AI Platforms: ChatGPT vs Claude', title: 'ChatGPT vs Claude: Which AI Platform Is Better in 2026?' },
  { topic: 'OpenAI vs Google Gemini', title: 'The Search Engine War: How Gemini and ChatGPT are Replacing Google' },
  { topic: 'Top 10 Everyday AI Tools', title: 'Top 10 Popular AI Tools Everyone Is Using for Work and Life' },
  { topic: 'Apple Intelligence vs ChatGPT', title: 'Apple Intelligence vs ChatGPT: Which Wins for Real Users?' },
];

export const ImageProvidersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agent' | 'generator' | 'jobs'>('agent');
  const [loading, setLoading] = useState(true);

  // Local AI Automation Settings
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretToken, setSecretToken] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [autoPublish, setAutoPublish] = useState(true);
  const [promptPrefix, setPromptPrefix] = useState('Create a minimalist, hand-drawn editorial thumbnail for the article "{{TITLE}}", in the category "{{CATEGORY}}". Use authentic company logos, real web/app UI screens, or real technical graphics if required for the topic.');
  const [promptSuffix, setPromptSuffix] = useState('');
  const [agentStatus, setAgentStatus] = useState<any>({ online: false });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<any>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Jobs Queue & History
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [selectedJobLogs, setSelectedJobLogs] = useState<any>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  // Direct Generator State
  const [geminiModel, setGeminiModel] = useState('imagen-3.0-generate-002');
  const [geminiModels, setGeminiModels] = useState<any[]>([]);
  const [selectedEngine, setSelectedEngine] = useState('antigravity');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);

  const [topic, setTopic] = useState('Top Two AI Platforms: ChatGPT vs Claude');
  const [title, setTitle] = useState('ChatGPT vs Claude: Which AI Platform Is Better in 2026?');
  const [category, setCategory] = useState('AI & LLMs');
  const [style, setStyle] = useState('Minimalist editorial conceptual art, cinematic lighting, sleek dark indigo palette, 8k');
  const [generating, setGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadJobsAndStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSettings(), loadJobsAndStatus()]);
      api.getProviderModels('gemini', false, true).then((res) => {
        if (res?.models && Array.isArray(res.models) && res.models.length > 0) {
          const checked = res.models.filter((m: any) => m.isChecked !== false);
          setGeminiModels(checked.length > 0 ? checked : res.models);
        }
      }).catch((e) => console.warn('Could not fetch Gemini models:', e));
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getAutomationSettings();
      if (data) {
        setWebhookUrl(data.webhookUrl || '');
        setSecretToken(data.secretToken || '');
        setIsEnabled(data.isEnabled !== false);
        setAspectRatio(data.aspectRatio || '16:9');
        setAutoPublish(data.autoPublish !== false);
        if (data.promptPrefix) setPromptPrefix(data.promptPrefix);
        if (data.promptSuffix) setPromptSuffix(data.promptSuffix);
        if (data.agentStatus) setAgentStatus(data.agentStatus);
      }
    } catch (err: any) {
      console.warn('Could not load automation settings:', err.message);
    }
  };

  const loadJobsAndStatus = async () => {
    try {
      const [jobsData, settingsData] = await Promise.all([
        api.getAutomationJobs({ limit: 50 }),
        api.getAutomationSettings(),
      ]);
      if (jobsData?.jobs) {
        setJobs(jobsData.jobs);
        setActiveJobCount(jobsData.activeCount || 0);
      }
      if (settingsData?.agentStatus) {
        setAgentStatus(settingsData.agentStatus);
      }
    } catch {}
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateAutomationSettings({
        webhookUrl,
        secretToken,
        isEnabled,
        aspectRatio,
        autoPublish,
        promptPrefix,
        promptSuffix,
      });
      alert('Local AI Agent & Webhook settings updated successfully!');
      loadSettings();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const res = await api.testAutomationWebhook({ url: webhookUrl, secret: secretToken });
      setTestWebhookResult(res);
    } catch (err: any) {
      setTestWebhookResult({
        success: false,
        message: err.message,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleCopySecret = () => {
    if (secretToken) {
      navigator.clipboard.writeText(secretToken);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleGenerateSecret = () => {
    const newSec = 'agy_agent_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setSecretToken(newSec);
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await api.retryAutomationJob(jobId);
      loadJobsAndStatus();
    } catch (err: any) {
      alert(`Could not retry job: ${err.message}`);
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await api.cancelAutomationJob(jobId);
      loadJobsAndStatus();
    } catch (err: any) {
      alert(`Could not cancel job: ${err.message}`);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setPreviewImage(null);

    const ts = new Date().toLocaleTimeString();
    setExecutionLogs([
      `[${ts}] Synthesizing featured image for: "${title}"`,
      `[${ts}] Engine: ${selectedEngine}`,
    ]);

    try {
      const res = await api.generateFeaturedImage({
        topic,
        title,
        category,
        visualStyle: style,
        provider: selectedEngine,
        modelId: selectedEngine === 'gemini' ? geminiModel : undefined,
        customPrompt: customPrompt || undefined,
      });
      setPreviewImage(res);
      if (res.logs && Array.isArray(res.logs)) {
        setExecutionLogs(res.logs);
      }
    } catch (err: any) {
      setExecutionLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${err.message}`]);
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-indigo-600" />
            Local AI Image Generation &amp; Auto-Publishing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automate 16:9 blog featured images with your continuous laptop agent, configurable ngrok webhook, and instant sync.
          </p>
        </div>

        {/* Live Agent Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              agentStatus?.online
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                agentStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>{agentStatus?.online ? 'Agent Online' : 'Agent Standby / Polling'}</span>
            <span className="text-[10px] opacity-75 font-mono">({agentStatus?.machineName || 'Laptop'})</span>
          </div>
          <button
            type="button"
            onClick={loadJobsAndStatus}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 border border-slate-200 dark:border-slate-700"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('agent')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'agent'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" /> Webhook &amp; Agent Controls
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Live Job Queue &amp; History
          {activeJobCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-bold">
              {activeJobCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`pb-3 flex items-center gap-2 transition-colors border-b-2 ${
            activeTab === 'generator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Direct Fallback Synthesis
        </button>
      </div>

      {/* TAB 1: Webhook & Agent Controls */}
      {activeTab === 'agent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Webhook Configuration Form */}
          <div className="lg:col-span-2 clay-card p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600" /> Webhook Endpoint Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure your public ngrok webhook URL. When cron jobs run or articles are created, the server dispatches generation payloads to this URL.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Public Webhook URL (ngrok):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-tunnel.ngrok-free.app/webhook/generate-image"
                    className="flex-1 px-3 py-2 text-xs clay-input font-mono"
                  />
                  <button
                    type="button"
                    disabled={testingWebhook || !webhookUrl}
                    onClick={handleTestWebhook}
                    className="clay-btn px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                    {testingWebhook ? 'Testing...' : 'Test Ping'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Start tunnel in terminal: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600">ngrok http 4500</code>, then paste URL above.
                </p>
              </div>

              {/* Webhook Ping Feedback */}
              {testWebhookResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testWebhookResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testWebhookResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">{testWebhookResult.message}</div>
                    {testWebhookResult.latencyMs && (
                      <div className="text-[10px] font-mono opacity-80 mt-0.5">
                        Latency: {testWebhookResult.latencyMs}ms • Status: HTTP {testWebhookResult.responseStatus}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Secret Token */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Authentication Secret Token (X-Agent-Secret):</span>
                  <button
                    type="button"
                    onClick={handleGenerateSecret}
                    className="text-[11px] text-indigo-600 hover:underline font-normal"
                  >
                    Generate New
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secretToken}
                    onChange={(e) => setSecretToken(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs clay-input font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="clay-btn px-3 py-2 text-xs flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSecret ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Place this secret in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">local-agent/.env</code> as <code className="text-indigo-600">AGENT_SECRET</code>.
                </p>
              </div>

              {/* Preferences Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aspect Ratio:
                  </label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 text-xs clay-input font-bold text-indigo-700"
                  >
                    <option value="16:9">16:9 (Standard Editorial Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={autoPublish}
                      onChange={(e) => setAutoPublish(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Auto-Publish Article on Image Sync
                    </span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prompt Prefix:
                  </label>
                  <input
                    type="text"
                    value={promptPrefix}
                    onChange={(e) => setPromptPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-xs clay-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prompt Suffix &amp; 16:9 Guidelines:
                  </label>
                  <input
                    type="text"
                    value={promptSuffix}
                    onChange={(e) => setPromptSuffix(e.target.value)}
                    className="w-full px-3 py-2 text-xs clay-input"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  Automation System Enabled
                </label>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="clay-btn-primary px-5 py-2.5 text-xs flex items-center gap-2 font-bold"
                >
                  <Check className="w-4 h-4" />
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Setup & Agent Info Guide */}
          <div className="space-y-6">
            <div className="clay-card p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600" /> 1-Step Laptop Agent Setup
              </h3>
              <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 list-decimal list-inside leading-relaxed">
                <li>
                  Open terminal in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 font-mono">local-agent/</code>
                </li>
                <li>
                  Install packages: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">npm install</code>
                </li>
                <li>
                  Start ngrok tunnel: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">ngrok http 4500</code>
                </li>
                <li>Paste tunnel URL above and save settings.</li>
                <li>
                  Run agent: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-emerald-600 font-bold">npm start</code>
                </li>
              </ol>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 text-[11px] text-indigo-800 dark:text-indigo-300">
                <strong>Dual-Mode Reliability:</strong> Even if ngrok restarts, the agent automatically polls the server queue every 5 seconds so no jobs are ever dropped.
              </div>
            </div>

            <div className="clay-card p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" /> Reliability &amp; Security
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                All server-agent communications are verified using HMAC secret tokens. Uploaded images are strictly validated for JPEG/PNG/WebP formats before saving into <code className="font-mono">/uploads/</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Live Job Queue & History */}
      {activeTab === 'jobs' && (
        <div className="clay-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" /> Automation Job Queue &amp; History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time tracking of generation requests dispatched to the local agent or cron scheduler.
              </p>
            </div>
            <button
              type="button"
              onClick={loadJobsAndStatus}
              className="clay-btn px-3 py-1.5 text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No automation jobs in queue yet. Jobs will appear here when scheduled by cron or dispatched from the article editor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Article Title</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Thumbnail</th>
                    <th className="py-2.5 px-3">Aspect</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {jobs.map((job) => {
                    const isPending = job.status === 'pending';
                    const isClaimed = job.status === 'claimed';
                    const isCompleted = job.status === 'completed';
                    const isFailed = job.status === 'failed';

                    return (
                      <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {job.articleTitle}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {job.id.slice(0, 8)}... • {job.categoryName || 'Tech'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isClaimed
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {job.uploadedImageUrl ? (
                            <a
                              href={job.uploadedImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block w-16 h-9 rounded overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-0.5"
                            >
                              <img src={job.uploadedImageUrl} alt="" className="w-full h-full object-contain" />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px] italic">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {job.aspectRatio || '16:9'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {job.attempts} / {job.maxAttempts}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500">
                          {new Date(job.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedJobLogs(job)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold"
                          >
                            Logs
                          </button>
                          {(isFailed || isPending) && (
                            <button
                              type="button"
                              disabled={retryingJobId === job.id}
                              onClick={() => handleRetryJob(job.id)}
                              className="px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold"
                            >
                              Retry
                            </button>
                          )}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleCancelJob(job.id)}
                              className="px-2 py-1 text-[11px] rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-bold"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Job Logs Modal */}
          {selectedJobLogs && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="clay-card bg-slate-950 text-slate-200 max-w-2xl w-full p-6 space-y-4 rounded-2xl border border-slate-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">
                      Job Logs: "{selectedJobLogs.articleTitle}"
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedJobLogs(null)}
                    className="text-slate-400 hover:text-white font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] space-y-1.5 max-h-80 overflow-y-auto">
                  {Array.isArray(selectedJobLogs.logsJson) && selectedJobLogs.logsJson.length > 0 ? (
                    selectedJobLogs.logsJson.map((line: string, i: number) => (
                      <div key={i} className="text-slate-300 leading-relaxed">
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic">No logs recorded for this job.</div>
                  )}
                  {selectedJobLogs.errorMessage && (
                    <div className="text-rose-400 font-bold mt-2">
                      Error: {selectedJobLogs.errorMessage}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJobLogs(null)}
                    className="clay-btn px-4 py-1.5 text-xs text-white bg-slate-800 hover:bg-slate-700 font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Direct Fallback Synthesis */}
      {activeTab === 'generator' && (
        <div className="clay-card p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> Direct Fallback Synthesis
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate images directly on the server via CliChat CLI or Google Gemini Imagen.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Article Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs clay-input"
              >
                <option value="AI & LLMs">AI &amp; LLMs</option>
                <option value="Technology News">Technology News</option>
                <option value="Software & Developer Tools">Software &amp; Tools</option>
                <option value="Cybersecurity & Privacy">Cybersecurity</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image Generation Engine
              </label>
              <select
                value={selectedEngine}
                onChange={(e) => setSelectedEngine(e.target.value)}
                className="w-full px-3 py-2 text-xs clay-input font-bold text-indigo-700"
              >
                <option value="antigravity">Google Antigravity Imagen (16:9 Editorial)</option>
                <option value="codex">OpenAI Codex CLI (16:9 Editorial Graphics)</option>
                <option value="clichat">ChatGPT Local Agent / CliChat</option>
                <option value="gemini">Google Gemini Imagen</option>
              </select>
            </div>

            {selectedEngine === 'gemini' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gemini Model (API Discovered)
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs clay-input font-medium text-slate-800 dark:text-slate-200"
                >
                  {geminiModels.length > 0 ? (
                    geminiModels.map((m: any) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName ? `${m.displayName} (${m.modelId})` : m.modelId}
                      </option>
                    ))
                  ) : (
                    <option value="imagen-3.0-generate-002">Imagen 3 (imagen-3.0-generate-002)</option>
                  )}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs clay-input"
              />
            </div>

            {/* Dedicated 16:9 Thumbnail Prompt Builder */}
            <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-indigo-600" /> High-Quality 16:9 Thumbnail Prompt Crafting
                </span>
                <button
                  type="button"
                  onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold clay-btn text-indigo-700"
                >
                  {showPromptBuilder ? 'Use Simple Style' : 'Expand Advanced Prompt Builder'}
                </button>
              </div>

              {showPromptBuilder ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <ThumbnailPromptBuilder
                    initialTopic={title}
                    initialCategory={category}
                    onPromptChange={(p) => setCustomPrompt(p)}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Visual Metaphor &amp; Style Hint
                  </label>
                  <input
                    type="text"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-3 py-2 text-xs clay-input"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={generating}
                className="clay-btn-primary px-5 py-2.5 text-xs flex items-center gap-2 font-bold"
              >
                <Sparkles className="w-4 h-4" />
                {generating ? 'Synthesizing with Engine...' : 'Generate 16:9 Featured Cover'}
              </button>
            </div>
          </form>

          {previewImage && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-72 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                <img src={previewImage.imageUrl} alt="" className="w-full h-40 object-contain" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="clay-badge px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50">
                  Synthesized Successfully
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
                <p className="text-xs text-slate-500 font-mono text-[11px] bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                  {previewImage.prompt}
                </p>
                <a
                  href={previewImage.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="clay-btn inline-flex items-center gap-1 text-xs text-indigo-600 font-bold px-3 py-1.5 mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> View Full Image
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
