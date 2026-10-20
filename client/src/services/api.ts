const API_BASE = '/api';

export async function fetchJson<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dailybuild_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message || errorBody.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    fetchJson('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => fetchJson('/auth/me'),
  logout: () => fetchJson('/auth/logout', { method: 'POST' }),

  // Articles
  getArticles: (params: Record<string, string | number | boolean> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJson(`/articles${query ? `?${query}` : ''}`);
  },
  getArticle: (slugOrId: string, options: { adminEdit?: boolean } = {}) =>
    fetchJson(`/articles/${slugOrId}${options.adminEdit ? '?adminEdit=true' : ''}`),
  incrementArticleView: (slugOrId: string) =>
    fetchJson<{ success: boolean; viewsCount: number }>(`/articles/${slugOrId}/view`, { method: 'POST' }),
  createArticle: (data: any) => fetchJson('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id: string, data: any) => fetchJson(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArticle: (id: string) => fetchJson(`/articles/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => fetchJson('/categories'),
  createCategory: (data: any) => fetchJson('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => fetchJson(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => fetchJson(`/categories/${id}`, { method: 'DELETE' }),

  // AI Providers & Dynamic Model Discovery (Critical)
  getAIProviders: (onlyChecked = false) => fetchJson(`/ai/providers${onlyChecked ? '?onlyChecked=true' : ''}`),
  getProviderModels: (slug: string, refresh = false, onlyChecked = false) => {
    const params = new URLSearchParams();
    if (refresh) params.set('refresh', 'true');
    if (onlyChecked) params.set('onlyChecked', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<{ provider: string; count: number; checkedModelIds: string[] | null; models: any[] }>(`/ai/providers/${slug}/models${qs}`);
  },
  testAndDiscoverModels: (slug: string, data: { apiKey?: string; baseUrl?: string } = {}) =>
    fetchJson(`/ai/providers/${slug}/test`, { method: 'POST', body: JSON.stringify(data) }),
  updateAIProvider: (slug: string, data: any) =>
    fetchJson(`/ai/providers/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),
  addCustomAIModel: (slug: string, data: { modelId: string; displayName?: string; category?: string; contextWindow?: number; capabilities?: string[] }) =>
    fetchJson<{ success: boolean; message: string; model: any }>(`/ai/providers/${slug}/models`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAIModel: (slug: string, modelId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/ai/providers/${slug}/models/${encodeURIComponent(modelId)}`, {
      method: 'DELETE',
    }),
  generateAIContent: (data: any) => fetchJson('/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
  suggestTopicsFromRss: (data: { provider?: string; model?: string; count?: number; excludedRecentTitles?: string[] } = {}) =>
    fetchJson<{ topics: string[]; usedStale: boolean; storiesCount: number; stories?: any[]; excludedRecentTitles?: string[] }>('/ai/suggest-topics-rss', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getRecentArticleTitles: () => fetchJson<string[]>('/ai/recent-titles'),
  getPromptTemplates: () => fetchJson('/ai/prompts'),
  getRecentAIModels: () => fetchJson('/ai/models/recent'),
  recordModelUsage: (providerSlug: string, modelId: string, taskType?: string) =>
    fetchJson('/ai/models/record', { method: 'POST', body: JSON.stringify({ providerSlug, modelId, taskType }) }),
  generateTitles: (data: { prompt?: string; topic?: string; currentTitle?: string; customInstructions?: string; provider?: string; model?: string; count?: number }) =>
    fetchJson<{ titles: string[] }>('/ai/generate-titles', { method: 'POST', body: JSON.stringify(data) }),
  rewriteContent: (data: { content: string; selectedText?: string; preset?: string; customPrompt?: string; provider?: string; model?: string }) =>
    fetchJson<{ rewritten: string; mode: string }>('/ai/rewrite', { method: 'POST', body: JSON.stringify(data) }),

  // Image Providers
  getImageProviders: () => fetchJson('/image/providers'),
  testImageProvider: (slug: string) => fetchJson(`/image/providers/${slug}/test`, { method: 'POST' }),
  generateFeaturedImage: (data: any) => fetchJson('/image/generate', { method: 'POST', body: JSON.stringify(data) }),
  getImageHistory: () => fetchJson('/image/history'),
  getCliChatStatus: () => fetchJson<{ ready: boolean; repoDir: string; hasApiKey: boolean }>('/image/providers/clichat/status'),
  testCliChat: () => fetchJson<{ success: boolean; message: string; logs?: string[] }>('/image/providers/clichat/test', { method: 'POST' }),

  // Research Sources & RSS
  getSources: () => fetchJson('/sources'),
  createSource: (data: any) => fetchJson('/sources', { method: 'POST', body: JSON.stringify(data) }),
  createSourcesBulk: (sources: any[]) => fetchJson('/sources/bulk', { method: 'POST', body: JSON.stringify({ sources }) }),
  updateSource: (id: string, data: any) => fetchJson(`/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (id: string) => fetchJson(`/sources/${id}`, { method: 'DELETE' }),
  bulkDeleteSources: (ids: string[]) => fetchJson('/sources/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  inspectSourceUrl: (url: string) => fetchJson<{ feedUrl: string; baseUrl: string; title: string }>('/sources/inspect', { method: 'POST', body: JSON.stringify({ url }) }),
  pollSource: (id: string) => fetchJson(`/sources/${id}/poll`, { method: 'POST' }),
  pollAllSources: () => fetchJson('/sources/poll-all', { method: 'POST' }),
  getDiscoveredItems: () => fetchJson('/sources/discovered'),

  // Workflows
  getWorkflows: () => fetchJson('/workflows'),
  getWorkflow: (id: string) => fetchJson(`/workflows/${id}`),
  createWorkflow: (data: any) => fetchJson('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkflow: (id: string, data: any) => fetchJson(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkflow: (id: string) => fetchJson(`/workflows/${id}`, { method: 'DELETE' }),
  toggleWorkflow: (id: string) => fetchJson(`/workflows/${id}/toggle`, { method: 'POST' }),
  runWorkflow: (id: string, sampleInput?: any) =>
    fetchJson(`/workflows/${id}/run`, { method: 'POST', body: JSON.stringify({ sampleInput }) }),
  getWorkflowExecutions: (id: string) => fetchJson(`/workflows/${id}/executions`),
  getWorkflowExecution: (executionId: string) => fetchJson(`/workflows/executions/${executionId}`),
  retryWorkflowExecution: (executionId: string) =>
    fetchJson(`/workflows/executions/${executionId}/retry`, { method: 'POST' }),
  previewCron: (cronExpression: string, timezone: string = 'Asia/Kolkata', count: number = 5) =>
    fetchJson<{ isValid: boolean; error?: string; explanation?: string; nextOccurrences?: string[] }>(
      '/workflows/cron-preview',
      { method: 'POST', body: JSON.stringify({ cronExpression, timezone, count }) }
    ),

  // Media
  getMediaAssets: () => fetchJson('/media'),
  deleteMediaAsset: (id: string) => fetchJson(`/media/${id}`, { method: 'DELETE' }),

  // SEO & Newsletter & Analytics
  getInternalLinks: (data: { articleId?: string; content: string }) =>
    fetchJson('/seo/internal-links', { method: 'POST', body: JSON.stringify(data) }),
  subscribeNewsletter: (email: string) =>
    fetchJson('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email }) }),
  getSubscribers: () => fetchJson('/newsletter/subscribers'),
  updateSubscriberStatus: (id: string, status: 'subscribed' | 'unsubscribed') =>
    fetchJson(`/newsletter/subscribers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteSubscriber: (id: string) =>
    fetchJson(`/newsletter/subscribers/${id}`, { method: 'DELETE' }),
  getAnalyticsSummary: () => fetchJson('/analytics/summary'),
  getPublicStats: () => fetchJson<any>('/analytics/public-stats'),
  recordPageView: (data: { path: string; articleId?: string; referrer?: string; details?: string }) =>
    fetchJson('/analytics/event', { method: 'POST', body: JSON.stringify(data) }),
  recordAction: (data: { eventType: string; articleId?: string; path?: string; details?: string; referrer?: string }) =>
    fetchJson('/analytics/event', { method: 'POST', body: JSON.stringify(data) }).catch(() => {}),
  recordArticleView: (articleId: string, dwellTimeSeconds: number = 5, sessionToken?: string) =>
    fetchJson<{ counted: boolean; reason: string }>('/analytics/view', {
      method: 'POST',
      body: JSON.stringify({ articleId, dwellTimeSeconds, sessionToken }),
    }),
  getKillSwitch: () => fetchJson<{ active: boolean }>('/settings/kill-switch'),
  toggleKillSwitch: (active: boolean) =>
    fetchJson<{ message: string; active: boolean }>('/settings/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),

  // Local AI Automation Agent & Webhook
  getAutomationSettings: () => fetchJson<any>('/automation/settings'),
  updateAutomationSettings: (data: any) =>
    fetchJson('/automation/settings', { method: 'PUT', body: JSON.stringify(data) }),
  testAutomationWebhook: (data?: any) =>
    fetchJson<{ success: boolean; message: string; latencyMs?: number; responseStatus?: number; error?: string }>('/automation/test-webhook', { method: 'POST', body: JSON.stringify(data || {}) }),
  getAutomationJobs: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJson<{ jobs: any[]; total: number; activeCount: number }>(`/automation/jobs${q ? `?${q}` : ''}`);
  },
  createAutomationJob: (data: { articleId: string; prompt?: string; visualStyle?: string; autoPublishOnComplete?: boolean }) =>
    fetchJson<{ success: boolean; job: any; dispatchedWebhook?: boolean }>('/automation/jobs/create', { method: 'POST', body: JSON.stringify(data) }),
  retryAutomationJob: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/automation/jobs/${id}/retry`, { method: 'POST' }),
  cancelAutomationJob: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/automation/jobs/${id}/cancel`, { method: 'POST' }),
  uploadFeaturedImageFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('dailybuild_token') : null;
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'File upload failed');
    }
    return res.json();
  },

  // Settings & System
  getAppearance: () => fetchJson('/settings/appearance'),
  updateAppearance: (data: any) => fetchJson('/settings/appearance', { method: 'PUT', body: JSON.stringify(data) }),
  getSystemHealth: () => fetchJson('/settings/system'),
  getAuditLogs: () => fetchJson('/settings/audit-logs'),

  // Blog Training Corpus
  getTrainingBlogs: () => fetchJson<any[]>('/training/blogs'),
  submitTrainingBlogs: (data: { url?: string; urls?: string[] }) =>
    fetchJson('/training/blogs', { method: 'POST', body: JSON.stringify(data) }),
  retrainBlog: (id: string) => fetchJson(`/training/blogs/${id}/retrain`, { method: 'POST' }),
  deleteTrainingBlog: (id: string) => fetchJson(`/training/blogs/${id}`, { method: 'DELETE' }),
  getTrainingCorpus: () => fetchJson<any>('/training/corpus'),

  // Training Topics & Persistent Keywords
  getTrainingTopics: () => fetchJson<any[]>('/training/topics'),
  createTrainingTopic: (data: { text?: string; type?: string; items?: any[] }) =>
    fetchJson<{ success: boolean; items?: any[]; item?: any }>('/training/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTrainingTopic: (id: string, data: { text?: string; type?: string; isActive?: boolean }) =>
    fetchJson<{ success: boolean; item: any }>(`/training/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTrainingTopic: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/training/topics/${id}`, { method: 'DELETE' }),

  // Sites Management, Lighthouse PageSpeed, & Google Search Console
  getSites: () => fetchJson<{ sites: any[] }>('/sites'),
  createSite: (data: { name: string; url: string; gscPropertyUrl?: string; ga4PropertyId?: string; ga4MeasurementId?: string; isDefault?: boolean; notes?: string }) =>
    fetchJson<{ site: any; message: string }>('/sites', { method: 'POST', body: JSON.stringify(data) }),
  updateSite: (id: string, data: any) =>
    fetchJson<{ site: any; message: string }>(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSite: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/sites/${id}`, { method: 'DELETE' }),
  getSiteOverview: (id: string) =>
    fetchJson<{ site: any; mobileAudit: any; desktopAudit: any; gscStatus: any; ga4Status?: any }>(`/sites/${id}/overview`),
  runLighthouseAudit: (data: { url: string; strategy?: 'mobile' | 'desktop' | 'both'; forceRefresh?: boolean; siteId?: string }) =>
    fetchJson<{ success: boolean; url: string; result?: any; results?: any }>('/sites/lighthouse/audit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getLighthouseHistory: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetchJson<{ audits: any[] }>(`/sites/lighthouse/history${q ? `?${q}` : ''}`);
  },
  getGscStatus: () =>
    fetchJson<{
      isConnected: boolean;
      email: string | null;
      isConfigured: boolean;
      clientIdConfigured: boolean;
      clientSecretConfigured: boolean;
      redirectUri: string;
    }>('/sites/gsc/status'),
  getGscAuthUrl: () => fetchJson<{ authUrl: string }>('/sites/gsc/auth-url'),
  disconnectGsc: () => fetchJson<{ success: boolean; message: string }>('/sites/gsc/disconnect', { method: 'POST' }),
  getGscProperties: () =>
    fetchJson<{ properties: Array<{ siteUrl: string; permissionLevel: string }> }>('/sites/gsc/properties'),
  selectGscProperty: (data: { propertyUrl: string; siteId?: string }) =>
    fetchJson<{ success: boolean; propertyUrl: string }>('/sites/gsc/select-property', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  queryGscAnalytics: (data: { propertyUrl: string; startDate?: string; endDate?: string; compare?: boolean; forceRefresh?: boolean }) =>
    fetchJson<any>('/sites/gsc/analytics', { method: 'POST', body: JSON.stringify(data) }),

  // Google Analytics 4 (GA4) Data API & Admin API
  getGA4Status: () =>
    fetchJson<{
      isConnected: boolean;
      email: string | null;
      isConfigured: boolean;
      clientIdConfigured: boolean;
      clientSecretConfigured: boolean;
      redirectUri: string;
      selectedPropertyId: string | null;
      selectedPropertyName: string | null;
    }>('/sites/ga4/status'),
  getGA4AuthUrl: () => fetchJson<{ authUrl: string }>('/sites/ga4/auth-url'),
  disconnectGA4: () => fetchJson<{ success: boolean; message: string }>('/sites/ga4/disconnect', { method: 'POST' }),
  getGA4Properties: () =>
    fetchJson<{ properties: Array<{ propertyId: string; cleanId: string; displayName: string; account: string; accountName: string }> }>('/sites/ga4/properties'),
  selectGA4Property: (data: { propertyId: string; displayName?: string; siteId?: string }) =>
    fetchJson<{ success: boolean; propertyId: string; displayName?: string }>('/sites/ga4/select-property', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  queryGA4Analytics: (data: { propertyId?: string; startDate?: string; endDate?: string; compare?: boolean; forceRefresh?: boolean }) =>
    fetchJson<any>('/sites/ga4/analytics', { method: 'POST', body: JSON.stringify(data) }),

  generateSiteAIInsights: (data: {
    siteUrl: string;
    mobileLighthouse?: any;
    desktopLighthouse?: any;
    searchConsole?: any;
    googleAnalytics?: any;
    providerSlug?: string;
    modelId?: string;
  }) => fetchJson<any>('/sites/ai/generate-insights', { method: 'POST', body: JSON.stringify(data) }),
  getSitesSetupStatus: () => fetchJson<any>('/sites/setup/status'),
};

