# AI Providers & Model Discovery Architecture

Daily Build Blogs includes a modular, extensible AI adapter subsystem designed around dynamic discovery rather than brittle hardcoded model lists.

---

## 1. Supported AI Providers

The platform currently includes 8 registered adapters implemented under `server/src/services/ai/`:

| Provider Name | Adapter Slug | Transport Method | Default Models / Capabilities | Free Tier Available? |
| ------------- | ------------ | ---------------- | ----------------------------- | :------------------: |
| **Google Gemini** | `gemini` | Official `@google/genai` SDK | Gemini 2.5 Flash, Gemini 2.0 Pro, Imagen 3 | **Yes** (15 RPM / 1M TPM) |
| **OpenRouter.ai** | `openrouter` | REST API (`/api/v1`) | 300+ models: Claude 3.7 Sonnet, Grok-2, Llama 3.3, DeepSeek-R1 | **Yes** (free models marked with `:free`) |
| **OpenAI** | `openai` | Official OpenAI REST Client | GPT-4o, GPT-4o-mini, o3-mini, DALL-E 3 | Pay-as-you-go |
| **Groq Cloud** | `groq` | OpenAI-compatible REST API | Llama-3.3-70b-versatile, Mixtral-8x7b | **Yes** (ultra-fast free quotas) |
| **Ollama** | `ollama` | Local REST (`:11434`) | Llama 3, Mistral, Qwen, DeepSeek (Local hardware) | **Yes** (100% free / open-source) |
| **Google Antigravity CLI** | `antigravity` | Native CLI binary (`agy`) | Antigravity Flash, Pro, Agent workflows | **Yes** (host agent binary) |
| **OpenAI Codex CLI** | `codex` | Sandboxed CLI binary (`codex`) | Codex reasoning engine | **Yes** (local sandbox mode) |
| **Terminal GPT CLI** | `tgpt` | Standalone CLI binary (`tgpt`) | Keyless AI text generation | **Yes** (zero API key required) |

---

## 2. Dynamic Model Discovery Engine

Traditional CMS platforms hardcode model strings that quickly become obsolete when providers deprecate or release models. Daily Build Blogs uses **live API introspection**:

1. In `/admin/providers`, click **Test Connection** for any provider.
2. The server dispatches a lightweight query to the provider's discovery endpoint (e.g. `GET /v1/models` or `@google/genai` model listing).
3. Models are retrieved with their actual context windows and capabilities:
   - `text`: Natural language text synthesis.
   - `structured_output`: JSON Schema output enforcement.
   - `vision`: Multimodal image comprehension.
   - `tool_calling`: Function calling and agentic tools.
   - `image_generation`: Visual synthesis.
4. Models are stored in the `ai_models` database table and immediately appear in the **AI Content Studio** and **Visual Workflow Builder** dropdowns.

---

## 3. Featured Image Synthesis Pipelines

Daily Build Blogs supports three pathways for synthesizing 16:9 editorial featured thumbnails:

### A. Google Gemini Imagen 3 (Active)
- Uses model `imagen-3.0-generate-002`.
- Formulates high-fidelity editorial visual prompts based on article title, summary, and category.
- Output is routed through `server/src/services/image/featured-watermark.ts`:
  - Composites the official DailyBuild logo in the bottom-right corner with 72% opacity.
  - Converts image buffer to WebP at 85% quality.
  - Saves file to `./uploads/` and links to the article record.

### B. OpenAI DALL-E 3 (Status: Coming Soon)
- Displayed in the Admin CMS as **Coming Soon** with inactive trigger controls pending official rollout.

### C. Local Desktop Automation Agent (`local-agent/`)
- A standalone Node.js service running on an editor's personal computer.
- Uses Playwright Chromium with persistent session cookies (`./chatgpt-profile`).
- Receives jobs via webhook or polling, generates 16:9 images via ChatGPT, downloads the asset, and uploads it to the backend media storage.

---

## 4. API Key Security & Storage

- All API keys entered in the Admin Dashboard are encrypted using **AES-256-GCM** before saving to PostgreSQL.
- Keys are never logged to console or sent back to the browser in plaintext (the UI only displays masked strings, e.g. `sk-••••••••`).
- Environment variables (`GEMINI_API_KEY`, etc.) act as base fallbacks if no database key is saved.

---

## 5. Adding a Custom AI Provider Adapter

To add a new AI provider:
1. Create `server/src/services/ai/my-provider.ts` implementing `AIProviderAdapter`.
2. Register the adapter in `server/src/services/ai/provider-registry.ts`:
   ```typescript
   import { MyProviderAdapter } from './my-provider.js';
   this.register(new MyProviderAdapter());
   ```
3. Run migrations or seeds to insert the provider row into `ai_providers`.
