import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

// 1. Users & Sessions
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: varchar('role', { length: 50 }).default('author').notNull(), // 'admin', 'editor', 'author'
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Categories & Tags
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id'),
  publishingPolicy: varchar('publishing_policy', { length: 50 }).default('manual').notNull(), // 'draft', 'manual', 'auto'
  defaultProviderId: uuid('default_provider_id'),
  defaultModelId: varchar('default_model_id', { length: 100 }),
  aiSettings: jsonb('ai_settings').default({}),
  featuredImage: text('featured_image'),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: text('seo_description'),
  displayOrder: integer('display_order').default(0).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Articles, Revisions, Sources
export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt').notNull(),
  contentHtml: text('content_html').notNull(),
  contentMarkdown: text('content_markdown'),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  featuredImage: text('featured_image'),
  featuredImageAlt: varchar('featured_image_alt', { length: 255 }),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft', 'in_review', 'approved', 'scheduled', 'published', 'rejected'
  readingTimeMins: integer('reading_time_mins').default(3).notNull(),
  viewsCount: integer('views_count').default(0).notNull(),
  isFeaturedLead: boolean('is_featured_lead').default(false).notNull(),
  isTrending: boolean('is_trending').default(false).notNull(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  canonicalUrl: text('canonical_url'),
  ogImage: text('og_image'),
  schemaJson: jsonb('schema_json'),
  tags: jsonb('tags').default([]), // array of tag strings
  aiMetadata: jsonb('ai_metadata').default({}), // provider, model, prompt, tokens, cost
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleRevisions = pgTable('article_revisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  contentHtml: text('content_html').notNull(),
  excerpt: text('excerpt'),
  revisionNumber: integer('revision_number').notNull(),
  changeSummary: varchar('change_summary', { length: 255 }),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articleSources = pgTable('article_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  sourceName: varchar('source_name', { length: 150 }).notNull(),
  url: text('url').notNull(),
  publishedAt: timestamp('published_at'),
  claimExtracted: text('claim_extracted'),
  credibilityScore: integer('credibility_score').default(85),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Research Sources & Discovered Items
export const researchSources = pgTable('research_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  siteUrl: text('site_url'),
  categoryId: uuid('category_id').references(() => categories.id),
  priority: integer('priority').default(1).notNull(),
  pollingIntervalMins: integer('polling_interval_mins').default(30).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  lastFetchedAt: timestamp('last_fetched_at'),
  lastStatus: varchar('last_status', { length: 50 }).default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const discoveredItems = pgTable('discovered_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id').references(() => researchSources.id, { onDelete: 'cascade' }).notNull(),
  headline: text('headline').notNull(),
  canonicalUrl: text('canonical_url').notNull(),
  summary: text('summary'),
  content: text('content'),
  publishedDate: timestamp('published_date'),
  retrievedAt: timestamp('retrieved_at').defaultNow().notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  duplicateKey: varchar('duplicate_key', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('new').notNull(), // 'new', 'processed', 'ignored', 'research_required'
  relevanceScore: integer('relevance_score').default(70),
  entities: jsonb('entities').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. AI Providers & Dynamic Model Discovery
export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // 'gemini', 'openai', 'grok', 'groq', 'claude', 'custom_openai', 'ollama'
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: text('base_url'),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  isFreeTierAvailable: boolean('is_free_tier_available').default(false).notNull(),
  rateLimitsInfo: text('rate_limits_info'),
  pricingDocUrl: text('pricing_doc_url'),
  settingsJson: jsonb('settings_json').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiModels = pgTable('ai_models', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerId: uuid('provider_id').references(() => aiProviders.id, { onDelete: 'cascade' }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  capabilities: jsonb('capabilities').default(['text', 'structured_output']).notNull(), // ['text', 'structured_output', 'vision', 'tool_calling', 'image_generation']
  contextWindow: integer('context_window'),
  isDefault: boolean('is_default').default(false).notNull(),
  pricingNotes: text('pricing_notes'),
  discoveredAt: timestamp('discovered_at').defaultNow().notNull(),
});

// 6. Image Providers & Generated Images
export const imageProviders = pgTable('image_providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // 'gemini', 'openai'
  status: varchar('status', { length: 50 }).default('active').notNull(), // 'active', 'coming_soon'
  modelId: varchar('model_id', { length: 100 }),
  settingsJson: jsonb('settings_json').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const generatedImages = pgTable('generated_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  imageUrl: text('image_url').notNull(),
  altText: varchar('alt_text', { length: 255 }).notNull(),
  providerSlug: varchar('provider_slug', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('completed').notNull(),
  metadataJson: jsonb('metadata_json').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const imageAutomationJobs = pgTable('image_automation_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'claimed', 'processing', 'completed', 'failed', 'timeout'
  prompt: text('prompt').notNull(),
  articleTitle: varchar('article_title', { length: 255 }).notNull(),
  categoryName: varchar('category_name', { length: 100 }),
  aspectRatio: varchar('aspect_ratio', { length: 20 }).default('16:9').notNull(),
  visualStyle: text('visual_style'),
  autoPublishOnComplete: boolean('auto_publish_on_complete').default(true).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  claimedBy: varchar('claimed_by', { length: 150 }),
  claimedAt: timestamp('claimed_at'),
  completedAt: timestamp('completed_at'),
  uploadedImageUrl: text('uploaded_image_url'),
  errorMessage: text('error_message'),
  logsJson: jsonb('logs_json').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleViewRecords = pgTable('article_view_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  ipHash: varchar('ip_hash', { length: 64 }).notNull(),
  sessionHash: varchar('session_hash', { length: 64 }),
  dwellTimeSeconds: integer('dwell_time_seconds').default(0).notNull(),
  userAgent: text('user_agent'),
  isVerified: boolean('is_verified').default(true).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
});

// 7. Visual Workflow Automation (Drag-and-Drop)
export const workflows = pgTable('workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  triggerType: varchar('trigger_type', { length: 50 }).default('schedule').notNull(), // 'cron', 'manual', 'rss', 'story'
  cronExpression: varchar('cron_expression', { length: 50 }).default('0 */2 * * *'),
  nodesJson: jsonb('nodes_json').default([]).notNull(),
  edgesJson: jsonb('edges_json').default([]).notNull(),
  settingsJson: jsonb('settings_json').default({}),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').references(() => workflows.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'running', 'completed', 'failed'
  triggerSource: varchar('trigger_source', { length: 50 }).default('manual'),
  stepLogs: jsonb('step_logs').default([]),
  tokensUsed: integer('tokens_used').default(0),
  costUsd: varchar('cost_usd', { length: 20 }).default('0.0000'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Prompt Templates
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  taskType: varchar('task_type', { length: 50 }).notNull(), // 'outline', 'article', 'seo', 'rewrite', 'image'
  systemPrompt: text('system_prompt').notNull(),
  userPromptTemplate: text('user_prompt_template').notNull(),
  parametersSchema: jsonb('parameters_schema').default({}),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Media Assets
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  storagePath: text('storage_path').notNull(),
  publicUrl: text('public_url').notNull(),
  altText: varchar('alt_text', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Internal Link Suggestions
export const internalLinkSuggestions = pgTable('internal_link_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceArticleId: uuid('source_article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  targetArticleId: uuid('target_article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  anchorText: varchar('anchor_text', { length: 150 }).notNull(),
  relevanceScore: integer('relevance_score').default(80).notNull(),
  status: varchar('status', { length: 50 }).default('suggested').notNull(), // 'suggested', 'accepted', 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Newsletter Subscribers
export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('subscribed').notNull(), // 'subscribed', 'unsubscribed'
  consentTimestamp: timestamp('consent_timestamp').defaultNow().notNull(),
  unsubscribeToken: varchar('unsubscribe_token', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Analytics, Events & Costs
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'pageview', 'article_read', 'search'
  articleId: uuid('article_id'),
  path: text('path').notNull(),
  referrer: text('referrer'),
  userAgentHash: varchar('user_agent_hash', { length: 64 }),
  ipHash: varchar('ip_hash', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyAnalytics = pgTable('daily_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: varchar('date', { length: 10 }).notNull().unique(), // 'YYYY-MM-DD'
  pageviews: integer('pageviews').default(0).notNull(),
  uniqueVisitors: integer('unique_visitors').default(0).notNull(),
  articleViewsJson: jsonb('article_views_json').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerSlug: varchar('provider_slug', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 100 }).notNull(),
  taskType: varchar('task_type', { length: 50 }).notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  estimatedCostUsd: varchar('estimated_cost_usd', { length: 20 }).default('0.000000').notNull(),
  durationMs: integer('duration_ms').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Application Settings, Appearance & Audit Logs
export const applicationSettings = pgTable('application_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  valueJson: jsonb('value_json').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const appearanceSettings = pgTable('appearance_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  accentColor: varchar('accent_color', { length: 50 }).default('#4F46E5').notNull(),
  sidebarColor: varchar('sidebar_color', { length: 50 }).default('#0F172A').notNull(),
  surfaceColor: varchar('surface_color', { length: 50 }).default('#FFFFFF').notNull(),
  borderStyle: varchar('border_style', { length: 50 }).default('subtle').notNull(),
  themeMode: varchar('theme_mode', { length: 20 }).default('system').notNull(), // 'light', 'dark', 'system'
  density: varchar('density', { length: 20 }).default('comfortable').notNull(), // 'compact', 'comfortable'
  sidebarCollapsed: boolean('sidebar_collapsed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id'),
  userEmail: varchar('user_email', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }),
  detailsJson: jsonb('details_json').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Blog Training Corpus
export const trainingBlogs = pgTable('training_blogs', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending', 'fetching', 'trained', 'failed'
  wordCount: integer('word_count').default(0).notNull(),
  summary: text('summary'),
  extractedStyle: jsonb('extracted_style').default({}),
  rawContent: text('raw_content'),
  errorMessage: text('error_message'),
  fetchedAt: timestamp('fetched_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 14b. Training Topics, Keywords & Persistent Instructions
export const trainingTopics = pgTable('training_topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  type: varchar('type', { length: 50 }).default('topic').notNull(), // 'keyword', 'long_tail', 'phrase', 'sentence', 'topic', 'category', 'instruction'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. Sites & Performance Management
export const managedSites = pgTable('managed_sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  url: text('url').notNull(),
  gscPropertyUrl: text('gsc_property_url'),
  ga4PropertyId: text('ga4_property_id'),
  ga4MeasurementId: text('ga4_measurement_id'),
  isDefault: boolean('is_default').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const lighthouseAudits = pgTable('lighthouse_audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').references(() => managedSites.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  strategy: varchar('strategy', { length: 20 }).default('mobile').notNull(), // 'mobile' | 'desktop'
  performanceScore: integer('performance_score').default(0).notNull(),
  accessibilityScore: integer('accessibility_score').default(0).notNull(),
  bestPracticesScore: integer('best_practices_score').default(0).notNull(),
  seoScore: integer('seo_score').default(0).notNull(),
  coreWebVitals: jsonb('core_web_vitals').default({}),
  opportunities: jsonb('opportunities').default([]),
  diagnostics: jsonb('diagnostics').default([]),
  auditedAt: timestamp('audited_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const googleSearchConsoleTokens = pgTable('google_search_console_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  scopes: text('scopes'),
  isConnected: boolean('is_connected').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const searchConsoleCache = pgTable('search_console_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteUrl: text('site_url').notNull(),
  dateRange: varchar('date_range', { length: 50 }).notNull(),
  dataJson: jsonb('data_json').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const googleAnalyticsTokens = pgTable('google_analytics_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  scopes: text('scopes'),
  selectedPropertyId: varchar('selected_property_id', { length: 100 }),
  selectedPropertyName: varchar('selected_property_name', { length: 255 }),
  isConnected: boolean('is_connected').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ga4AnalyticsCache = pgTable('ga4_analytics_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: text('property_id').notNull(),
  dateRange: varchar('date_range', { length: 50 }).notNull(),
  dataJson: jsonb('data_json').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// 16. Drizzle Relations
export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
  }),
  imageJobs: many(imageAutomationJobs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
}));

export const imageAutomationJobsRelations = relations(imageAutomationJobs, ({ one }) => ({
  article: one(articles, {
    fields: [imageAutomationJobs.articleId],
    references: [articles.id],
  }),
}));

export const managedSitesRelations = relations(managedSites, ({ many }) => ({
  audits: many(lighthouseAudits),
}));

export const lighthouseAuditsRelations = relations(lighthouseAudits, ({ one }) => ({
  site: one(managedSites, {
    fields: [lighthouseAudits.siteId],
    references: [managedSites.id],
  }),
}));

