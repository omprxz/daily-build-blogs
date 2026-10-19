# Daily Build Blogs

> **A Production-Ready, Autonomous AI & Technology News Publishing Platform with True React Server-Side Rendering (SSR), Visual Workflow Orchestration, and Zero-Docker Architecture.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%20%7C%20v22%20LTS-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F.svg)](https://orm.drizzle.team/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF.svg)](https://vitejs.dev/)

**Live Demonstration & Reference Domain:** [https://blogs.dailybuild.tech](https://blogs.dailybuild.tech)

---

## 1. Problem Statement & Intended Users

Modern content publishing platforms often force teams into an unpleasant trade-off: heavyweight, sluggish traditional CMSs that require expensive hosting clusters, or static site generators that lack real-time autonomous research, multi-provider AI synthesis, and interactive admin control.

**Daily Build Blogs** is built for engineering teams, independent technical publishers, media developers, and AI researchers who require:
- An ultra-fast, modern web publication with **100% server-rendered HTML and JSON-LD structured data** for first-class search engine indexing (SEO).
- An autonomous multi-step publishing pipeline that surveys trusted RSS feeds, eliminates duplicate stories, synthesizes technical articles, and generates 16:9 featured artwork.
- Complete visual control through a drag-and-drop workflow canvas (`@xyflow/react`).
- Zero-overhead native execution engineered specifically to thrive on modest bare-metal VPS instances (e.g. 1 vCPU, 4 GB RAM) without Docker resource penalties.

---

## 2. Verified Feature Highlights

- **True React 18 SSR Engine:** Every public article and homepage request generates complete HTML with Schema.org JSON-LD (`NewsArticle`, `BreadcrumbList`, `Organization`), OpenGraph cards, Twitter meta, and hydration state injection.
- **Dynamic AI Model Discovery (Zero Hardcoding):** Dynamically inspects and lists real available models upon connection test across **8 AI providers**:
  - Google Gemini (`@google/genai` official SDK)
  - OpenRouter (Claude 3.7 Sonnet, Grok-2, DeepSeek, Meta Llama 3.3)
  - OpenAI (GPT-4o, GPT-4o-mini, o3-mini)
  - Groq Cloud (Ultra-fast Llama 3.3 / Mixtral inference)
  - Self-hosted Ollama (Local hardware)
  - Google Antigravity CLI (`agy`)
  - OpenAI Codex CLI (`codex`)
  - Terminal GPT CLI (`tgpt`)
- **Visual Workflow Automation Canvas:** Drag-and-drop node orchestration powered by `@xyflow/react` for triggers (Cron, RSS, Manual), AI synthesis (Outline, Article, Thumbnail, SEO), and publishing policies.
- **Automated RSS Research & Deduplication:** Pre-seeded with 10 real-world engineering feeds (Google AI, OpenAI, Anthropic, Hugging Face, GitHub, Mozilla, The Hacker News, Ars Technica, TechCrunch, Google Developers) with SHA-256 normalized deduplication.
- **Featured Image Processing:** Automatic 16:9 editorial artwork synthesis via Gemini Imagen 3, WebP conversion, and subtle bottom-right logo watermarking via **Sharp** (`libvips`).
- **Desktop Automation Agent (`local-agent/`):** Optional background desktop agent using Playwright for browser-assisted 16:9 image generation via ChatGPT.
- **Google Search Console & GA4 Integration:** Built-in OAuth 2.0 integration correlating organic search clicks, impressions, and Core Web Vitals into joint AI performance insight reports.
- **Defense-in-Depth Security:** AES-256-GCM encryption for stored API keys, bcrypt password hashing, JWT sessions, strict HTML sanitization via `sanitize-html`, API rate limiting, and an instant **Emergency Publishing Kill Switch**.

---

## 3. Technology Stack

| Layer | Technologies |
| ----- | ------------ |
| **Frontend** | React 18, TypeScript 5.8, Tailwind CSS, `@xyflow/react` (React Flow), Lucide Icons, Prism.js |
| **Build & Tooling** | Vite 6, PostCSS, Autoprefixer |
| **Backend** | Node.js (v20+ / v22+), Express.js 4, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL 14+ (Connection pool via `pg`) |
| **SSR Engine** | Custom Express HTML template injector (`server/src/ssr.ts`) & React Server DOM (`client/src/entry-server.tsx`) |
| **Image Processing** | Sharp (`libvips`), WebP encoding, alpha watermark compositing |
| **Automation & Jobs** | `node-cron`, custom DAG execution engine, Playwright (`local-agent/`) |
| **Production** | PM2 Process Manager, Nginx HTTP/2 reverse proxy, Let's Encrypt Certbot |

---

## 4. Architecture Overview

```mermaid
graph LR
    User([Public Visitor / Crawler]) -->|HTTPS :443| Nginx[Nginx Reverse Proxy]
    Admin([Editorial Admin]) -->|HTTPS :443| Nginx
    Nginx -->|Proxy Pass :4000| Express[Express.js Server]
    
    subgraph CoreApplication ["Express.js (:4000)"]
        Express --> SSR[React 18 SSR Engine]
        Express --> API[REST API /api/*]
        Express --> Workflows[Visual Workflow Engine]
        Express --> Watermark[Sharp Image Pipeline]
    end

    subgraph BackgroundDaemon ["Worker Daemon (worker.ts)"]
        Cron[node-cron] --> Poller[RSS Feed Poller]
        Cron --> Publisher[Auto-Publisher]
    end

    subgraph DataStorage ["Data & Storage"]
        Postgres[(PostgreSQL)]
        Uploads[Local Media /uploads]
    end

    subgraph AIIntegrations ["AI Services & Agents"]
        Gemini[Google Gemini & Imagen 3]
        OpenRouter[OpenRouter 300+ Models]
        Ollama[Local Ollama]
        Agent[Desktop Agent :4500]
    end

    API --> Postgres
    Poller --> Postgres
    Publisher --> Postgres
    Watermark --> Uploads
    Workflows --> AIIntegrations
    Workflows --> Agent
```

---

## 5. Repository Structure

```text
daily-build-blogs/
├── client/                     # React 18 + Vite Frontend & Admin CMS
│   ├── src/
│   │   ├── admin/              # Admin CMS modules (WorkflowBuilder, Studio, Sites)
│   │   ├── components/         # Shared public UI (Navbar, Footer, ArticleCard)
│   │   ├── layouts/            # PublicLayout and AdminLayout wrappers
│   │   ├── pages/              # Homepage, ArticleDetail, CategoryArchive, Search
│   │   ├── services/           # Typed REST API client
│   │   ├── entry-client.tsx    # Client hydration entry
│   │   └── entry-server.tsx    # Server-side rendering entry point
│   ├── public/                 # Favicons, logo assets, llms.txt, ai-catalog
│   ├── server.js               # Standalone client SSR Express proxy server
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Node.js + Express.js Backend & API
│   ├── src/
│   │   ├── config/             # Environment configuration & validation
│   │   ├── database/           # Drizzle ORM schema, migrations, seed script
│   │   ├── middleware/         # JWT auth, error handler, rate limits
│   │   ├── routes/             # /api/* endpoints (articles, ai, workflows, sites)
│   │   ├── services/           # AI adapters, RSS research, Sharp watermarking
│   │   ├── ssr.ts              # React SSR HTML injector
│   │   ├── index.ts            # Main Express application entry point
│   │   └── worker.ts           # Background cron & RSS polling daemon
│   ├── scripts/                # deploy.sh, backup.sh, restore.sh
│   ├── ecosystem.config.cjs    # PM2 cluster configuration
│   ├── test/                   # Unit and integration test suite
│   ├── package.json
│   └── tsconfig.json
├── local-agent/                # Standalone Desktop AI Automation Agent
│   ├── agent.js                # Playwright automation & webhook daemon
│   ├── README.md               # Local agent setup instructions
│   └── package.json
├── nginx/                      # Production Nginx reverse-proxy configuration
│   └── blogs.dailybuild.tech.conf
├── docs/                       # Comprehensive documentation
│   ├── INSTALLATION.md         # Full setup instructions
│   ├── ARCHITECTURE.md         # System design specifications
│   ├── CONFIGURATION.md        # Environment variables guide
│   ├── AI-PROVIDERS.md         # AI adapters and model discovery
│   ├── DEPLOYMENT.md           # Production VPS guide
│   ├── SECURITY.md             # Security architecture & hardening
│   ├── TROUBLESHOOTING.md      # FAQ & error diagnosis
│   └── CODEBASE-AUDIT.md       # Dead-code analysis & retention evidence
├── .github/                    # Issue & Pull Request templates
├── .editorconfig               # Consistent code formatting rules
├── .gitattributes              # Git line endings & binary attributes
├── .gitignore                  # Git ignore rules
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contributor guidelines
├── CODE_OF_CONDUCT.md          # Contributor Covenant Code of Conduct
├── SECURITY.md                 # Vulnerability reporting protocol
├── CHANGELOG.md                # Release history
└── README.md                   # Project documentation
```

---

## 6. Quickstart & Installation

> [!NOTE]
> This repository uses **independent package management** rather than an npm workspace. Run dependency installations inside `client/` and `server/`.

### Prerequisites
- **Node.js:** `v20+` or `v22+` LTS
- **PostgreSQL:** `v14+` with an active database named `daily_build_blogs`
- **npm:** `v10+`

### 1. Clone & Set Up Environment Files
```bash
git clone https://github.com/omprxz/daily-build-blogs.git
cd daily-build-blogs

cp server/.env.example server/.env
cp client/.env.example client/.env
cp local-agent/.env.example local-agent/.env
```

Edit `server/.env` with your PostgreSQL database credentials and generated secrets:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/daily_build_blogs
JWT_SECRET=use_openssl_rand_hex_32_here
SESSION_SECRET=use_openssl_rand_hex_32_here
ENCRYPTION_MASTER_KEY=use_64_character_hex_master_key_here
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
```

### 2. Install Dependencies
```bash
# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### 3. Initialize Database Migrations & Seeds
```bash
cd server
npm run db:migrate
npm run db:seed
cd ..
```
*This initializes all PostgreSQL tables, creates the initial admin user (`admin@dailybuild.tech`), and seeds 10 verified technology RSS feeds, categories, and AI provider configurations.*

### 4. Start Development Servers

**Terminal 1 (Backend API & SSR):**
```bash
cd server && npm run dev
```
- Server API: `http://localhost:4000`
- Admin CMS: `http://localhost:4000/admin`

**Terminal 2 (Frontend Client Vite with HMR):**
```bash
cd client && npm run dev
```
- Client Live Preview: `http://localhost:5173`

For detailed setup, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## 7. Build, Test & Lint Commands

All commands have been verified in clean execution environments:

| Action | Command | Verification Status |
| ------ | ------- | :-----------------: |
| **Run Test Suite** | `cd server && npm test` | **VERIFIED** (8/8 tests pass) |
| **Build Client & SSR** | `cd client && npm run build:all` | **VERIFIED** (Output to `client/dist/`) |
| **Compile Server** | `cd server && npm run build` | **VERIFIED** (TypeScript compile) |
| **Check Local Agent** | `node --check local-agent/agent.js` | **VERIFIED** (Syntax valid) |

---

## 8. Supported AI Providers & Setup

Configure AI providers via `server/.env` or interactively inside `/admin/providers`:

1. **Google Gemini:** Add `GEMINI_API_KEY`. Provides text analysis, structured JSON summaries, and 16:9 editorial imagery via Imagen 3.
2. **OpenRouter:** Add `OPENROUTER_API_KEY`. Connects to Claude 3.7 Sonnet, Grok-2, DeepSeek-R1, and Meta Llama 3 models.
3. **Groq Cloud:** Add `GROQ_API_KEY`. Delivers ultra-low latency inference for Llama 3.3.
4. **Ollama:** Set `OLLAMA_BASE_URL=http://localhost:11434`. Runs 100% locally with zero external API fees.
5. **CLI Providers:** Supports local `agy` (Google Antigravity), `codex` (OpenAI Codex), and `tgpt` (Terminal GPT) binaries on host systems.

See [docs/AI-PROVIDERS.md](docs/AI-PROVIDERS.md) for detailed provider specifications.

---

## 9. Research, Workflows & Publishing Automation

- **Automated Ingestion:** The background daemon surveys configured RSS feeds according to priority and polling interval. Articles are normalized and deduplicated via SHA-256 hashes of title and canonical URL.
- **Publishing Policies:** Configurable per category:
  - `Draft Only`: Generates drafts in the CMS for editorial review.
  - `Manual Approval`: Ready articles require one-click editor approval.
  - `Automatic Publishing`: Directly publishes new articles to the live site.
- **Emergency Kill Switch:** A global one-click toggle in the admin header immediately halts all automated publishing pipelines platform-wide.

---

## 10. Production Deployment & Process Management

Daily Build Blogs is designed for deployment with **PM2** and **Nginx**:

```bash
# 1. Compile bundles
cd client && npm run build:all && cd ../server && npm run build

# 2. Launch PM2 processes
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 3. Configure Nginx reverse proxy
sudo cp ../nginx/blogs.dailybuild.tech.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/blogs.dailybuild.tech.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d blogs.yourdomain.com
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions and backup configurations.

---

## 11. Screenshots & Demonstration Interface

> *Visual demonstrations of the Daily Build Blogs platform:*

| Public Editorial Article View | Visual Workflow Builder Canvas |
| :----------------------------: | :-----------------------------: |
| ![Public Article View](client/public/logo-light.png) | ![Workflow Builder](client/public/logo-dark.png) |
| *High-speed SSR article rendering with reading progress & dark mode* | *Interactive DAG node orchestration powered by `@xyflow/react`* |

| AI Content Studio & Provider Discovery | Multi-Site Google SEO & Web Vitals Audit |
| :-------------------------------------: | :----------------------------------------: |
| ![AI Studio](client/public/logo-light.png) | ![Sites Audit](client/public/logo-dark.png) |
| *Dynamic model latency verification & prompt synthesis* | *Real-time GSC telemetry & Lighthouse correlation* |

*(High-resolution screenshots and video walk-throughs can be contributed under `docs/assets/`)*

---

## 12. Security & Responsible Use

- **Responsible AI:** Machine-generated articles should undergo editorial oversight. Content generated via autonomous pipelines should adhere to journalistic integrity and truthfulness standards.
- **Key Protection:** Never commit `.env` files or share `ENCRYPTION_MASTER_KEY`.
- **Vulnerability Reporting:** Review our [SECURITY.md](SECURITY.md) for responsible disclosure procedures.

---

## 13. Documentation Index

- [Installation & Quickstart Guide](docs/INSTALLATION.md)
- [System Architecture & Specifications](docs/ARCHITECTURE.md)
- [Configuration & Environment Variables](docs/CONFIGURATION.md)
- [AI Providers & Model Discovery](docs/AI-PROVIDERS.md)
- [Production VPS Deployment](docs/DEPLOYMENT.md)
- [Security Architecture & Hardening](docs/SECURITY.md)
- [Troubleshooting & FAQ](docs/TROUBLESHOOTING.md)
- [Codebase Audit & Retention Analysis](docs/CODEBASE-AUDIT.md)

---

## 14. License & Contributing

- **License:** Licensed under the [MIT License](LICENSE).
- **Contributing:** Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- **Maintainer Contact:** [contact@dailybuild.tech](mailto:contact@dailybuild.tech)
