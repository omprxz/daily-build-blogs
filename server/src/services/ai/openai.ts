import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';
import { config } from '../../config/index.js';

export class OpenAIAdapter implements AIProviderAdapter {
  slug: string;
  name: string;
  defaultBaseUrl: string;

  constructor(slug: string = 'openai', name: string = 'OpenAI', defaultBaseUrl: string = 'https://api.openai.com/v1') {
    this.slug = slug;
    this.name = name;
    this.defaultBaseUrl = defaultBaseUrl;
  }

  async testConnection(apiKey?: string, baseUrl?: string): Promise<TestConnectionResult> {
    const start = Date.now();
    try {
      const key = apiKey || config.ai.openaiKey;
      const url = (baseUrl || this.defaultBaseUrl).replace(/\/$/, '');

      if (!key && this.slug !== 'custom_openai') {
        return {
          success: false,
          message: 'Missing API key. Please provide your API key.',
          models: [],
        };
      }

      const models = await this.discoverModels(key, url);
      const latencyMs = Date.now() - start;

      return {
        success: true,
        message: `Successfully connected to ${this.name}! Discovered ${models.length} available models.`,
        models,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection to ${this.name} failed: ${err.message}`,
        models: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  async discoverModels(apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]> {
    const key = apiKey || config.ai.openaiKey;
    const url = (baseUrl || this.defaultBaseUrl).replace(/\/$/, '');

    try {
      const res = await fetch(`${url}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawList: any[] = data.data || [];

      // Filter and map relevant generative models
      return rawList
        .filter((m: any) => {
          const id = m.id.toLowerCase();
          return id.includes('gpt') || id.includes('o1') || id.includes('o3') || id.includes('llama') || id.includes('deepseek') || id.includes('mixtral') || id.includes('claude');
        })
        .map((m: any) => ({
          id: m.id,
          name: m.id,
          capabilities: ['text', 'structured_output', ...(m.id.includes('vision') || m.id.includes('4o') ? ['vision' as const] : [])],
          contextWindow: 128000,
          isDefault: m.id.includes('gpt-4o-mini') || m.id === 'gpt-4o',
          pricingNotes: 'Standard token billing',
        }));
    } catch (err: any) {
      console.warn(`[${this.name} Discovery Fallback]:`, err.message);
      return [
        {
          id: 'gpt-4o',
          name: 'GPT-4o (Omni Reasoning)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 128000,
          isDefault: true,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini (Cost Efficient)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 128000,
          isDefault: false,
        },
        {
          id: 'o3-mini',
          name: 'o3-mini (High-Speed Reasoning)',
          capabilities: ['text', 'structured_output'],
          contextWindow: 200000,
          isDefault: false,
        }
      ];
    }
  }

  async generateText(options: GenerationOptions, apiKey?: string, baseUrl?: string): Promise<GenerationResult> {
    const key = apiKey || config.ai.openaiKey;
    const url = (baseUrl || this.defaultBaseUrl).replace(/\/$/, '');
    const start = Date.now();

    const messages: any[] = [];
    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: options.prompt });

    const payload: any = {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 3500,
    };

    if (options.responseJsonSchema) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
    }

    const data: any = await res.json();
    const durationMs = Date.now() - start;
    const content = data.choices?.[0]?.message?.content || '';
    let structuredJson: any = null;

    if (options.responseJsonSchema) {
      try {
        structuredJson = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse JSON response:', e);
      }
    }

    const inputTokens = data.usage?.prompt_tokens || Math.ceil(options.prompt.length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.ceil(content.length / 4);
    const estimatedCostUsd = ((inputTokens * 0.00000015) + (outputTokens * 0.0000006)).toFixed(6);

    return {
      content,
      structuredJson,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      durationMs,
      model: options.model,
      provider: this.slug,
    };
  }

  async generateImage(prompt: string, apiKey?: string, modelId: string = 'dall-e-3'): Promise<{ imageUrl: string; mimeType: string }> {
    const key = apiKey || config.ai.openaiKey;
    const url = this.defaultBaseUrl.replace(/\/$/, '');

    if (!key) {
      throw new Error('OpenAI API key is not configured for image generation.');
    }

    const res = await fetch(`${url}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: modelId || 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Image generation failed (${res.status}): ${err}`);
    }

    const data: any = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      return {
        imageUrl: `data:image/jpeg;base64,${b64}`,
        mimeType: 'image/jpeg',
      };
    }

    const imgUrl = data.data?.[0]?.url;
    if (imgUrl) {
      return {
        imageUrl: imgUrl,
        mimeType: 'image/jpeg',
      };
    }

    throw new Error('No image data returned from OpenAI Image generation.');
  }
}
