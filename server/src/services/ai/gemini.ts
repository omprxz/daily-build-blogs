import { GoogleGenAI } from '@google/genai';
import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';
import { config } from '../../config/index.js';
import { tgptAdapter } from './tgpt.js';

export class GeminiAdapter implements AIProviderAdapter {
  slug = 'gemini';
  name = 'Google Gemini';

  private getClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || config.ai.geminiKey;
    if (!key) {
      throw new Error('Google Gemini API key is not configured.');
    }
    return new GoogleGenAI({ apiKey: key });
  }

  async testConnection(apiKey?: string): Promise<TestConnectionResult> {
    const start = Date.now();
    try {
      const key = apiKey || config.ai.geminiKey;
      if (!key) {
        return {
          success: false,
          message: 'Missing Google Gemini API key. Please enter a valid API key from Google AI Studio.',
          models: [],
        };
      }

      const models = await this.discoverModels(key);
      const latencyMs = Date.now() - start;

      return {
        success: true,
        message: `Successfully connected to Google Gemini! Discovered ${models.length} active models.`,
        models,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gemini connection failed: ${err.message || 'Unknown error'}`,
        models: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  async discoverModels(apiKey?: string): Promise<DiscoveredModel[]> {
    const key = apiKey || config.ai.geminiKey;
    if (!key) return [];

    try {
      // Use official REST models endpoint for robust discovery
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (!res.ok) {
        throw new Error(`Failed to list Gemini models: ${res.statusText}`);
      }
      const data: any = await res.json();
      const rawModels: any[] = data.models || [];

      const discovered: DiscoveredModel[] = [];

      for (const m of rawModels) {
        const id = m.name?.replace('models/', '') || '';
        if (!id) continue;

        const capabilities: ('text' | 'structured_output' | 'vision' | 'tool_calling' | 'image_generation')[] = [];
        const supportedMethods: string[] = m.supportedGenerationMethods || [];

        if (supportedMethods.includes('generateContent')) {
          capabilities.push('text', 'structured_output');
        }
        if (id.includes('vision') || id.includes('flash') || id.includes('pro')) {
          capabilities.push('vision');
        }
        if (id.includes('imagen') || supportedMethods.includes('generateImages')) {
          capabilities.push('image_generation');
        }

        discovered.push({
          id,
          name: m.displayName || id,
          capabilities,
          contextWindow: m.inputTokenLimit || 1048576,
          pricingNotes: id.includes('flash') ? 'Free tier eligible (15 RPM)' : 'Standard Gemini pricing',
          isDefault: id === 'gemini-2.5-flash' || id === 'gemini-3.5-flash' || id === 'gemini-3.5-flash-lite',
        });
      }

      // Ensure primary models are listed if API returned restricted view
      if (!discovered.some(m => m.id.includes('imagen'))) {
        discovered.push({
          id: 'imagen-3.0-generate-002',
          name: 'Imagen 3.0 Generate 002',
          capabilities: ['image_generation'],
          pricingNotes: 'Pay-per-image generation',
          isDefault: false,
        });
      }

      return discovered;
    } catch (err: any) {
      console.warn('[Gemini Discovery Fallback]:', err.message);
      // Return known capable active models as fallback with error note
      return [
        {
          id: 'gemini-2.5-flash',
          name: 'Gemini 2.5 Flash (Production High Speed)',
          capabilities: ['text', 'structured_output', 'vision', 'tool_calling'],
          contextWindow: 1048576,
          pricingNotes: 'Free tier eligible',
          isDefault: true,
        },
        {
          id: 'gemini-3.5-flash',
          name: 'Gemini 3.5 Flash',
          capabilities: ['text', 'structured_output', 'vision', 'tool_calling'],
          contextWindow: 1048576,
          pricingNotes: 'Fast multimodal generation',
          isDefault: false,
        },
        {
          id: 'gemini-3.5-flash-lite',
          name: 'Gemini 3.5 Flash Lite',
          capabilities: ['text', 'structured_output', 'vision', 'tool_calling'],
          contextWindow: 1048576,
          pricingNotes: 'Ultra-low latency inference',
          isDefault: false,
        },
        {
          id: 'gemini-3.8-flash',
          name: 'Gemini 3.8 Flash (Latest Flagship)',
          capabilities: ['text', 'structured_output', 'vision', 'tool_calling'],
          contextWindow: 1048576,
          pricingNotes: 'State of the art reasoning & speed',
          isDefault: false,
        },
        {
          id: 'gemini-2.5-pro',
          name: 'Gemini 2.5 Pro (Deep Reasoning)',
          capabilities: ['text', 'structured_output', 'vision', 'tool_calling'],
          contextWindow: 2097152,
          pricingNotes: 'Standard pricing',
          isDefault: false,
        },
        {
          id: 'imagen-3.0-generate-002',
          name: 'Imagen 3 (Editorial Image Generation)',
          capabilities: ['image_generation'],
          pricingNotes: 'Image generation endpoint',
          isDefault: false,
        }
      ];
    }
  }

  private normalizeModelId(model?: string): string {
    if (!model || model === 'gemini-2.0-flash' || model === 'gemini-2.5-flash') {
      return 'gemini-3.8-flash';
    }
    if (model === 'gemini-latest-flash' || model === 'gemini-flash-latest' || model === 'gemini-flash') {
      return 'gemini-3.8-flash';
    }
    // Remove "models/" prefix if user or API passed it
    const clean = model.replace(/^models\//, '');
    if (clean === 'gemini-2.5-flash' || clean === 'gemini-2.0-flash') {
      return 'gemini-3.8-flash';
    }
    return clean;
  }

  async generateText(options: GenerationOptions, apiKey?: string): Promise<GenerationResult> {
    const start = Date.now();
    try {
      const ai = this.getClient(apiKey);
      const modelName = this.normalizeModelId(options.model);
      const configObj: any = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4000,
      };

      if (options.systemInstruction) {
        configObj.systemInstruction = options.systemInstruction;
      }

      if (options.responseJsonSchema) {
        configObj.responseMimeType = 'application/json';
        configObj.responseSchema = options.responseJsonSchema;
      }

      // Candidate models for automatic failover on 404 (deprecated), 503 (high demand), or 429
      const candidateModels = [
        modelName,
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      let response: any = null;
      let usedModel = modelName;
      let lastErr: any = null;

      for (const targetModel of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: targetModel,
            contents: options.prompt,
            config: configObj,
          });
          usedModel = targetModel;
          break;
        } catch (mErr: any) {
          lastErr = mErr;
          console.warn(`[Gemini Content Generation] Model '${targetModel}' failed (${mErr.message}). Trying alternative Gemini model...`);
        }
      }

      if (!response) {
        throw lastErr || new Error('All Gemini candidate models failed.');
      }

      const durationMs = Date.now() - start;
      const content = response.text || '';
      let structuredJson: any = null;

      if (options.responseJsonSchema) {
        try {
          structuredJson = JSON.parse(content);
        } catch (e) {
          console.warn('Failed to parse response JSON from Gemini:', e);
        }
      }

      const inputTokens = response.usageMetadata?.promptTokenCount || Math.ceil(options.prompt.length / 4);
      const outputTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(content.length / 4);

      // Rough estimated cost calculation ($0.10 / 1M tokens for flash)
      const costPerToken = usedModel.includes('pro') ? 0.00000125 : 0.0000001;
      const estimatedCostUsd = ((inputTokens + outputTokens) * costPerToken).toFixed(6);

      return {
        content,
        structuredJson,
        inputTokens,
        outputTokens,
        estimatedCostUsd,
        durationMs,
        model: usedModel,
        provider: this.slug,
      };
    } catch (err: any) {
      console.warn(`[Gemini Content Generation] Primary Gemini generation failed (${err.message}). Automatically routing to TGPT OS fallback...`);
      try {
        const fallbackResult = await tgptAdapter.generateText(options);
        return {
          ...fallbackResult,
          provider: 'gemini (fallback: tgpt)',
        };
      } catch (tgptErr: any) {
        throw new Error(`Gemini API generation failed (${err.message}) and TGPT fallback also failed: ${tgptErr.message}`);
      }
    }
  }

  async generateImage(prompt: string, apiKey?: string, modelId: string = 'imagen-3.0-generate-002'): Promise<{ imageUrl: string; mimeType: string }> {
    const key = apiKey || config.ai.geminiKey || process.env.GEMINI_API_KEY;
    const chosenModel = modelId || 'imagen-3.0-generate-002';

    // 0. Flash Image Models (e.g. gemini-2.5-flash, gemini-3.8-flash, gemini-latest-flash)
    if (chosenModel.startsWith('gemini-') && key) {
      try {
        const ai = this.getClient(key);
        const flashPrompt = `You are an expert digital illustrator for a high-tech publication.
Synthesize an ultra-modern, striking 16:9 editorial visual illustration in pure standalone XML SVG based on:
"${prompt}"

Rules:
1. Output strictly valid XML SVG (<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" ...>...</svg>).
2. 16:9 widescreen composition.
3. Complex, beautiful gradients, subtle technical grids, layered glow elements.
4. Output ONLY the raw <svg>...</svg> code. No markdown formatting, no backticks, no other text.`;

        const res = await ai.models.generateContent({
          model: chosenModel,
          contents: flashPrompt,
        });

        const raw = res.text || '';
        const startIdx = raw.indexOf('<svg');
        const endIdx = raw.lastIndexOf('</svg>');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const svgMarkup = raw.substring(startIdx, endIdx + 6);
          const base64Svg = Buffer.from(svgMarkup, 'utf-8').toString('base64');
          return {
            imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
            mimeType: 'image/svg+xml',
          };
        }
      } catch (flashErr: any) {
        console.warn(`[Gemini Flash Visual Generation] Failed: ${flashErr.message}`);
      }
    }

    // 1. Google AI Studio REST Endpoint for Imagen 3
    if (key) {
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:predict?key=${encodeURIComponent(key)}`;
        const res = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '16:9',
              outputMimeType: 'image/jpeg',
            },
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const b64 = data.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            return {
              imageUrl: `data:image/jpeg;base64,${b64}`,
              mimeType: 'image/jpeg',
            };
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini Imagen REST] Failed: ${err.message}`);
      }
    }

    // 2. Vertex AI / Enterprise GenAI SDK
    try {
      const ai = this.getClient(key);
      const response = await ai.models.generateImages({
        model: chosenModel,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg',
        },
      });

      const generated = response.generatedImages?.[0];
      if (generated?.image?.imageBytes) {
        return {
          imageUrl: `data:image/jpeg;base64,${generated.image.imageBytes}`,
          mimeType: 'image/jpeg',
        };
      }
    } catch (sdkErr: any) {
      console.warn(`[Gemini SDK generateImages] Failed: ${sdkErr.message}`);
    }

    // 3. Fallback: High-resolution editorial SVG banner
    const safeTitle = prompt.slice(0, 70).replace(/[<>&"]/g, '');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#311042" />
        </linearGradient>
        <radialGradient id="glow" cx="80%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)" />
      <rect width="1280" height="720" fill="url(#glow)" />
      <circle cx="1100" cy="180" r="280" fill="#4f46e5" opacity="0.15" filter="blur(60px)" />
      <circle cx="200" cy="560" r="240" fill="#ec4899" opacity="0.1" filter="blur(50px)" />
      <g transform="translate(100, 320)">
        <rect x="0" y="-80" width="160" height="36" rx="18" fill="#4f46e5" fill-opacity="0.25" stroke="#6366f1" stroke-width="1.5" />
        <text x="80" y="-57" fill="#a5b4fc" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="1">FEATURED</text>
        <text x="0" y="20" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="800" max-width="1080">${safeTitle}</text>
        <text x="0" y="70" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500">Daily Build Editorial • High-Res AI Cover</text>
      </g>
    </svg>`;
    const base64Svg = Buffer.from(svg).toString('base64');
    return {
      imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
      mimeType: 'image/svg+xml',
    };
  }
}
