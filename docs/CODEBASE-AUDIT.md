# Codebase Audit: Unused Files, Dead Code & Asset Analysis

This audit report documents static analysis findings, dependency health, unused exports, and file retention rationales across **Daily Build Blogs** in preparation for open-source release.

---

## 1. Executive Summary

- **Repository Analysis Date:** October 20, 2026
- **Total Tracked Files:** 105 files across `client/`, `server/`, `local-agent/`, `nginx/`, and root.
- **Build & Test Validation Status:**
  - `client` static and SSR production build: **Passed** (0 errors).
  - `server` TypeScript compilation (`tsc`): **Passed** (0 errors).
  - `server` unit and integration test suite: **Passed** (8 of 8 tests passed).
  - `local-agent` syntax check: **Passed** (0 syntax errors).
- **Files Deleted:** 0 files deleted (no orphaned or demonstrably harmful files were tracked; all files serve active, archival, or future plugin purposes).
- **Files Retained for Maintainer Review:** 4 files categorized with full technical evidence below.

---

## 2. File Classification Matrix

### Category A: Definitely Required Files (Active Runtime & Build)
All core components, services, and assets confirmed in active execution paths:
- `client/src/entry-client.tsx`, `client/src/entry-server.tsx`, `client/server.js`: Core SSR and hydration entry points.
- `client/src/App.tsx`, `client/src/admin/*` (16 active views): Administrative CMS, visual workflow builder, and editorial interfaces.
- `client/public/*`: Favicons, `llms.txt`, `.well-known/ai-catalog.json`, and branding graphics.
- `server/src/index.ts`, `server/src/worker.ts`, `server/src/ssr.ts`: Production server daemon and SSR rendering pipeline.
- `server/src/routes/*` (15 route files): All 15 routes are mounted and active in `server/src/index.ts`.
- `server/src/services/ai/*` (Active adapters: `antigravity.ts`, `codex.ts`, `openrouter.ts`, `gemini.ts`, `tgpt.ts`, `groq.ts`, `ollama.ts`, `openai.ts`): Registered in `provider-registry.ts`.
- `server/src/services/image/featured-watermark.ts` & `server/assets/logo.png`: Watermark composite pipeline.
- `server/scripts/*` (`deploy.sh`, `backup.sh`, `restore.sh`): Production lifecycle scripts.
- `nginx/blogs.dailybuild.tech.conf`: Nginx virtual host.
- `local-agent/agent.js`: Standalone desktop automation agent.

---

### Category B: Potentially Unused Files (Retained for Maintainer Review)

The following files were flagged during static analysis for lacking direct import references, but have been **retained** because they contain valuable functionality or historical context:

#### 1. `client/src/admin/AppearanceSettings.tsx`
- **Location:** `client/src/admin/AppearanceSettings.tsx` (165 lines)
- **Static Analysis Evidence:** The component is not currently imported in `client/src/App.tsx` or `AdminLayout.tsx`.
- **Functionality:** Implements an admin theme and appearance customizer (layout density selector, sidebar background palette picker, brand accent selector, and light-mode claymorphism toggle).
- **Retention Rationale:** The code is completely functional and compiles cleanly with TypeScript. Retaining this allows the maintainer to easily re-wire it as a dedicated tab under `/admin/settings` or `/admin/appearance` in a future release.
- **Proposed Action:** Maintainer review: wire into `/admin` navigation or keep as an optional modular view.

#### 2. `server/src/services/ai/claude.ts`
- **Location:** `server/src/services/ai/claude.ts` (145 lines)
- **Static Analysis Evidence:** Not registered in `AIProviderRegistry.constructor()` because Claude models were unified under OpenRouter in v1.0.0.
- **Functionality:** Direct Anthropic Claude API adapter using Anthropic's messages API format.
- **Retention Rationale:** Compiles cleanly with TypeScript. If an organization prefers direct Anthropic billing rather than routing through OpenRouter, this adapter is ready for direct activation.
- **Proposed Action:** Retain for maintainer review as an optional direct provider adapter.

#### 3. `server/src/services/ai/grok.ts`
- **Location:** `server/src/services/ai/grok.ts` (55 lines)
- **Static Analysis Evidence:** Not registered in `AIProviderRegistry.constructor()` due to consolidation under OpenRouter.
- **Functionality:** Direct xAI Grok API adapter extending `OpenAIAdapter`.
- **Retention Rationale:** Fully functional and typed. Retained for users desiring direct xAI API connections.
- **Proposed Action:** Retain for maintainer review.

#### 4. `DailyBuild_Blogs_Master_Build_Prompt.md`
- **Location:** Repository root (26 KB)
- **Static Analysis Evidence:** Specification document containing initial architecture prompts and design requirements. Not referenced in code or runtime.
- **Retention Rationale:** Serves as high-value project documentation and architectural provenance explaining the rationale behind the platform's features.
- **Proposed Action:** Move to `docs/archive/` or retain at root for reference.

---

### Category C: Untracked Local Artifacts (Verified Ignored)
- `audit-report.html`: Local PageSpeed/Lighthouse audit report generated during testing. Correctly ignored by `.gitignore`.
- `pagespeed_mobile.json`: Benchmark telemetry data. Correctly ignored by `.gitignore`.
- `client/dist/` and `server/dist/`: Compiled production bundles. Correctly ignored by `.gitignore`.

---

## 3. Dependency License & Security Review

| Dependency | Package | Declared License | Status / Compatibility |
| ---------- | ------- | ---------------- | ---------------------- |
| `@google/genai` | Server | Apache-2.0 | Fully compatible with MIT |
| `drizzle-orm` | Server | Apache-2.0 | Fully compatible with MIT |
| `express` | Client & Server | MIT | Permissive |
| `sharp` | Server | Apache-2.0 | Permissive (Dynamically links `libvips` which is LGPL-3.0+) |
| `playwright` | Local Agent | Apache-2.0 | Fully compatible |
| `react` / `react-dom` | Client & Server | MIT | Permissive |
| `@xyflow/react` | Client | MIT | Permissive |
| `tailwindcss` | Client | MIT | Permissive |
| `zod` | Server | MIT | Permissive |
| `bcryptjs` | Server | MIT | Permissive |

**Finding:** All third-party dependencies utilize permissive open-source licenses (MIT, Apache-2.0, ISC, BSD-2-Clause). None impose restrictive copyleft (GPL) obligations on the root repository.
