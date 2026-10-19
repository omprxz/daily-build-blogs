import { OpenAIAdapter } from './openai.js';
import { DiscoveredModel } from './types.js';
import { config } from '../../config/index.js';

export class GroqAdapter extends OpenAIAdapter {
  constructor() {
    super('groq', 'Groq Cloud (Ultra-Fast)', 'https://api.groq.com/openai/v1');
  }

  override async discoverModels(apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]> {
    const key = apiKey || config.ai.groqKey;
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
        contextWindow: m.context_window || 128000,
        isDefault: m.id.includes('llama-3.3-70b') || m.id.includes('llama3-70b'),
        pricingNotes: 'Free tier available on Groq Cloud',
      }));
    } catch (err: any) {
      console.warn('[Groq Discovery Fallback]:', err.message);
      return [
        {
          id: 'llama-3.3-70b-versatile',
          name: 'Llama 3.3 70B Versatile (Free Tier)',
          capabilities: ['text', 'structured_output'],
          contextWindow: 128000,
          isDefault: true,
          pricingNotes: 'Free tier with rate limits',
        },
        {
          id: 'llama-3.1-8b-instant',
          name: 'Llama 3.1 8B Instant (Ultra-Fast)',
          capabilities: ['text', 'structured_output'],
          contextWindow: 128000,
          isDefault: false,
          pricingNotes: 'Free tier with high RPM',
        },
        {
          id: 'mixtral-8x7b-32768',
          name: 'Mixtral 8x7B (32k Context)',
          capabilities: ['text', 'structured_output'],
          contextWindow: 32768,
          isDefault: false,
          pricingNotes: 'Free tier eligible',
        }
      ];
    }
  }
}
