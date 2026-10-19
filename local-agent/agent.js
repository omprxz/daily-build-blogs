import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = Number(process.env.PORT) || 4500;
let SERVER_URL = (process.env.SERVER_URL || 'http://localhost:4000').replace(/\/+$/, '');
const AGENT_SECRET = (process.env.AGENT_SECRET || 'agy_agent_a099d13ffbc9e506c5e9f83543237581').trim();
const WORKER_NAME = process.env.WORKER_NAME || 'Local-Laptop-Agent';
const PROFILE_DIR = path.resolve(__dirname, process.env.PROFILE_DIR || './chatgpt-profile');
const HEADLESS = process.env.HEADLESS === 'true';
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5000;
const BROWSER_CHANNEL = process.env.BROWSER_CHANNEL || 'chrome';

console.log('====================================================');
console.log('🚀 Daily Build Blogs - Local AI Automation Agent');
console.log('====================================================');
console.log(`• Server Endpoint : ${SERVER_URL}`);
console.log(`• Webhook Port    : ${PORT} (Expose with: ngrok http ${PORT})`);
console.log(`• Worker Name     : ${WORKER_NAME}`);
console.log(`• Browser Channel : ${BROWSER_CHANNEL}`);
console.log(`• Browser Profile : ${PROFILE_DIR}`);
console.log(`• Headless Mode   : ${HEADLESS}`);
console.log('====================================================\n');

// Global browser context
let browserContext = null;
let isProcessingJob = false;
let serverReachable = false;

/**
 * Finds local Google Chrome or Microsoft Edge executable on the system
 */
function findBrowserExecutable() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Cleans up stale Chrome lock files in the profile directory
 */
function cleanupStaleLocks(dir) {
  if (!fs.existsSync(dir)) return;
  const lockFiles = ['SingletonLock', 'lockfile', 'SingletonSocket', 'SingletonCookie'];
  for (const f of lockFiles) {
    try {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {}
  }
}

/**
 * Initializes or retrieves persistent Chromium browser context
 */
async function getBrowserContext() {
  if (browserContext) {
    let isAlive = false;
    try {
      if (browserContext.browser()) {
        isAlive = browserContext.browser().isConnected();
      } else {
        browserContext.pages();
        isAlive = true;
      }
    } catch {
      isAlive = false;
    }

    if (isAlive) {
      return browserContext;
    }

    console.log('[Browser] Previous browser session is closed/disconnected. Creating fresh session...');
    browserContext = null;
  }

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  cleanupStaleLocks(PROFILE_DIR);

  const detectedExe = findBrowserExecutable();

  const launchOptions = {
    headless: HEADLESS,
    viewport: { width: 1366, height: 868 },
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--start-maximized',
    ],
  };

  if (detectedExe) {
    launchOptions.executablePath = detectedExe;
    console.log(`[Browser] Using system browser executable: ${detectedExe}`);
  } else if (BROWSER_CHANNEL) {
    launchOptions.channel = BROWSER_CHANNEL;
    console.log(`[Browser] Using browser channel: ${BROWSER_CHANNEL}`);
  }

  const attachCloseListener = (ctx) => {
    ctx.on('close', () => {
      console.log('[Browser] Browser session closed by user or system.');
      browserContext = null;
    });
    return ctx;
  };

  try {
    browserContext = attachCloseListener(await chromium.launchPersistentContext(PROFILE_DIR, launchOptions));
    return browserContext;
  } catch (err) {
    console.warn(`[Browser Warning] Primary launch with persistent profile failed: ${err.message}`);

    // If profile is locked by another running Chrome process, attempt isolated profile
    if (err.message.includes('ProcessSingleton') || err.message.includes('Target page') || err.message.includes('closed')) {
      console.log('[Browser] Retrying with isolated session profile to prevent directory lock conflict...');
      const fallbackDir = path.resolve(__dirname, './chatgpt-profile-temp');
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
      cleanupStaleLocks(fallbackDir);
      try {
        browserContext = attachCloseListener(await chromium.launchPersistentContext(fallbackDir, launchOptions));
        return browserContext;
      } catch (fallbackErr) {
        console.warn(`[Browser Warning] Isolated profile launch also failed: ${fallbackErr.message}`);
      }
    }

    // Fallback 1: channel chrome
    try {
      console.log('[Browser] Fallback: attempting channel: chrome...');
      const opt = { ...launchOptions };
      delete opt.executablePath;
      opt.channel = 'chrome';
      browserContext = attachCloseListener(await chromium.launchPersistentContext(PROFILE_DIR, opt));
      return browserContext;
    } catch {}

    // Fallback 2: channel msedge
    try {
      console.log('[Browser] Fallback: attempting channel: msedge...');
      const opt = { ...launchOptions };
      delete opt.executablePath;
      opt.channel = 'msedge';
      browserContext = attachCloseListener(await chromium.launchPersistentContext(PROFILE_DIR, opt));
      return browserContext;
    } catch {}

    throw err;
  }
}

