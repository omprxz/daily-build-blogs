import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { config } from '../../config/index.js';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { decryptApiKey } from '../../utils/security.js';
import { eq } from 'drizzle-orm';
import { processFeaturedImageWatermark } from './featured-watermark.js';

export class CliChatService {
  getRepoDir(): string {
    const customPath = process.env.CLICHAT_REPO_PATH;
    const candidates = [
      customPath,
      path.resolve(process.cwd(), '../clichat-repo'),
      path.resolve(process.cwd(), 'clichat-repo'),
    ].filter(Boolean) as string[];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    return candidates[0] || path.resolve(process.cwd(), 'clichat-repo');
  }

  async getOpenAiApiKey(): Promise<string | undefined> {
    const openaiRecord = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, 'openai'),
    });
    if (openaiRecord?.apiKeyEncrypted) {
      const decrypted = decryptApiKey(openaiRecord.apiKeyEncrypted);
      if (decrypted) return decrypted;
    }
    return config.ai.openaiKey || process.env.OPENAI_API_KEY || undefined;
  }

  /**
   * Execute CliChat (pchchv/clichat) CLI query to generate structured prompts or content
   */
  async runCliChatQuery(prompt: string, modelChoice: '3.5' | '4' = '4', extractOnly: boolean = true): Promise<string> {
    const apiKey = await this.getOpenAiApiKey();
    const args = ['-m', 'clichatgpt'];

    if (apiKey) {
      args.push('--openai-api-key', apiKey);
    }
    args.push('-c', modelChoice);
    if (extractOnly) {
      args.push('-e'); // extract content/json if present
    }
    args.push(prompt);

    if (!apiKey) {
      throw new Error('No OpenAI API key configured for CliChat CLI.');
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timer: NodeJS.Timeout | null = null;

      const child = spawn('python', args, {
        cwd: this.getRepoDir(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          OPENAI_API_KEY: apiKey,
        },
      });

      timer = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {}
        reject(new Error('CliChat CLI process timed out (15s limit reached).'));
      }, 15000);

      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr.trim() || stdout.trim() || `CliChat exited with code ${code}`));
        }
      });

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Generates a high-fidelity image prompt using CliChat, then synthesizes the thumbnail image
   */
  async generateFeaturedImage(params: {
    topic: string;
    title: string;
    category?: string;
    visualStyle?: string;
    modelId?: string;
    articleId?: string;
    customPrompt?: string;
    content?: string;
  }): Promise<{ imageUrl: string; altText: string; prompt: string; providerSlug: string; modelId: string; logs?: string[] }> {
    const { topic, title, category, visualStyle, articleId, modelId, customPrompt, content } = params;

    const style = visualStyle || 'Editorial technology magazine cover illustration, minimalist aesthetic, cinematic lighting, rich indigo and obsidian tones, 8k resolution, zero typography or text overlay.';
    const altText = `Conceptual editorial illustration representing ${title}`;
    const logs: string[] = [
      `[${new Date().toLocaleTimeString()}] Target Headline: "${title}"`,
    ];

    let synthesizedPrompt = customPrompt?.trim() || '';

    // If existing prompt is provided, use it directly without re-querying
    if (!synthesizedPrompt) {
      logs.push(`[${new Date().toLocaleTimeString()}] Formulating visual concept from article content & headline...`);
      const contentSnippet = (content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);

      try {
        const cliQuery = `Describe a single, highly visual, stunning cinematic editorial illustration for a tech article titled "${title}" in the topic "${topic}".${contentSnippet ? ` Key Content: ${contentSnippet}.` : ''} Output only the final prompt description, no conversational filler.`;
        const enrichedPrompt = await this.runCliChatQuery(cliQuery, '4', true).catch(() => null);
        if (enrichedPrompt && enrichedPrompt.length > 20) {
          synthesizedPrompt = `${enrichedPrompt}. Visual Style: ${style}`;
          logs.push(`[${new Date().toLocaleTimeString()}] Synthesized prompt from content: "${synthesizedPrompt.slice(0, 100)}..."`);
        }
      } catch (cliErr: any) {
        logs.push(`[${new Date().toLocaleTimeString()}] Prompt synthesis note: ${cliErr.message}`);
      }

      if (!synthesizedPrompt) {
        synthesizedPrompt = `A modern, striking conceptual technology illustration representing: "${title}". Topic: ${topic}. Category: ${category || 'Technology'}. Style: ${style}`;
      }
    } else {
      logs.push(`[${new Date().toLocaleTimeString()}] Using existing thumbnail prompt: "${synthesizedPrompt.slice(0, 100)}..."`);
    }

    // 2. Synthesize image using OpenAI DALL-E or Gemini
    const apiKey = await this.getOpenAiApiKey();
    if (apiKey) {
      logs.push(`[${new Date().toLocaleTimeString()}] Synthesizing image with OpenAI DALL-E 3...`);
      const targetModel = modelId || 'dall-e-3';
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          prompt: synthesizedPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      });

      if (response.ok) {
        const json: any = await response.json();
        const b64 = json.data?.[0]?.b64_json;
        if (b64) {
          const wm = await processFeaturedImageWatermark(Buffer.from(b64, 'base64'), { prefix: 'clichat' });
          const publicUrl = wm.publicUrl;

          logs.push(`[${new Date().toLocaleTimeString()}] Thumbnail generated successfully via CliChat OpenAI pipeline.`);

          await db.insert(schema.generatedImages).values({
            articleId: articleId || null,
            prompt: synthesizedPrompt,
            imageUrl: publicUrl,
            altText,
            providerSlug: 'clichat',
            modelId: targetModel,
            status: 'completed',
            metadataJson: { prompt: synthesizedPrompt, style, provider: 'pchchv/clichat', format: 'webp' },
          }).catch(() => {});

          return {
            imageUrl: publicUrl,
            altText,
            prompt: synthesizedPrompt,
            providerSlug: 'clichat',
            modelId: targetModel,
            logs,
          };
        }
      }
    }

    // 3. Fallback: If OpenAI API key is unavailable or quota exceeded, synthesize using Gemini Imagen
    logs.push(`[${new Date().toLocaleTimeString()}] Routing to Gemini Imagen for visual rendering...`);
    const { GeminiAdapter } = await import('../ai/gemini.js');
    const gemini = new GeminiAdapter();
    const geminiRes = await gemini.generateImage(synthesizedPrompt);

    const base64Data = geminiRes.imageUrl.replace(/^data:image\/[\w+.-]+;base64,/, '');
    const wm = await processFeaturedImageWatermark(Buffer.from(base64Data, 'base64'), { prefix: 'clichat_gemini' });
    const publicUrl = wm.publicUrl;

    logs.push(`[${new Date().toLocaleTimeString()}] Rendered thumbnail successfully via Gemini visual backend.`);

    return {
      imageUrl: publicUrl,
      altText,
      prompt: synthesizedPrompt,
      providerSlug: 'clichat',
      modelId: 'imagen-3.0-generate-002',
      logs,
    };
  }
}

export const cliChatService = new CliChatService();
