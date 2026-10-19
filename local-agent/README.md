# Daily Build Blogs - Local AI Automation Agent

This lightweight agent runs continuously on your laptop to automate **16:9 widescreen featured image generation** using ChatGPT and syncs directly back to the Daily Build Blogs platform.

---

### Features
- **Dual-Mode Dispatch**:
  1. **Public Webhook**: Receives instant notifications from the server via ngrok (`POST /webhook/generate-image`).
  2. **Backup Server Polling**: Automatically checks the server job queue every 5 seconds, ensuring jobs are never lost even if ngrok disconnects or changes.
- **Automated ChatGPT Interaction**:
  - Automatically launches Chromium with a persistent browser profile (`./chatgpt-profile`).
  - Verifies your ChatGPT session.
  - Submits personalized 16:9 editorial prompts based on article title, excerpt, and category.
  - Monitors generation progress, downloads the resulting 16:9 image asset, and uploads it via authenticated API.
- **Auto-Sync & Publishing**:
  - Automatically associates the image with the article, saves it to `/uploads/`, and publishes the article when conditions are met.

---

### Setup Instructions

1. **Navigate to the agent directory**:
   ```bash
   cd local-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure your `.env`**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - Ensure `AGENT_SECRET` matches the **Secret Token** shown in the Daily Build Admin Dashboard under **Local AI Agent**.
   - Ensure `SERVER_URL` points to your backend (default `http://localhost:5000`).

4. **Start your ngrok tunnel**:
   In a separate terminal:
   ```bash
   ngrok http 4500
   ```
   Copy the generated HTTPS URL (e.g. `https://xxxx.ngrok-free.app`).

5. **Configure Webhook URL in Admin Dashboard**:
   - Go to **Admin Dashboard -> Local AI Agent**.
   - Paste `https://xxxx.ngrok-free.app/webhook/generate-image`.
   - Click **Test Webhook Ping** to verify connectivity.

6. **Start the Agent**:
   ```bash
   npm start
   ```

7. **One-Time ChatGPT Sign-In**:
   On first start, Chromium will open to `https://chatgpt.com`. Log into your ChatGPT account once. Your login cookies are safely persisted in `./chatgpt-profile`.