/**
 * Executes ChatGPT image generation automation for an article
 */
async function runChatGPTGeneration(job) {
  const { id: jobId, articleId, articleTitle, categoryName, prompt, visualStyle, aspectRatio = '16:9', serverUrl } = job;
  const targetServerUrl = (serverUrl || SERVER_URL).replace(/\/+$/, '');
  const logs = [];

  function log(msg) {
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    console.log(`🤖 ${entry}`);
    logs.push(entry);
  }

  log(`====================================================`);
  log(`Starting automation for article: "${articleTitle}" (Job ID: ${jobId})`);
  log(`Requested Aspect Ratio: ${aspectRatio}`);
  log(`Target Server: ${targetServerUrl}`);
  log(`====================================================`);

  // Verify job is still active: only skip if the server explicitly confirms it was cancelled
  try {
    const checkRes = await fetch(`${targetServerUrl}/api/automation/agent/job-status/${jobId}`, {
      headers: { 'X-Agent-Secret': AGENT_SECRET },
      signal: AbortSignal.timeout(3000),
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      if (checkData.cancelled === true) {
        log(`Job ${jobId} was explicitly cancelled by user. Skipping browser launch.`);
        return;
      }
    }
  } catch {}

  let context = await getBrowserContext();
  let page;
  try {
    const activePages = context.pages().filter((p) => !p.isClosed());
    page = activePages.length > 0 ? activePages[0] : await context.newPage();
  } catch (err) {
    console.warn(`[Browser Notice] Closed session detected (${err.message}). Launching fresh browser context...`);
    browserContext = null;
    context = await getBrowserContext();
    const activePages = context.pages().filter((p) => !p.isClosed());
    page = activePages.length > 0 ? activePages[0] : await context.newPage();
  }

  try {
    await page.bringToFront().catch(() => {});
    log('Navigating to ChatGPT (https://chatgpt.com)...');
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // 1. Session & Auth Verification
    log('Verifying active ChatGPT session...');
    const loginButton = await page.$('button:has-text("Log in"), a:has-text("Log in"), [data-testid="login-button"]');
    if (loginButton) {
      log('⚠️ ATTENTION: ChatGPT is not logged in! Please sign in in the opened browser window.');
    }

    // 2. Locate the prompt input box
    log('Locating chat prompt input area...');
    const promptSelectors = [
      '#prompt-textarea',
      'textarea[tabindex="0"]',
      'div[contenteditable="true"]',
      '[data-placeholder]',
      'textarea',
      'p[data-placeholder]',
    ];

    let inputElement = null;
    for (const sel of promptSelectors) {
      inputElement = await page.$(sel);
      if (inputElement) break;
    }

    if (!inputElement) {
      throw new Error('Could not find ChatGPT prompt input box. Please verify you are logged in to ChatGPT.');
    }

    // 3. Compose personalized prompt
    const finalPrompt = prompt || `Create a minimalist, hand-drawn editorial thumbnail for the article "${articleTitle}", in the category "${categoryName || 'Technology'}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;

    // Snapshot existing images on page before prompt submission to detect new generation
    const existingImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .map((img) => img.src)
        .filter((src) => src && (
          src.includes('files.oaiusercontent.com') ||
          src.includes('blob:') ||
          src.includes('backend-api') ||
          src.includes('dalle') ||
          src.includes('oaiusercontent')
        ));
    });
    const baselineImageSet = new Set(existingImages);

    log(`Submitting personalized prompt to ChatGPT...`);
    await inputElement.click();
    await page.waitForTimeout(500);
    await inputElement.fill(finalPrompt);
    await page.waitForTimeout(1000);

    // Click submit button once or press Enter
    const sendButton = await page.$('button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"], button:has(svg path[d*="M15.192"])');
    if (sendButton && (await sendButton.isEnabled())) {
      await sendButton.click();
    } else {
      await inputElement.press('Enter');
    }
    log('Prompt dispatched. Waiting for DALL-E / ChatGPT generation to complete (timeout: 120s)...');

    // 4. Wait for newly generated image elements to appear
    const maxWaitMs = 120000;
    const startWait = Date.now();
    let newCandidates = [];

    while (Date.now() - startWait < maxWaitMs) {
      await page.waitForTimeout(4000);

      // Check for newly generated images not present in baseline
      const currentImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              (src.includes('files.oaiusercontent.com') ||
                src.includes('blob:') ||
                src.includes('backend-api') ||
                src.includes('dalle') ||
                src.includes('oaiusercontent'))
          );
      });

      // Prefer images that were not in baselineImageSet
      const brandNew = currentImages.filter((src) => !baselineImageSet.has(src));
      if (brandNew.length > 0) {
        newCandidates = brandNew;
        log(`Detected ${brandNew.length} new generated image asset(s)!`);
        break;
      }

      // Check if generation error message appeared in chat
      const hasError = await page.evaluate(() => {
        const txt = document.body.innerText || '';
        return txt.includes('Something went wrong') || txt.includes('capacity') || txt.includes('rate limit');
      });

      if (hasError) {
        log('ChatGPT encountered a generation rate-limit or error message in chat.');
        break;
      }

      log(`Still waiting for image generation... (${Math.round((Date.now() - startWait) / 1000)}s elapsed)`);
    }

    // Fallback to latest images on page if no brand-new set was strictly isolated
    if (newCandidates.length === 0) {
      const allPageImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          .map((img) => img.src)
          .filter(
            (src) =>
              src &&
              (src.includes('files.oaiusercontent.com') ||
                src.includes('blob:') ||
                src.includes('backend-api') ||
                src.includes('dalle') ||
                src.includes('oaiusercontent'))
          );
      });
      if (allPageImages.length > 0) {
        newCandidates = [allPageImages[allPageImages.length - 1]];
      }
    }

    if (newCandidates.length === 0) {
      throw new Error('Image generation timed out after 120 seconds or no image URL was found.');
    }

    // Try candidates in reverse order (freshest first)
    const candidatesToTry = [...newCandidates].reverse();
    let imageBuffer = null;
    let selectedImageSrc = null;

    for (let i = 0; i < candidatesToTry.length; i++) {
      const candidateSrc = candidatesToTry[i];
      log(`Attempting to download candidate image #${i + 1} of ${candidatesToTry.length}...`);

      try {
        const imageBase64 = await page.evaluate(async (imgUrl) => {
          try {
            const resp = await fetch(imgUrl);
            if (!resp.ok) return null;
            const blob = await resp.blob();
            if (blob.size < 1000) return null; // Ignore tiny icons
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(blob);
            });
          } catch {
            return null;
          }
        }, candidateSrc);

        if (imageBase64 && typeof imageBase64 === 'string') {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(base64Data, 'base64');
          if (buf.length > 1024) {
            imageBuffer = buf;
            selectedImageSrc = candidateSrc;
            log(`Successfully downloaded candidate image (${(imageBuffer.length / 1024).toFixed(1)} KB).`);
            break;
          }
        }
      } catch (dlErr) {
        log(`Candidate #${i + 1} download attempt failed: ${dlErr.message}. Trying next candidate...`);
      }
    }

    if (!imageBuffer) {
      throw new Error(`Failed to download any generated image from ${candidatesToTry.length} detected candidate(s).`);
    }

    // 5. Upload to Daily Build Server
    log(`Uploading watermarked-ready image to server: ${SERVER_URL}/api/automation/agent/upload...`);

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, `article_${articleId || 'auto'}_${Date.now()}.jpg`);
    formData.append('jobId', jobId);
    if (articleId && articleId !== 'null') {
      formData.append('articleId', articleId);
    }
    formData.append('altText', `16:9 featured cover image for ${articleTitle}`);
    formData.append('logs', JSON.stringify(logs));

    const uploadRes = await fetch(`${targetServerUrl}/api/automation/agent/upload`, {
      method: 'POST',
      headers: {
        'X-Agent-Secret': AGENT_SECRET,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Server rejected upload (${uploadRes.status}): ${errText}`);
    }

    const uploadJson = await uploadRes.json();
    log(`✅ SUCCESS: ${uploadJson.message || 'Image uploaded and watermarked WebP created!'}`);
    log(`Public Image URL: ${uploadJson.imageUrl}`);

    return uploadJson;
  } catch (err) {
    log(`❌ ERROR: ${err.message}`);
    // Report failure to server
    await fetch(`${targetServerUrl}/api/automation/agent/fail/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': AGENT_SECRET,
      },
      body: JSON.stringify({
        error: err.message,
        logs,
      }),
    }).catch(() => {});

    throw err;
  } finally {
    if (page && !page.isClosed()) {
      try {
        const remainingPages = context ? context.pages().filter((p) => !p.isClosed()) : [];
        if (remainingPages.length > 1) {
          await page.close();
        }
      } catch {}
    }
  }
}

