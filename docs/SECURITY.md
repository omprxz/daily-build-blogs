# Security Architecture & Hardening Guide

This document provides a comprehensive security review and architectural guide for administrators and security engineers deploying **Daily Build Blogs**.

---

## 1. Threat Model & Trust Boundaries

```
[Untrusted Internet / Public Web]
         │ (HTTP/HTTPS)
         ▼
[Nginx Edge Reverse Proxy] (TLS Termination, Rate Caching, Header Hardening)
         │ (Localhost HTTP :4000)
         ▼
[Express.js Application Layer]
   ├── Helmet & Rate Limiter
   ├── Public SSR Router (Read-only, sanitized HTML)
   ├── Protected API Router (JWT Auth, Role Verification)
   ├── Input Sanitization (sanitize-html, Zod)
   └── Cryptographic Core (AES-256-GCM, bcrypt)
         │
         ▼
[PostgreSQL Database] (Encrypted credentials at rest, parameterized queries)
```

### Trust Zones
1. **Public Zone (Untrusted):** Anonymous site visitors, RSS consumers, and public search engine crawlers.
2. **Authenticated Admin Zone:** Authenticated administrators possessing valid JWT session tokens.
3. **Local Image Automation Bridge:** Model Context Protocol (Streamable HTTP `/mcp`) or authenticated secret token (`X-Agent-Secret`).
4. **Data Persistence Zone:** PostgreSQL database and server uploads filesystem.

---

## 2. Cryptographic Implementation Details

### A. AES-256-GCM API Key Encryption at Rest
All external AI provider API keys saved through the administration dashboard are encrypted before database insertion:
- **Algorithm:** AES-256-GCM (`server/src/utils/security.ts`)
- **Key Requirement:** Exactly 32 bytes (64 hex characters) supplied via `ENCRYPTION_MASTER_KEY`.
- **Initialization Vector (IV):** Cryptographically random 12-byte IV generated uniquely per encryption operation via `crypto.randomBytes(12)`.
- **Authentication Tag:** 16-byte GCM authentication tag appended to ciphertext to detect tampering.
- **Storage Format:** `${iv.hex}:${tag.hex}:${ciphertext.hex}`.

### B. Password Hashing
- **Algorithm:** bcrypt (`bcryptjs`)
- **Cost Factor:** 10 salt rounds.
- **Protection:** Protects against offline dictionary and rainbow table attacks.

### C. JWT Session Authentication
- **Algorithm:** HMAC-SHA256 (`jsonwebtoken`)
- **Secret:** `JWT_SECRET` (minimum 32 random characters).
- **Transport:** HTTP-only, SameSite cookies in production (`secure: true` on HTTPS).

---

## 3. Defense-in-Depth Protections

### A. Injection Prevention (SQLi & NoSQLi)
- **Parameterized Queries:** All database queries utilize **Drizzle ORM** with native query parameters. String concatenation into SQL queries is strictly prohibited.
- **Type Safety:** TypeScript types enforce schema constraints at compile time.

### B. Cross-Site Scripting (XSS) Prevention
- **HTML Sanitization:** Article content, summaries, and incoming RSS feeds pass through `sanitize-html` (`server/src/services/research/rss.ts` and `server/src/routes/articles.ts`).
- **Tag Whitelisting:** Permitted tags include standard article elements (`<p>`, `<h1>`-`<h6>`, `<blockquote>`, `<code>`, `<pre>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<img>`, `<table>`). Scripts, iframes, inline event handlers (`onclick`), and object embeddings are stripped.
- **SSR Escaping:** All metadata injected into `<head>` (`<title>`, `<meta>`, Schema.org JSON-LD) is sanitized through `escapeHtml()` in `server/src/ssr.ts`.

### C. Denial of Service & Abuse Mitigation
- **Rate Limiting:** `express-rate-limit` enforces a threshold of 100 requests per 15-minute window on `/api/*` endpoints.
- **Request Size Limiting:** Express body parser enforces maximum JSON payload sizes (10 MB). File uploads via `multer` enforce file size caps (`MAX_FILE_SIZE_MB`).

---

## 4. Key Pre-Release Security Checklist for Administrators

Before exposing an instance to the public internet, administrators must complete the following:

- [ ] **Generate Unique Secrets:** Replace all default values for `JWT_SECRET`, `SESSION_SECRET`, and `ENCRYPTION_MASTER_KEY` in `server/.env`.
- [ ] **Configure Local Image Automation:** Secure your local image MCP server endpoint and replace `LOCAL_AGENT_SECRET` with a secure random token if legacy webhooks are used.
- [ ] **Change Initial Admin Password:** Log into `/admin` and change the default password immediately.
- [ ] **Enforce TLS/HTTPS:** Ensure Nginx is configured with Let's Encrypt and redirects all port 80 traffic to port 4443.
- [ ] **Lock Down PostgreSQL:** Ensure PostgreSQL listens strictly on `127.0.0.1` and is not exposed to external interfaces.
- [ ] **Configure VPS Firewall:** Verify that `ufw` only allows ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).
- [ ] **Verify Emergency Kill Switch:** Test the Emergency Kill Switch in the Admin CMS to confirm it immediately pauses automatic publishing.
