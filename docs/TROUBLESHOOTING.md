# Troubleshooting & FAQ

This document provides resolutions for common installation, runtime, database, AI provider, and deployment issues encountered in **Daily Build Blogs**.

---

## 1. Quick Diagnostic Commands

```bash
# Check running PM2 processes and logs
pm2 status
pm2 logs dailybuild-server --lines 50
pm2 logs dailybuild-worker --lines 50

# Check PostgreSQL service status
sudo systemctl status postgresql

# Check Nginx service and error log
sudo nginx -t
sudo tail -n 50 /var/log/nginx/error.log

# Verify port listeners
sudo ss -tulpn | grep -E '4000|4444|4500|5432'
```

---

## 2. Common Issues & Solutions

### A. Database Connection Failure (`ECONNREFUSED 127.0.0.1:5432`)
**Symptoms:** `[Database Notice] PostgreSQL connection failed: connect ECONNREFUSED 127.0.0.1:5432`  
**Root Causes & Solutions:**
1. **PostgreSQL service is stopped:** Start it via `sudo systemctl start postgresql`.
2. **Incorrect credentials in `server/.env`:** Check `DATABASE_URL` format:  
   `postgresql://[user]:[password]@localhost:5432/daily_build_blogs`.
3. **Database does not exist:** Create the database manually:
   ```bash
   sudo -u postgres createdb daily_build_blogs
   ```

---

### B. Database Migration Fails with Extension Notice
**Symptoms:** `function uuid_generate_v4() does not exist`  
**Solution:**
Ensure the `uuid-ossp` extension is enabled in your database:
```sql
psql -U postgres -d daily_build_blogs -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```
The migration script (`npm run db:migrate`) runs this automatically, but requires `CREATE EXTENSION` privileges on PostgreSQL.

---

### C. Sharp / `libvips` Native Module Errors
**Symptoms:** `Error: Could not load the "sharp" module using the linux-x64 runtime`  
**Root Cause:** Sharp bundles platform-specific native binaries. When transferring folders between Windows and Linux without reinstalling node_modules, binaries mismatch.  
**Solution:**
Inside the `server/` directory, force clean installation of platform binaries:
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

---

### D. Duplicate Cron Tasks / Worker Running Twice
**Symptoms:** RSS feeds are polled twice or scheduled articles are published concurrently.  
**Root Cause:**
Both `dailybuild-server` (Express) and `dailybuild-worker` (dedicated background daemon) are running via PM2, and `DISABLE_WORKER` was not set on the server process.  
**Solution:**
In `server/ecosystem.config.cjs`, verify that `dailybuild-server` has `DISABLE_WORKER: 'true'`:
```javascript
{
  name: 'dailybuild-server',
  script: 'dist/index.js',
  env: {
    NODE_ENV: 'production',
    PORT: 4000,
    DISABLE_WORKER: 'true', // Ensures only dailybuild-worker runs cron tasks
  }
}
```

---

### E. AI Provider 429 Quota Exceeded / Rate Limits
**Symptoms:** `AI provider execution failed: 429 Resource has been exhausted`  
**Solutions:**
1. In `/admin/providers`, ensure you have fallback providers enabled (e.g. OpenRouter or Groq).
2. For Gemini free tier, verify your request volume does not exceed 15 RPM.
3. Configure `OLLAMA_BASE_URL` with a local model to serve as a zero-quota fallback.

---

### F. Local Image MCP Server Cannot Connect / Tool Execution Errors
**Symptoms:** `MCP handshake failed`, `Client must accept both application/json and text/event-stream`, or `Image generation failed`  
**Root Causes & Solutions:**
1. **Endpoint Resolution:** Ensure the configured URL in **Admin CMS -> AI Providers & MCP Images** is the base URL or ngrok domain. The backend automatically appends `/mcp` directly after the domain extension (e.g., `https://your-tunnel.ngrok-free.dev` resolves to `https://your-tunnel.ngrok-free.dev/mcp`).
2. **ngrok Tunnel Disconnected:** Ensure ngrok is forwarding port 4580 (`ngrok http 4580`) and the active HTTPS URL is configured in the Admin CMS.
3. **Chrome Profile Locking:** If Chrome fails to launch or reports a profile lock, close any running Chrome instances using that `PROFILE_DIR` before starting the MCP server.
4. **ImgBB API Key:** Ensure `IMGBB_API_KEY` in `local-image-mcp/.env` is valid; the server requires this to host synthesized assets and return URLs to the backend.
5. **Verify Handshake:** Click the **Test MCP** button in the Admin CMS to verify an instant protocol handshake and tool availability.

---

### G. Nginx 502 Bad Gateway
**Symptoms:** Browsing to `https://blogs.dailybuild.tech` returns 502 Bad Gateway.  
**Root Causes & Solutions:**
1. The backend Express server is not running on port 4000. Check `pm2 status`.
2. Check `pm2 logs dailybuild-server` for unhandled crash exceptions.
3. Verify that Nginx proxy pass points to `http://127.0.0.1:4000`.

---

### H. Google Search Console & GA4 OAuth Redirect Mismatch
**Symptoms:** `redirect_uri_mismatch` during Google OAuth login.  
**Solution:**
1. Open Google Cloud Console -> APIs & Services -> Credentials.
2. Under **Authorized redirect URIs**, add:
   `https://blogs.dailybuild.tech/api/sites/gsc/oauth-callback` (replace with your domain).
3. Ensure `GOOGLE_OAUTH_REDIRECT_URI` in `server/.env` exactly matches the URI registered in Google Cloud.

---

### I. Port Conflicts
Default port assignments:
- `4000`: Backend Express.js Server (API & SSR)
- `4444`: Client SSR Express Proxy (Standalone)
- `4580`: Local Image MCP Server & Web Admin (`/mcp`)
- `5173`: Vite Client Development Server
- `5432`: PostgreSQL Database
- `11434`: Ollama Local Model Server

If any port is occupied, specify an alternative port via `.env` in the corresponding directory.
