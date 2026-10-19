# Security Policy

Daily Build Blogs takes platform security, data integrity, and responsible AI utilization seriously.

## Supported Versions

Only the latest release on the primary branch receives active security patches.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have discovered a vulnerability, follow responsible disclosure:

1. Send an email to **[contact@dailybuild.tech](mailto:contact@dailybuild.tech)** with the subject line:  
   `[SECURITY VULNERABILITY] Daily Build Blogs - <Component>`
2. Include:
   - A detailed description of the vulnerability.
   - Proof-of-concept (PoC) code or step-by-step reproduction instructions.
   - Potential impact and affected versions.
   - Any suggested mitigations.
3. The maintainers will acknowledge receipt within 48 business hours and provide a timeline for triage and remediation.
4. We request that you maintain confidentiality until an official security release is published.

## Architectural Security Measures

Daily Build Blogs incorporates several defense-in-depth measures:

### 1. API Key Encryption at Rest
All external AI provider API keys saved through the `/admin` CMS are encrypted at rest using **AES-256-GCM** before database insertion (`server/src/utils/security.ts`). Keys are decrypted only in memory when invoking model endpoints. The encryption master key (`ENCRYPTION_MASTER_KEY`) must be configured as a 64-character hex string in production.

### 2. Password Hashing & Authentication
Administrator passwords are encrypted using **bcryptjs** with 10 salt rounds. Authentication sessions are secured via JSON Web Tokens (JWT) signed with `JWT_SECRET`. Tokens are transported via HTTP-only, SameSite cookies in production with optional Bearer token fallback for API clients.

### 3. SQL Injection Prevention
All database queries are executed using **Drizzle ORM** and the `node-postgres` driver with strictly parameterized queries and typed schema definitions. Raw SQL strings are never concatenated with untrusted inputs.

### 4. Input Sanitization & XSS Defense
Article content, excerpts, and syndicated RSS feed bodies are sanitized using **`sanitize-html`** with strict tag and attribute whitelists (`server/src/services/research/rss.ts` and `server/src/routes/articles.ts`). React SSR escaping is enforced across all dynamic HTML injections.

### 5. Rate Limiting & Denial of Service Protection
Global API endpoints are protected by `express-rate-limit` (100 requests per 15 minutes by default). Public website endpoints are cached and proxied through Nginx with HTTP/2 and static asset caching.

### 6. Local Agent Secret Token Authentication
The standalone desktop agent (`local-agent/`) authenticates all webhook invocations and job polling requests via a shared secret header (`X-Agent-Secret`).
> [!IMPORTANT]
> The `LOCAL_AGENT_SECRET` or `AGENT_SECRET` environment variable **must** be explicitly defined with a cryptographically random secret in production. Do not rely on dev default fallback tokens.

### 7. Emergency Publishing Kill Switch
An instant global toggle is exposed in the Admin CMS and API (`/api/settings/kill-switch`) to immediately halt all automatic article publishing pipelines platform-wide.

## Disclaimer

This open-source release is provided "as is". Deployment administrators remain responsible for configuring secure VPS firewalls (UFW), enforcing HTTPS certificates via Let's Encrypt, protecting server environment secrets, and auditing automated content before syndication.