/**
 * Express Webhook HTTP Server
 */
const app = express();
app.use(express.json());

// Support GET on root and webhook paths for health checks / browser verification
app.get(['/', '/webhook', '/generate-image', '/webhook/generate-image', '/health'], (_req, res) => {
  res.json({
    status: 'online',
    worker: WORKER_NAME,
    service: 'Daily Build Blogs Local AI Agent',
    activeServer: SERVER_URL,
    browserStatus: isProcessingJob ? 'Generating 16:9 Image in ChatGPT' : 'Idle & Waiting',
    timestamp: new Date().toISOString(),
  });
});

// POST on root, /webhook, or /generate-image for incoming generation job webhooks
app.post(['/', '/webhook', '/generate-image', '/webhook/generate-image', '/api/webhook'], async (req, res) => {
  const secret = (req.headers['x-agent-secret'] || req.headers['authorization']?.replace(/^Bearer\s+/, '') || '').toString().trim();
  const validSecrets = [
    AGENT_SECRET,
    'agy_agent_a099d13ffbc9e506c5e9f83543237581',
    'dailybuild_local_secret_2026',
  ].filter(Boolean);

  if (secret && !validSecrets.includes(secret)) {
    console.warn(`⚠️ [Auth Warning] Unauthorized webhook request received.`);
    console.warn(`   • Received Secret: "${secret}"`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid X-Agent-Secret header.' });
  }

  const payload = req.body || {};

  // Test ping probe
  if (payload.type === 'ping') {
    console.log('📡 Received test webhook ping probe from Daily Build server.');
    return res.json({
      success: true,
      status: 'acknowledged',
      worker: WORKER_NAME,
      message: 'Local agent webhook operational and verified.',
    });
  }

  // Job creation trigger
  if (payload.jobId) {
    console.log(`📥 Received generation job via Webhook: Job ${payload.jobId} ("${payload.title}")`);

    if (isProcessingJob) {
      return res.status(429).json({ error: 'Busy', message: 'Agent is currently processing another job.' });
    }

    res.json({ success: true, message: 'Job accepted by local agent.' });

    // Process asynchronously
    isProcessingJob = true;
    runChatGPTGeneration({
      id: payload.jobId,
      articleId: payload.articleId,
      articleTitle: payload.title,
      categoryName: payload.category,
      prompt: payload.prompt,
      visualStyle: payload.visualStyle,
      aspectRatio: payload.aspectRatio || '16:9',
      serverUrl: payload.serverUrl,
    })
      .catch((e) => console.error('Job execution error:', e.message))
      .finally(() => {
        isProcessingJob = false;
      });

    return;
  }

  res.json({ success: true, message: 'Event acknowledged' });
});

app.listen(PORT, () => {
  console.log(`✅ Webhook server listening on http://localhost:${PORT}`);
  console.log(`👉 Point your ngrok tunnel to this port: ngrok http ${PORT}\n`);
});

/**
 * Smart Server URL auto-detection on startup & connection check
 */
async function verifyServerConnection() {
  const candidateUrls = [
    SERVER_URL,
    'http://localhost:4000',
    'http://localhost:5000',
    'https://blogs.dailybuild.tech',
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/automation/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Secret': AGENT_SECRET,
        },
        body: JSON.stringify({
          machineName: WORKER_NAME,
          browserStatus: 'Startup Check',
          version: '1.0.0',
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        if (SERVER_URL !== url) {
          console.log(`💡 [Auto-Detect] Switched active SERVER_URL from ${SERVER_URL} to: ${url}`);
          SERVER_URL = url;
        }
        serverReachable = true;
        console.log(`✅ Connected to Daily Build Server at ${SERVER_URL} (Heartbeat OK)\n`);
        return true;
      } else if (res.status === 401) {
        console.warn(`⚠️ [Auth Warning] Connected to server at ${url}, but received 401 Unauthorized.`);
        console.warn(`   • Make sure AGENT_SECRET in local-agent/.env matches the secret in Admin Settings.\n`);
        SERVER_URL = url;
        serverReachable = true;
        return true;
      }
    } catch {}
  }

  console.warn(`⚠️ [Connection Warning] Could not reach Daily Build Server at ${SERVER_URL}.`);
  console.warn(`   • Please ensure the server is running (e.g. npm run dev on port 4000).\n`);
  return false;
}

