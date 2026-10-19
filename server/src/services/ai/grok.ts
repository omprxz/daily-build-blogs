import { OpenAIAdapter } from './openai.js';
import { DiscoveredModel } from './types.js';
import { config } from '../../config/index.js';

export class GrokAdapter extends OpenAIAdapter {
  constructor() {
    super('grok', 'xAI Grok', 'https://api.x.ai/v1');
  }

  override async discoverModels(apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]> {
    const key = apiKey || config.ai.grokKey;
    const url = baseUrl || this.defaultBaseUrl;

    try {
      const res = await fetch(`${url}/models`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: any = await res.json();
      const rawList: any[] = data.data || [];

      return rawList.map((m: any) => ({
        id: m.id,
        name: m.id,
        capabilities: ['text', 'structured_output', ...(m.id.includes('vision') ? ['vision' as const] : [])],
        contextWindow: 131072,
        isDefault: m.id === 'grok-2-latest' || m.id === 'grok-beta',
        pricingNotes: 'xAI API Pricing',
      }));
    } catch (err: any) {
      console.warn('[Grok Discovery Fallback]:', err.message);
      return [
        {
          id: 'grok-2-1212',
          name: 'Grok 2 (State of the art reasoning)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 131072,
          isDefault: true,
        },
        {
          id: 'grok-2-vision-1212',
          name: 'Grok 2 Vision (Multimodal)',
          capabilities: ['text', 'structured_output', 'vision'],
          contextWindow: 32768,
          isDefault: false,
        },
        {
          id: 'grok-beta',
          name: 'Grok Beta',
          capabilities: ['text', 'structured_output'],
          contextWindow: 131072,
          isDefault: false,
        }
      ];
    }
  }
}
