export interface DiscoveredModel {
  id: string;
  name: string;
  capabilities: ('text' | 'structured_output' | 'vision' | 'tool_calling' | 'image_generation')[];
  contextWindow?: number;
  pricingNotes?: string;
  isDefault?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  models: DiscoveredModel[];
  latencyMs?: number;
}

export interface GenerationOptions {
  model: string;
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  responseJsonSchema?: object; // If structured JSON output is requested
}

export interface GenerationResult {
  content: string;
  structuredJson?: any;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: string;
  durationMs: number;
  model: string;
  provider: string;
}

export interface AIProviderAdapter {
  slug: string;
  name: string;
  isAutomaticModel?: boolean;
  testConnection(apiKey?: string, baseUrl?: string): Promise<TestConnectionResult>;
  discoverModels(apiKey?: string, baseUrl?: string): Promise<DiscoveredModel[]>;
  generateText(options: GenerationOptions, apiKey?: string, baseUrl?: string): Promise<GenerationResult>;
}
