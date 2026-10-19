import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';

export class OpenRouterAdapter implements AIProviderAdapter {
  slug = 'openrouter';
  name = 'OpenRouter.ai';
  private defaultBaseUrl = 'https://openrouter.ai/api/v1';

  private getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://dailybuild.tech',
      'X-Title': 'DailyBuild Blogs',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    return headers;
  }

  async testConnection(apiKey?: string, baseUrl?: string): Promise<TestConnectionResult> {
    const start = Date.now();
    if (!apiKey || !apiKey.trim()) {
      return {
        success: false,
        message: 'OpenRouter API key is required. Please enter a valid OpenRouter API key to activate.',
        models: [],
        latencyMs: 0,
      };
    }

    const endpoint = `${(baseUrl || this.defaultBaseUrl).replace(/\/+$/, '')}/models`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders(apiKey),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `OpenRouter authentication failed (HTTP ${res.status})`;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson?.error?.message) {
            message = `OpenRouter: ${errJson.error.message}`;
          }
        } catch {}
        return {
          success: false,
          message,
          models: [],
          latencyMs: Date.now() - start,
        };
      }

      const data = (await res.json()) as any;
      const rawList = Array.isArray(data?.data) ? data.data : [];
      const models = this.mapModels(rawList);

      return {
        success: true,
        message: `Successfully connected to OpenRouter.ai. Discovered ${models.length} active models.`,
        models,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `OpenRouter connection error: ${err.message}`,
        models: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  async discoverModels(apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]> {
    if (!apiKey || !apiKey.trim()) {
      return [];
    }

    const endpoint = `${(baseUrl || this.defaultBaseUrl).replace(/\/+$/, '')}/models`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: this.getHeaders(apiKey),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch models from OpenRouter (HTTP ${res.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const rawList = Array.isArray(json?.data) ? json.data : [];
    return this.mapModels(rawList);
  }

  private mapModels(rawList: any[]): DiscoveredModel[] {
    return rawList.map((m: any) => {
      const id = String(m.id || '');
      const name = String(m.name || id);
      const contextWindow = typeof m.context_length === 'number' ? m.context_length : undefined;

      const capabilities: ('text' | 'structured_output' | 'vision' | 'tool_calling' | 'image_generation')[] = ['text'];
      const idLower = id.toLowerCase();
      const descLower = String(m.description || '').toLowerCase();

      if (idLower.includes('vision') || idLower.includes('4o') || idLower.includes('gemini') || idLower.includes('claude-3') || descLower.includes('multimodal') || descLower.includes('vision')) {
        capabilities.push('vision');
      }
      if (!idLower.includes('image') && !idLower.includes('diffusion')) {
        capabilities.push('structured_output');
      }
      if (idLower.includes('flux') || idLower.includes('diffusion') || idLower.includes('dall-e')) {
        capabilities.push('image_generation');
      }

      let pricingNotes: string | undefined = undefined;
      if (m.pricing) {
        const promptPrice = m.pricing.prompt ? Number(m.pricing.prompt) * 1000000 : null;
        const compPrice = m.pricing.completion ? Number(m.pricing.completion) * 1000000 : null;
        if (promptPrice !== null || compPrice !== null) {
          pricingNotes = `$${promptPrice?.toFixed(2) || '0'}/1M prompt, $${compPrice?.toFixed(2) || '0'}/1M completion`;
        }
      }

      const isDefault = id === 'openai/gpt-4o-mini' || id === 'google/gemini-2.0-flash-001' || id === 'anthropic/claude-3.5-haiku';

      return {
        id,
        name,
        capabilities,
        contextWindow,
        pricingNotes,
        isDefault,
      };
    });
  }

  async generateText(options: GenerationOptions, apiKey?: string, baseUrl?: string): Promise<GenerationResult> {
    const start = Date.now();
    if (!apiKey || !apiKey.trim()) {
      throw new Error('OpenRouter API key is missing. Please configure an API key in AI Providers settings.');
    }

    const endpoint = `${(baseUrl || this.defaultBaseUrl).replace(/\/+$/, '')}/chat/completions`;
    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction.trim() });
    }
    messages.push({ role: 'user', content: options.prompt.trim() });

    const payload: any = {
      model: options.model || 'openai/gpt-4o-mini',
      messages,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
    };

    if (options.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    if (options.responseJsonSchema) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `OpenRouter API error (HTTP ${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error?.message) {
          errMsg = `OpenRouter: ${parsed.error.message}`;
        }
      } catch {}
      throw new Error(errMsg);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content.trim()) {
      throw new Error('OpenRouter returned an empty response.');
    }

    const durationMs = Date.now() - start;
    const inputTokens = data?.usage?.prompt_tokens || Math.ceil(options.prompt.length / 4);
    const outputTokens = data?.usage?.completion_tokens || Math.ceil(content.length / 4);

    let structuredJson: any = undefined;
    if (options.responseJsonSchema) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          structuredJson = JSON.parse(jsonMatch[0]);
        }
      } catch {}
    }

    return {
      content,
      structuredJson,
      inputTokens,
      outputTokens,
      estimatedCostUsd: '0.000000',
      durationMs,
      model: options.model || payload.model,
      provider: 'openrouter',
    };
  }
}

export const openRouterAdapter = new OpenRouterAdapter();
