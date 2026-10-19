# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - Dedicated desktop agent (`local-agent/`) for external browser-assisted 16:9 featured imagery.
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
