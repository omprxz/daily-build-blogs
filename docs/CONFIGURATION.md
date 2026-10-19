# Configuration Guide

Daily Build Blogs is configured through environment variables and dynamic administration settings. This document details every supported parameter.

---

## 1. Server Environment Variables (`server/.env`)

| Variable Name | Required | Default Value | Description & Security Guidelines |
| ------------- | :------: | ------------- | --------------------------------- |
| `NODE_ENV` | Yes | `development` | Set to `production` in production. Enables secure cookies and disables debug stacks. |
| `PORT` | Yes | `4000` | HTTP port on which the Express server listens. |
| `APP_NAME` | No | `"Daily Build Blogs"` | Application branding name displayed in emails, headers, and RSS feeds. |
| `APP_URL` | Yes | `https://blogs.dailybuild.tech` | Public canonical base URL. Used for SEO sitemaps, OpenGraph tags, and OAuth callbacks. |
| `DATABASE_URL` | Yes | `postgresql://postgres:password@localhost:5432/daily_build_blogs` | Full PostgreSQL connection URI. |
| `DB_NAME` | No | `daily_build_blogs` | Target database name. |
| `JWT_SECRET` | **YES** | *(dev default)* | **Critical Security Key.** Used to sign admin JWT session tokens. Must be at least 32 random bytes. Generate with: `openssl rand -hex 32`. |
| `SESSION_SECRET` | **YES** | *(dev default)* | Secret used to sign session cookies. Generate with: `openssl rand -hex 32`. |
| `ENCRYPTION_MASTER_KEY` | **YES** | *(dev default)* | **Critical Security Key.** Used for AES-256-GCM symmetric encryption of stored AI Provider API keys. **Must be exactly 64 hexadecimal characters (32 bytes).** Generate with: `openssl rand -hex 32`. |
| `ADMIN_EMAIL` | Yes | `admin@dailybuild.tech` | Email of initial administrator seeded into the database on first run. |
| `ADMIN_NAME` | No | `"System Administrator"` | Display name for the initial administrator. |
| `ADMIN_PASSWORD` | Yes | `Admin@DailyBuild2026!` | Initial password for the administrator account. Change immediately upon first login. |
| `UPLOAD_DIR` | No | `./uploads` | Local filesystem directory path for storing uploaded and generated featured images. |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum allowed upload size in megabytes. |
| `DISABLE_WORKER` | No | `false` | When set to `true`, disables the background worker inside Express (used when running PM2 `dailybuild-worker`). |
| `LOCAL_AGENT_SECRET` | No | *(dev default)* | Shared secret token expected in `X-Agent-Secret` header from the desktop `local-agent/`. |
| `EMERGENCY_KILL_SWITCH_ACTIVE` | No | `false` | Global emergency switch. When `true`, prevents all automatic publishing workflows from executing. |
| `WORKFLOW_EXECUTION_TIMEOUT_MS` | No | `120000` | Maximum execution time in milliseconds before a workflow node fails (default: 2 minutes). |
| `CRON_SCHEDULE_FEED_POLLING` | No | `"*/30 * * * *"` | Cron expression for automatic RSS source polling (default: every 30 minutes). |
| `CRON_SCHEDULE_AUTO_PUBLISH` | No | `"0 * * * *"` | Cron expression for scheduled article publishing (default: hourly). |

### AI Provider Keys (`server/.env`)

These keys can be configured via environment variables or entered dynamically in the `/admin/providers` CMS view (where they are securely stored encrypted in the database):

| Variable Name | Required | Provider Description |
| ------------- | :------: | -------------------- |
| `GEMINI_API_KEY` | Recommended | Google Gemini API Key from Google AI Studio. Powers text generation, structured JSON, and Imagen 3. |
| `OPENROUTER_API_KEY` | Recommended | OpenRouter.ai API Key. Aggregator for 300+ models (Claude 3.7, Grok-2, DeepSeek, Llama 3). |
| `OPENAI_API_KEY` | Optional | OpenAI API Key for direct GPT-4o, GPT-4o-mini, and DALL-E endpoints. |
| `GROQ_API_KEY` | Optional | Groq Cloud API Key for ultra-fast Llama 3.3 and Mixtral inference. |
| `OLLAMA_BASE_URL` | Optional | Host URL for self-hosted Ollama (default: `http://localhost:11434`). |
| `XAI_GROK_API_KEY` | Optional | Standalone xAI Grok API key. |
| `ANTHROPIC_API_KEY` | Optional | Standalone Anthropic Claude API key. |
| `TGPT_PATH` | Optional | Explicit filesystem path to local `tgpt` CLI binary. |
| `AGY_PATH` | Optional | Explicit filesystem path to local Google Antigravity `agy` CLI binary. |
| `CLICHAT_REPO_PATH` | Optional | Explicit filesystem path to local `clichat` repository clone. |

### Google Search Console & Analytics (`server/.env`)

| Variable Name | Required | Description |
| ------------- | :------: | ----------- |
| `GOOGLE_PAGESPEED_API_KEY` | Optional | Google Cloud API Key with PageSpeed Insights API enabled. (Falls back to `GEMINI_API_KEY` if omitted). |
| `GOOGLE_CLIENT_ID` | Optional | OAuth 2.0 Web Application Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | Optional | OAuth 2.0 Web Application Client Secret. |
| `GOOGLE_OAUTH_REDIRECT_URI` | Optional | OAuth 2.0 authorized redirect URI (`https://blogs.dailybuild.tech/api/sites/gsc/oauth-callback`). |

---

## 2. Client Environment Variables (`client/.env`)

| Variable Name | Required | Default Value | Description |
| ------------- | :------: | ------------- | ----------- |
| `PORT` | No | `4444` | Port for standalone client SSR Express server (`server.js`). |
| `APP_URL` | No | `https://blogs.dailybuild.tech` | Public canonical URL for meta tags. |
| `API_TARGET` | No | `http://localhost:4000` | Target URL for reverse proxying `/api` and `/uploads` requests during SSR. |
| `VITE_API_BASE_URL` | No | `http://localhost:4000/api` | API Base URL baked into client bundle during Vite compilation. |

---

## 3. Local Desktop Agent Environment Variables (`local-agent/.env`)

| Variable Name | Required | Default Value | Description |
| ------------- | :------: | ------------- | ----------- |
| `PORT` | Yes | `4500` | Port for the local agent webhook listener. Expose to internet via ngrok: `ngrok http 4500`. |
| `SERVER_URL` | Yes | `http://localhost:4000` | URL of the central Daily Build Blogs backend server. |
| `AGENT_SECRET` | **YES** | `your_secure_agent_secret_here` | Must match `LOCAL_AGENT_SECRET` on the server. |
| `WORKER_NAME` | No | `Local-Worker-01` | Human-readable label for this worker displayed in the Admin Dashboard. |
| `PROFILE_DIR` | No | `./chatgpt-profile` | Persistent directory for Chromium browser cookies and ChatGPT session storage. |
| `HEADLESS` | No | `false` | Set to `false` to show visible browser window, or `true` for headless execution. |
| `POLL_INTERVAL_MS` | No | `5000` | Backup polling interval in milliseconds to check for pending image generation jobs. |

---

## 4. Key Generation Quick Reference

Generate strong random secrets on Unix/Linux/macOS:

```bash
# Generate 32-byte JWT secret
openssl rand -hex 32

# Generate 32-byte AES-256-GCM Master Key (MUST be exactly 64 hex characters)
openssl rand -hex 32

# Generate random agent secret token
openssl rand -base64 24
```
