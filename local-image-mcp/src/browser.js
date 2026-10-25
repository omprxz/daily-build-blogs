import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { config } from "./config.js";

let browserContext = null;
let generationInProgress = false;

function findBrowserExecutable() {
  if (config.chromePath && fs.existsSync(config.chromePath)) return config.chromePath;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || null;
}

export function isGenerationInProgress() {
  return generationInProgress;
}

async function getBrowserContext() {
  if (browserContext) {
    try {
      if (browserContext.browser()?.isConnected()) return browserContext;
    } catch {}
    browserContext = null;
  }

  fs.mkdirSync(config.profileDir, { recursive: true });

  const launchOptions = {
    headless: config.headless,
    acceptDownloads: true,
    viewport: { width: 1366, height: 868 },
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized"
    ]
  };

  const executablePath = findBrowserExecutable();
  if (executablePath) launchOptions.executablePath = executablePath;
  else if (config.browserChannel) launchOptions.channel = config.browserChannel;

  try {
    browserContext = await chromium.launchPersistentContext(config.profileDir, launchOptions);
    browserContext.on("close", () => {
      browserContext = null;
    });
    return browserContext;
  } catch (error) {
    throw new Error(
      `Could not open the configured browser profile "${config.profileDir}". ` +
      `Close the existing Local Agent/Chrome process using this profile, then retry. ` +
      `Original error: ${error.message}`
    );
  }
}

async function findPromptInput(page) {
  const selectors = [
    "#prompt-textarea",
    'textarea[tabindex="0"]',
    'div[contenteditable="true"]',
    "[data-placeholder]",
    "textarea",
    "p[data-placeholder]"
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    try {
      if (await locator.count() && await locator.isVisible()) return locator;
    } catch {}
  }
  return null;
}

async function collectImageSources(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll("img"))
    .map(img => img.currentSrc || img.src)
    .filter(src => src && (
      src.includes("files.oaiusercontent.com") ||
      src.startsWith("blob:") ||
      src.includes("backend-api") ||
      src.includes("dalle") ||
      src.includes("oaiusercontent")
    )));
}

export async function generateImage(prompt, requestId) {
  if (generationInProgress) throw new Error("Another image generation request is already running.");
  generationInProgress = true;

  try {
    fs.mkdirSync(config.generatedDir, { recursive: true });
    const context = await getBrowserContext();
    const pages = context.pages().filter(page => !page.isClosed());
    const page = pages[0] || await context.newPage();

    await page.bringToFront().catch(() => {});
    await page.goto("https://chatgpt.com", {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    await page.waitForTimeout(2500);

    const loginButton = page.locator(
      'button:has-text("Log in"), a:has-text("Log in"), [data-testid="login-button"]'
    ).first();

    if (await loginButton.count()) {
      try {
        if (await loginButton.isVisible()) {
          throw new Error("ChatGPT is not logged in with the configured browser profile. Sign in manually, then retry.");
        }
      } catch (error) {
        if (error.message.includes("not logged in")) throw error;
      }
    }

    const input = await findPromptInput(page);
    if (!input) throw new Error("Could not find ChatGPT prompt input. Verify the profile is logged in.");

    const baseline = new Set(await collectImageSources(page));
    await input.click();
    await input.fill(prompt);
    await page.waitForTimeout(500);

    const sendButton = page.locator(
      'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]'
    ).first();

    if (await sendButton.count() && await sendButton.isEnabled()) {
      await sendButton.click();
    } else {
      await input.press("Enter");
    }

    const start = Date.now();
    let candidates = [];

    while (Date.now() - start < config.generationTimeoutMs) {
      await page.waitForTimeout(2500);
      const current = await collectImageSources(page);
      candidates = current.filter(src => !baseline.has(src));
      if (candidates.length) break;

      const bodyText = await page.locator("body").innerText().catch(() => "");
      if (/something went wrong|rate limit|unable to generate|couldn't generate/i.test(bodyText)) {
        throw new Error("ChatGPT displayed an image-generation error or rate-limit message.");
      }
    }

    if (!candidates.length) {
      throw new Error(`Timed out after ${Math.round(config.generationTimeoutMs / 1000)} seconds waiting for a new image.`);
    }

    let imageBuffer = null;
    let mimeType = "image/png";

    for (const src of [...candidates].reverse()) {
      try {
        const result = await page.evaluate(async source => {
          try {
            const response = await fetch(source);
            if (!response.ok) return null;
            const blob = await response.blob();
            if (blob.size < 1024) return null;
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return { dataUrl, type: blob.type || "image/png" };
          } catch {
            return null;
          }
        }, src);

        if (result?.dataUrl) {
          const match = result.dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
          if (!match) continue;
          const buffer = Buffer.from(match[2], "base64");
          if (buffer.length < 1024) continue;
          imageBuffer = buffer;
          mimeType = match[1];
          break;
        }
      } catch {}
    }

    if (!imageBuffer) throw new Error("Detected a new image but could not download its image data.");

    const extension = mimeType.includes("jpeg") ? "jpg" :
      mimeType.includes("webp") ? "webp" :
      mimeType.includes("gif") ? "gif" : "png";
    const imagePath = path.join(config.generatedDir, `image-${requestId}-${Date.now()}.${extension}`);
    fs.writeFileSync(imagePath, imageBuffer);

    return { imagePath, mimeType, size: imageBuffer.length };
  } finally {
    generationInProgress = false;
  }
}
