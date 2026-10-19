import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';
import { config } from '../../config/index.js';

export class ClaudeAdapter implements AIProviderAdapter {
  slug = 'claude';
  name = 'Anthropic Claude';

  async testConnection(apiKey?: string): Promise<TestConnectionResult> {
    const start = Date.now();
    const key = apiKey || config.ai.claudeKey;

    if (!key) {
      return {
        success: false,
        message: 'Missing Anthropic API key.',
        models: [],
      };
    }

    try {
      const models = await this.discoverModels(key);
      const latencyMs = Date.now() - start;

      return {
        success: true,
        message: `Successfully connected to Anthropic Claude! Discovered ${models.length} models.`,
        models,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Anthropic connection error: ${err.message}`,
        models: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  async discoverModels(apiKey?: string): Promise<DiscoveredModel[]> {
    const key = apiKey || config.ai.claudeKey;
    if (!key) return [];

    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawList: any[] = data.data || [];

      return rawList.map((m: any) => ({
        id: m.id,
        name: m.display_name || m.id,
        capabilities: ['text', 'structured_output', 'vision'],
        contextWindow: 200000,
        isDefault: m.id.includes('sonnet'),
        pricingNotes: 'Anthropic token pricing',
      }));
    } catch (err: any) {
      console.warn('[Claude Discovery Fallback]:', err.message);
      return [
        {
          id: 'claude-3-7-sonnet-20250219',
          name: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 200000,
          isDefault: true,
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          name: 'Claude 3.5 Sonnet (Coding & Tech Analysis)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 200000,
          isDefault: false,
        },
        {
          id: 'claude-3-5-haiku-20241022',
          name: 'Claude 3.5 Haiku (High-Speed)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 200000,
          isDefault: false,
        }
      ];
    }
  }

  async generateText(options: GenerationOptions, apiKey?: string): Promise<GenerationResult> {
    const key = apiKey || config.ai.claudeKey;
    if (!key) throw new Error('Anthropic API key is required.');

    const start = Date.now();
    const payload: any = {
      model: options.model || 'claude-3-5-haiku-20241022',
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      messages: [{ role: 'user', content: options.prompt }],
    };

    if (options.systemInstruction) {
      payload.system = options.systemInstruction;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const durationMs = Date.now() - start;
    const content = data.content?.[0]?.text || '';
    let structuredJson: any = null;

    if (options.responseJsonSchema) {
      try {
        structuredJson = JSON.parse(content);
      } catch (e) {
        console.warn('Claude JSON parse warning:', e);
      }
    }

    const inputTokens = data.usage?.input_tokens || Math.ceil(options.prompt.length / 4);
    const outputTokens = data.usage?.output_tokens || Math.ceil(content.length / 4);
    const estimatedCostUsd = ((inputTokens * 0.000003) + (outputTokens * 0.000015)).toFixed(6);

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
}