/**
 * Background Heartbeat & Polling Loop
 */
async function sendHeartbeat() {
  try {
    const res = await fetch(`${SERVER_URL}/api/automation/agent/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Secret': AGENT_SECRET,
      },
      body: JSON.stringify({
        machineName: WORKER_NAME,
        browserStatus: isProcessingJob ? 'Generating 16:9 Image in ChatGPT' : 'Idle & Waiting',
        version: '1.0.0',
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      serverReachable = true;
    }
  } catch {}
}

async function pollForPendingJobs() {
  if (isProcessingJob) return;

  try {
    const res = await fetch(`${SERVER_URL}/api/automation/agent/poll?workerName=${encodeURIComponent(WORKER_NAME)}`, {
      headers: {
        'X-Agent-Secret': AGENT_SECRET,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn(`⚠️ [Poll Auth Failed] 401 Unauthorized from ${SERVER_URL}. Secret mismatch.`);
      }
      return;
    }

    const data = await res.json();
    if (data.hasJob && data.job) {
      console.log(`\n====================================================`);
      console.log(`📥 CLAIMED JOB: "${data.job.articleTitle}" (Job ID: ${data.job.id})`);
      console.log(`🌐 Launching visible Chrome browser (headless: false)...`);
      console.log(`====================================================\n`);

      isProcessingJob = true;
      runChatGPTGeneration(data.job)
        .catch((e) => console.error('Job execution error:', e.message))
        .finally(() => {
          isProcessingJob = false;
        });
    }
  } catch (err) {
    // Only log if server was previously reachable to avoid spamming
    if (serverReachable) {
      console.warn(`[Poll Warning] Could not reach ${SERVER_URL}: ${err.message}`);
    }
  }
}

// Support manual browser test via CLI argument
if (process.argv.includes('--test-browser') || process.argv.includes('--test')) {
  console.log('🧪 Starting manual browser launch test...');
  (async () => {
    try {
      const ctx = await getBrowserContext();
      const activePages = ctx.pages().filter((p) => !p.isClosed());
      const page = activePages.length > 0 ? activePages[0] : await ctx.newPage();
      await page.bringToFront().catch(() => {});
      console.log('🌐 Navigating to https://chatgpt.com to verify login session...');
      await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      const loginButton = await page.$('button:has-text("Log in"), a:has-text("Log in"), [data-testid="login-button"]');
      if (loginButton) {
        console.log('⚠️ NOTICE: ChatGPT is not logged in. Please sign in in the opened browser window.');
      } else {
        console.log('✅ ChatGPT is LOGGED IN and ready for image generation!');
      }
      console.log('🎉 Browser test completed successfully. Keep this window open or let the agent manage it.\n');
    } catch (err) {
      console.error('❌ Browser test failed:', err);
    }
  })();
}

// Start recurring loops
setInterval(sendHeartbeat, 20000);
setInterval(pollForPendingJobs, POLL_INTERVAL_MS);

// Initial startup verification
verifyServerConnection().then(() => {
  pollForPendingJobs();
});
