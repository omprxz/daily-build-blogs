import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { GeminiAdapter } from '../ai/gemini.js';
import { codexAdapter } from '../ai/codex.js';
import { antigravityAdapter } from '../ai/antigravity.js';
import { cliChatService } from './clichat.js';
import { config } from '../../config/index.js';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { decryptApiKey } from '../../utils/security.js';
import { eq } from 'drizzle-orm';
import { processFeaturedImageWatermark } from './featured-watermark.js';
import { mcpImageClient } from './mcp-image-client.js';

export function buildFeaturedImagePrompt(title: string, category: string = 'Technology'): string {
  const safeTitle = (title || 'Technology Innovation').trim();
  const safeCategory = (category || 'Technology').trim();
  return `Create a minimalist, hand-drawn editorial thumbnail for the article "${safeTitle}", in the category "${safeCategory}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;
}

export class ImageService {
  private geminiAdapter = new GeminiAdapter();

  /**
   * Universal output processor for CLI image generation (Codex & Antigravity).
   * Supports:
   * 1. Output containing pure standalone XML SVG markup (<svg>...</svg>)
   * 2. Output containing an existing file path on the filesystem (e.g. /tmp/xyz.png, uploads/xyz.png)
   * 3. Output containing data:image base64 URI
   * 4. Output containing an HTTP/HTTPS image URL
   */
  private generateFallbackSvg(title: string, category: string = 'Technology'): string {
    const escapedTitle = (title || 'Editorial Digest')
      .replace(/[<>&"']/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '"': return '&quot;';
          case "'": return '&apos;';
          default: return c;
        }
      });
    const escapedCategory = (category || 'Technology').toUpperCase().replace(/[<>&"']/g, '');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f1d"/>
      <stop offset="40%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="glowIndigo" cx="25%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCyan" cx="75%" cy="70%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
    </radialGradient>
    <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#334155" stroke-width="0.75" stroke-opacity="0.25"/>
    </pattern>
  </defs>

  <rect width="1600" height="900" fill="url(#bgGrad)"/>
  <rect width="1600" height="900" fill="url(#glowIndigo)"/>
  <rect width="1600" height="900" fill="url(#glowCyan)"/>
  <rect width="1600" height="900" fill="url(#gridPattern)"/>

  <g opacity="0.6">
    <circle cx="1250" cy="380" r="190" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="8 8"/>
    <circle cx="1250" cy="380" r="130" fill="none" stroke="#06b6d4" stroke-width="1.5"/>
    <circle cx="1250" cy="380" r="50" fill="#6366f1" fill-opacity="0.2"/>
    <line x1="980" y1="220" x2="1250" y2="380" stroke="#3b82f6" stroke-width="1.5" stroke-opacity="0.5"/>
    <line x1="1250" y1="380" x2="1460" y2="580" stroke="#06b6d4" stroke-width="1.5" stroke-opacity="0.5"/>
    <line x1="1250" y1="380" x2="1100" y2="620" stroke="#8b5cf6" stroke-width="1.5" stroke-opacity="0.5"/>
    <circle cx="980" cy="220" r="7" fill="#38bdf8"/>
    <circle cx="1460" cy="580" r="8" fill="#06b6d4"/>
    <circle cx="1100" cy="620" r="6" fill="#a855f7"/>
  </g>

  <g transform="translate(120, 270)">
    <rect x="0" y="0" width="180" height="38" rx="19" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="90" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#38bdf8" text-anchor="middle" letter-spacing="2">${escapedCategory}</text>

    <text x="0" y="110" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#f8fafc" letter-spacing="-0.5">
      ${escapedTitle.length > 55 ? escapedTitle.substring(0, 52) + '...' : escapedTitle}
    </text>
    <text x="0" y="165" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">
      Daily Build Tech • Architecture &amp; Engineering Digest
    </text>
  </g>
</svg>`;
  }

  private async generateFallbackPng(targetPath: string, title: string, category: string = 'Technology'): Promise<void> {
    try {
      const escapedTitle = (title || 'Technical Article').replace(/"/g, '\\"').slice(0, 60);
      const escapedCategory = (category || 'Technology').toUpperCase().replace(/"/g, '\\"');
      const pyScript = `
import sys
from PIL import Image, ImageDraw

img = Image.new('RGB', (1600, 900), color=(15, 23, 42))
draw = ImageDraw.Draw(img)

for y in range(900):
    r = int(10 + (y / 900) * 15)
    g = int(15 + (y / 900) * 20)
    b = int(35 + (y / 900) * 35)
    draw.line([(0, y), (1600, y)], fill=(r, g, b))

draw.rectangle([(120, 270), (320, 315)], fill=(30, 41, 59), outline=(56, 189, 248), width=2)
draw.text((140, 282), "${escapedCategory}", fill=(56, 189, 248))
draw.text((120, 370), "${escapedTitle}", fill=(248, 250, 252))
draw.text((120, 440), "Daily Build Tech • Architecture & Engineering Digest", fill=(148, 163, 184))

img.save(r"${targetPath.replace(/\\/g, '\\\\')}", format="PNG")
`;
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(execFile);
      await execAsync('python', ['-c', pyScript]);
    } catch {
      const fallbackPngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      await fs.promises.writeFile(targetPath, Buffer.from(fallbackPngB64, 'base64'));
    }
  }

  private async processVisualOutput(
    rawOutput: string,
    prefix: string,
    fallbackTitle?: string,
    fallbackCategory?: string
  ): Promise<{ publicUrl: string; format: string }> {
    const uploadDir = config.storage.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const text = rawOutput.trim();

    // 1. Check for local file path in output lines
    const lines = text.split('\n').map((l) => l.trim().replace(/^['"`]|['"`]$/g, ''));
    for (const line of lines) {
      const extMatch = line.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
      if (extMatch) {
        const candidate = line.replace(/^file:\/\//, '').trim();
        if (fs.existsSync(candidate)) {
          const wm = await processFeaturedImageWatermark(candidate, { prefix, deleteSource: false });
          return { publicUrl: wm.publicUrl, format: 'webp' };
        }
      }
    }

    // 2. Check for regex file path pattern inside output text
    const pathRegex = /(?:[a-zA-Z]:[\\\/]|\/|\.\/)[^\r\n"'`*?<>|]+\.(png|jpe?g|webp|gif)/gi;
    let match;
    while ((match = pathRegex.exec(text)) !== null) {
      const candidate = match[0].replace(/^file:\/\//, '').trim();
      if (fs.existsSync(candidate)) {
        const wm = await processFeaturedImageWatermark(candidate, { prefix, deleteSource: false });
        return { publicUrl: wm.publicUrl, format: 'webp' };
      }
    }

    // 3. Check for data URI (base64 image)
    const dataUriMatch = text.match(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)/i);
    if (dataUriMatch) {
      const wm = await processFeaturedImageWatermark(Buffer.from(dataUriMatch[2], 'base64'), { prefix });
      return { publicUrl: wm.publicUrl, format: 'webp' };
    }

    // 4. Check for pure SVG markup in output if present
    const startIdx = text.indexOf('<svg');
    const endIdx = text.lastIndexOf('</svg>');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const svgMarkup = text.substring(startIdx, endIdx + 6);
      const wm = await processFeaturedImageWatermark(Buffer.from(svgMarkup), { prefix });
      return { publicUrl: wm.publicUrl, format: 'webp' };
    }

    // 5. Check for HTTP / HTTPS image URL
    const httpMatch = text.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp)(?:\?[^\s"'<>]*)?/i);
    if (httpMatch) {
      try {
        const res = await fetch(httpMatch[0]);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          const wm = await processFeaturedImageWatermark(Buffer.from(arr), { prefix });
          return { publicUrl: wm.publicUrl, format: 'webp' };
        }
      } catch {}
      return { publicUrl: httpMatch[0], format: 'url' };
    }

    // 6. Robust Fallback: Synthesize editorial graphic, watermark with Daily Build logo, convert to WebP
    console.warn(`[Visual Asset Synthesis Notice] Raw output did not contain explicit image/file path. Generating editorial fallback WebP graphic. Output snippet: ${text.slice(0, 150)}`);
    const tempFilename = `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const tempPath = path.join(uploadDir, tempFilename);
    await this.generateFallbackPng(tempPath, fallbackTitle || 'Daily Build Tech Digest', fallbackCategory || 'Technology');
    const wm = await processFeaturedImageWatermark(tempPath, { prefix, deleteSource: true });
    return { publicUrl: wm.publicUrl, format: 'webp' };
  }

  async generateFeaturedImage(params: {
    topic: string;
    title: string;
    category?: string;
    visualStyle?: string;
    modelId?: string;
    articleId?: string;
    provider?: string;
    customPrompt?: string;
    content?: string;
  }): Promise<{ imageUrl: string; altText: string; prompt: string; providerSlug: string; modelId: string; logs?: string[] }> {
    let { topic, title, category, visualStyle, modelId, articleId, provider, customPrompt, content } = params;

    let existingArticle: any = null;
    // If articleId is provided, pull existing article content from database if not supplied
    if (articleId) {
      try {
        existingArticle = await db.query.articles.findFirst({
          where: eq(schema.articles.id, articleId),
        });
        if (existingArticle) {
          title = title || existingArticle.title;
          topic = topic || existingArticle.excerpt || existingArticle.title;
          content = content || existingArticle.contentHtml || '';
        }
      } catch (err: any) {
        console.warn('[ImageService] Article lookup error:', err.message);
      }
    }

    const titleClean = (title || existingArticle?.title || 'Technology Innovation').trim();
    const catClean = (category || (existingArticle?.category as any)?.name || 'Technology').trim();
    const styleDesc = visualStyle || 'Minimalist hand-drawn editorial illustration';

    // Prioritize existing customPrompt; otherwise build using standard minimalist hand-drawn editorial prompt
    const visualPrompt = customPrompt?.trim() || buildFeaturedImagePrompt(titleClean, catClean);

    // 0. Local ChatGPT via MCP Server (/mcp)
    if (provider === 'mcp' || provider === 'chatgpt_mcp' || provider === 'local_agent') {
      const logs: string[] = [
        `[${new Date().toLocaleTimeString()}] Initializing MCP image generation for: "${titleClean}"`,
      ];
      try {
        const mcpRes = await mcpImageClient.generateImage({
          prompt: visualPrompt,
          articleId,
        });

        const publicUrl = mcpRes.imageUrl;
        const altText = `Conceptual editorial illustration for ${titleClean} generated via MCP`;

        try {
          await db.insert(schema.generatedImages).values({
            articleId: articleId || null,
            prompt: visualPrompt,
            imageUrl: publicUrl,
            altText,
            providerSlug: 'mcp',
            modelId: modelId || 'chatgpt-dalle-mcp',
            status: 'completed',
            metadataJson: {
              prompt: visualPrompt,
              style: styleDesc,
              originalUrl: mcpRes.originalImageUrl,
              requestId: mcpRes.requestId,
              durationMs: mcpRes.durationMs,
              provider: 'mcp-chatgpt',
              format: 'webp',
            },
          });
        } catch (dbErr: any) {
          console.warn(`[MCP Image DB Record Warning]: ${dbErr.message}`);
        }

        logs.push(...mcpRes.logs);
        return {
          imageUrl: publicUrl,
          altText,
          prompt: visualPrompt,
          providerSlug: 'mcp',
          modelId: modelId || 'chatgpt-dalle-mcp',
          logs,
        };
      } catch (mcpErr: any) {
        if (provider === 'mcp' || provider === 'chatgpt_mcp') {
          throw mcpErr;
        }
        console.warn(`[MCP Image Synthesis Notice]: ${mcpErr.message}. Falling through...`);
      }
    }

    // 1. Codex CLI: image generation — save the generated image in PNG/JPG format
    // Template: codex exec --sandbox workspace-write --skip-git-repo-check -
    if (provider === 'codex') {
      const logs: string[] = [
        `[${new Date().toLocaleTimeString()}] Initializing OpenAI Codex visual synthesis for: "${title}"`,
        `[${new Date().toLocaleTimeString()}] Command: codex exec --sandbox workspace-write --skip-git-repo-check -`,
      ];

      // Ensure designated image-storage directory exists
      if (!fs.existsSync(config.storage.uploadDir)) {
        fs.mkdirSync(config.storage.uploadDir, { recursive: true });
      }

      const filename = `gen_codex_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const outputImagePath = path.resolve(config.storage.uploadDir, filename);

      try {
        await codexAdapter.generateImage(visualPrompt, outputImagePath);
      } catch (cErr: any) {
        // When Codex is selected, use it exclusively without silently falling back to other providers
        throw new Error(`[OpenAI Codex CLI] Image generation failed: ${cErr.message}`);
      }

      if (!fs.existsSync(outputImagePath)) {
        await this.generateFallbackPng(outputImagePath, title, category);
      }

      // Apply Daily Build micro watermark and convert to WebP (quality 85)
      const wmRes = await processFeaturedImageWatermark(outputImagePath, {
        prefix: 'codex',
        deleteSource: true,
      });
      const publicUrl = wmRes.publicUrl;
      const ext = 'webp';
      const altText = `Conceptual editorial illustration for ${title} generated by Codex`;

      try {
        await db.insert(schema.generatedImages).values({
          articleId: articleId || null,
          prompt: visualPrompt,
          imageUrl: publicUrl,
          altText,
          providerSlug: 'codex',
          modelId: modelId || 'gpt-6-luna',
          status: 'completed',
          metadataJson: { prompt: visualPrompt, style: styleDesc, format: ext, provider: 'codex' },
        });
      } catch (dbErr: any) {
        console.warn(`[Codex Image DB Record Warning]: ${dbErr.message}`);
      }

      logs.push(`[${new Date().toLocaleTimeString()}] Visual asset synthesized and stored at: ${publicUrl}`);
      return {
        imageUrl: publicUrl,
        altText,
        prompt: visualPrompt,
        providerSlug: 'codex',
        modelId: modelId || 'gpt-6-luna',
        logs,
      };
    }

    // 2. CliChat / ChatGPT CLI Method
    if (provider === 'clichat' || provider === 'chatgpt' || provider === 'catgpt' || provider === 'headless-chatgpt') {
      return await cliChatService.generateFeaturedImage({
        topic,
        title,
        category,
        visualStyle,
        articleId,
        modelId,
        customPrompt: visualPrompt,
        content,
      });
    }

    // 3. Google Antigravity CLI (agy) Method: agy -p {prompt}
    if (provider === 'antigravity' || provider === 'agy') {
      const logs: string[] = [
        `[${new Date().toLocaleTimeString()}] Initializing Google Antigravity CLI (agy) visual synthesis for: "${title}"`,
        `[${new Date().toLocaleTimeString()}] Command: agy -p {prompt}`,
      ];

      let rawOutput = '';
      try {
        const agyRes = await antigravityAdapter.generateImage(
          visualPrompt,
          modelId && modelId.startsWith('gemini-') ? modelId : 'gemini-3.8-flash'
        );
        rawOutput = agyRes.content || '';
      } catch (agyErr: any) {
        throw new Error(`[Google Antigravity CLI (agy)] Image generation failed: ${agyErr.message}`);
      }

      const { publicUrl, format } = await this.processVisualOutput(rawOutput, 'agy', title, category);
      const altText = `Conceptual editorial illustration for ${title} generated by Antigravity CLI`;

      try {
        await db.insert(schema.generatedImages).values({
          articleId: articleId || null,
          prompt: visualPrompt,
          imageUrl: publicUrl,
          altText,
          providerSlug: 'antigravity',
          modelId: modelId || 'gemini-3.8-flash',
          status: 'completed',
          metadataJson: { prompt: visualPrompt, style: styleDesc, format, provider: 'antigravity' },
        });
      } catch (dbErr: any) {
        console.warn(`[Antigravity Image DB Record Warning]: ${dbErr.message}`);
      }

      logs.push(`[${new Date().toLocaleTimeString()}] Visual asset synthesized and stored at: ${publicUrl}`);
      return {
        imageUrl: publicUrl,
        altText,
        prompt: visualPrompt,
        providerSlug: 'antigravity',
        modelId: modelId || 'gemini-3.8-flash',
        logs,
      };
    }

    // 4. Gemini (Imagen variants & Flash models)
    const geminiProvider = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, 'gemini')
    });
    const apiKey = geminiProvider?.apiKeyEncrypted ? decryptApiKey(geminiProvider.apiKeyEncrypted) : config.ai.geminiKey;

    const altText = `Conceptual editorial illustration representing ${title}`;
    const targetModel = modelId || 'imagen-3.0-generate-002';

    if (!apiKey) {
      if (provider) {
        throw new Error(`API Key for image provider 'gemini' is not configured. Please add the API key in Admin -> AI Providers.`);
      }
      console.log('[Image Service] No Gemini API key detected. Routing to CliChat CLI...');
      return await cliChatService.generateFeaturedImage({
        topic,
        title,
        category,
        visualStyle,
        articleId,
        modelId,
        customPrompt: visualPrompt,
        content,
      });
    }

    try {
      const result = await this.geminiAdapter.generateImage(visualPrompt, apiKey, targetModel);

      // Ensure upload directory exists
      if (!fs.existsSync(config.storage.uploadDir)) {
        fs.mkdirSync(config.storage.uploadDir, { recursive: true });
      }

      // Process buffer with Daily Build micro watermark and convert to WebP at 85% quality
      const base64Data = result.imageUrl.replace(/^data:image\/[\w+.-]+;base64,/, '');
      const rawBuffer = Buffer.from(base64Data, 'base64');
      const wmRes = await processFeaturedImageWatermark(rawBuffer, { prefix: 'gemini' });
      const publicUrl = wmRes.publicUrl;

      // Save record in generated_images
      await db.insert(schema.generatedImages).values({
        articleId: articleId || null,
        prompt: visualPrompt,
        imageUrl: publicUrl,
        altText,
        providerSlug: 'gemini',
        modelId: targetModel,
        status: 'completed',
        metadataJson: { prompt: visualPrompt, style: styleDesc, originalModel: targetModel, provider: 'gemini', format: 'webp' },
      });

      return {
        imageUrl: publicUrl,
        altText,
        prompt: visualPrompt,
        providerSlug: 'gemini',
        modelId: targetModel,
      };
    } catch (err: any) {
      if (provider) {
        throw new Error(`[gemini] Image generation failed: ${err.message}`);
      }
      console.warn('[Image Generation Notice]: Default image generation failed. Executing fallback...', err.message);
      const fallbackUrl = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80';
      return {
        imageUrl: fallbackUrl,
        altText,
        prompt: `Generation fallback: ${err.message}`,
        providerSlug: 'fallback',
        modelId: 'editorial-preset',
      };
    }
  }
}

export const imageService = new ImageService();
