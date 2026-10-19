import { AIProviderAdapter, DiscoveredModel, GenerationOptions, GenerationResult, TestConnectionResult } from './types.js';
import { config } from '../../config/index.js';

export class OllamaAdapter implements AIProviderAdapter {
  slug = 'ollama';
  name = 'Ollama (Self-Hosted)';

  async testConnection(_apiKey?: string, baseUrl?: string): Promise<TestConnectionResult> {
    const start = Date.now();
    const url = (baseUrl || config.ai.ollamaBaseUrl).replace(/\/$/, '');

    try {
      const models = await this.discoverModels(undefined, url);
      const latencyMs = Date.now() - start;

      return {
        success: true,
        message: `Connected to Ollama at ${url}! Found ${models.length} locally pulled models.`,
        models,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Could not connect to Ollama at ${url}: ${err.message}. Ensure Ollama is running ('ollama serve').`,
        models: [],
        latencyMs: Date.now() - start,
      };
    }
  }

  async discoverModels(_apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]> {
    const url = (baseUrl || config.ai.ollamaBaseUrl).replace(/\/$/, '');
    const res = await fetch(`${url}/api/tags`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data: any = await res.json();
    const list: any[] = data.models || [];

    return list.map((m: any) => ({
      id: m.name,
      name: `${m.name} (${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB)`,
      capabilities: ['text', 'structured_output'],
      contextWindow: 8192,
      isDefault: true,
      pricingNotes: '100% Free / Self-Hosted',
    }));
  }

  async generateText(options: GenerationOptions, _apiKey?: string, baseUrl?: string): Promise<GenerationResult> {
    const url = (baseUrl || config.ai.ollamaBaseUrl).replace(/\/$/, '');
    const start = Date.now();

    const payload: any = {
      model: options.model || 'llama3',
      prompt: options.prompt,
      system: options.systemInstruction,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 3000,
      },
    };

    if (options.responseJsonSchema) {
      payload.format = 'json';
    }

    const res = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Ollama generation failed: ${res.statusText}`);
    }

    const data: any = await res.json();
    const durationMs = Date.now() - start;
    const content = data.response || '';
    let structuredJson: any = null;

    if (options.responseJsonSchema) {
      try {
        structuredJson = JSON.parse(content);
      } catch (e) {
        console.warn('Ollama JSON parse error:', e);
      }
    }

    return {
      content,
      structuredJson,
      inputTokens: data.prompt_eval_count || Math.ceil(options.prompt.length / 4),
      outputTokens: data.eval_count || Math.ceil(content.length / 4),
      estimatedCostUsd: '0.000000',
      durationMs,
      model: options.model,
      provider: this.slug,
    };
  }
}
