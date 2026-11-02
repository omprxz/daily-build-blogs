# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-10-26

### Added
- **Integrated 15 SEO & AEO Tools Suite**: Comprehensive search engine optimization and answer engine optimization intelligence suite natively embedded into the admin panel, AI generator, article editor, and publication pipeline:
  1. *SEO Audit & Site Crawler*: Streaming HTML crawler with Cheerio and Playwright fallback, canonical inspection, broken link checker, robots directives audit, and CSV report export.
  2. *AI Keyword & Intent Analyzer*: Seed keyword expansion, search intent classification (Informational, Navigational, Commercial, Transactional), question discovery, and GSC query clustering.
  3. *On-Page SEO Optimizer*: Readability scoring (Flesch-Kincaid), heading structure validation, image alt checks, and one-click fix applicator.
  4. *AEO / GEO Readiness Analyzer*: Answer engine readiness scoring for Perplexity/ChatGPT/Gemini, direct answer extractability, definition blocks, and AI crawler access verification.
  5. *Internal Linking Intelligence*: Link graph visualization, orphan page detection, and semantic contextual link recommendation with one-click insertion.
  6. *Schema & Structured Data Validator*: Schema.org JSON-LD generator and validator for Article, TechArticle, NewsArticle, BreadcrumbList, and Organization following Google Search Central rules.
  7. *Indexing & Sitemap Manager*: Automated XML sitemaps with valid `lastmod` dates, IndexNow protocol integration with instant broadcast to Bing, Yandex, Seznam, and Naver, and public key verification endpoint `/:keyFile.txt`.
  8. *Content Decay & Ranking Opportunity Detector*: Real Google Search Console and GA4 data processing flagging striking distance queries and decaying pages.
  9. *Duplicate Content & Cannibalization Detector*: 4-word shingling and Jaccard similarity scanner with Search Console query cannibalization mapping.
  10. *AI Content Quality & Source Verification*: Factual claim & statistic extraction, SSRF-safe URL verification, and marketing fluff detection.
  11. *SERP Preview & CTR Optimizer*: Pixel-width Google desktop & mobile snippet simulation (595px boundary) and AI high-CTR headline generator.
  12. *Topical Authority & Content Gap Mapper*: Topic cluster mapping, internal coverage depth scores (0–100), and automated editorial brief generator.
  13. *Content Freshness & Update Scheduler*: Category refresh intervals, review queue for aging articles, and outdated reference detection.
  14. *Crawlability & Indexability Inspector*: Standalone technical inspector analyzing `robots.txt`, `X-Robots-Tag`, meta robots, canonical consistency, and redirect chains.
  15. *AI Search Citation Tracker*: Topic prompt evaluation across AI search models, brand/domain citation presence tracking, and presence score.
  16. *Unified SEO Overview Dashboard*: Executive dashboard aggregating crawl health, AEO readiness tier, striking distance queries, and quick tool launcher.
- **Pre-Publication SEO & AEO Quality Gate**: Real-time pre-flight verification in `ArticleEditor.tsx` with configurable site policies (`warning_only`, `approval_required`, `block_publication`).
- **Automated Post-Publication Workflows**: Automatic broadcast to IndexNow protocol and real-time calculation and snapshotting of `seoScore` and `aeoScore` into PostgreSQL.
- **Background Cron Jobs**: Weekly technical audit cron (`0 2 * * 0`) and daily AI search citation tracker cron (`0 4 * * *`) inside `worker.ts`.
- **Database Migrations**: 10 new PostgreSQL tables (`seo_audits`, `seo_audit_findings`, `seo_keyword_research`, `seo_schema_validations`, `seo_indexing_logs`, `seo_content_freshness`, `seo_content_verifications`, `seo_ai_search_trackers`, `seo_topic_clusters`, `seo_settings`) and 3 new columns on `articles` (`seo_score`, `aeo_score`, `last_audited_at`).

## [1.0.0] - 2026-10-20

### Added
- **True React 18 SSR Engine**: Server-side rendered HTML responses with full JSON-LD schema (`NewsArticle`, `Organization`, `BreadcrumbList`), OpenGraph metadata, and hydration state injection.
- **Dynamic AI Model Discovery**: Real-time model discovery and latency verification across 8 AI adapters:
  - Google Gemini (`@google/genai` official SDK)
  - OpenAI (GPT-4o, o3-mini)
  - OpenRouter (300+ frontier & open-source models)
  - Groq Cloud (Ultra-fast Llama 3 / Mixtral inference)
  - Self-hosted Ollama
  - Google Antigravity CLI (`agy`)
  - OpenAI Codex CLI (`codex`)
  - Terminal GPT CLI (`tgpt`)
- **Visual Drag-and-Drop Workflow Builder**: Interactive workflow orchestration canvas powered by `@xyflow/react` (React Flow) with nodes for Cron, RSS polling, deduplication, outline generation, article drafting, thumbnail generation, SEO scoring, and auto-publishing.
- **Automated RSS Research Pipeline**: Idempotently seeds 10 verified technology feeds (Google AI, OpenAI, Anthropic, Hugging Face, GitHub, Mozilla, The Hacker News, Ars Technica, TechCrunch, Google Developers) with SHA-256 deduplication.
- **Featured Image Generation & Watermarking**:
  - Google Gemini Imagen 3 visual synthesis.
  - Automatic WebP conversion and DailyBuild logo watermarking via Sharp.
  - Dedicated Model Context Protocol server (`local-image-mcp/`) for external browser-assisted 16:9 featured imagery.
- **Google Search Console & GA4 Integration**: OAuth 2.0 integration for real-time organic search telemetry and Core Web Vitals correlation with joint AI insight reports.
- **Security & Data Protection**:
  - AES-256-GCM encryption for stored AI API keys.
  - Global emergency auto-publish kill switch.
  - Strict input sanitization via `sanitize-html`.
  - Rate limiting on API routes.
- **Production Infrastructure**:
  - Zero-overhead Nginx reverse proxy configuration.
  - PM2 process management (`ecosystem.config.cjs`) with automatic crash recovery.
  - Zero-downtime deployment, backup, and restore shell scripts.
