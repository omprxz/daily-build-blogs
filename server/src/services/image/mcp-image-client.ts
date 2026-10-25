import { config } from '../../config/index.js';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq } from 'drizzle-orm';
import { processFeaturedImageWatermark } from './featured-watermark.js';

const SETTINGS_KEY = 'local_image_automation';

/**
 * Resolves the MCP endpoint URL from the admin-configured domain / URL.
 * Takes the configured URL/domain and appends `/mcp` directly after the domain name & extension.
 * e.g.:
 * - "https://dessie-unrecompensable-putridly.ngrok-free.dev" -> "https://dessie-unrecompensable-putridly.ngrok-free.dev/mcp"
 * - "https://dessie-unrecompensable-putridly.ngrok-free.dev/webhook" -> "https://dessie-unrecompensable-putridly.ngrok-free.dev/mcp"
 * - "https://dessie-unrecompensable-putridly.ngrok-free.dev/mcp" -> "https://dessie-unrecompensable-putridly.ngrok-free.dev/mcp"
 */
export function resolveMcpUrl(configuredUrl: string): string {
  const trimmed = (configuredUrl || '').trim();
  if (!trimmed) return '';

  try {
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProto);
    return `${parsed.protocol}//${parsed.host}/mcp`;
  } catch {
    return trimmed.replace(/\/+$/, '') + '/mcp';
  }
}

export interface McpTestResult {
  success: boolean;
  message: string;
  mcpUrl: string;
  serverInfo?: { name: string; version: string };
  tools?: Array<{ name: string; description?: string }>;
  latencyMs?: number;
  responseStatus?: number;
  error?: string;
}

export interface McpGenerateResult {
  imageUrl: string;
  originalImageUrl: string;
  displayUrl?: string;
  requestId?: number;
  durationMs?: number;
  logs: string[];
}

export class McpImageClient {
  /**
   * Retrieves the current admin-configured automation settings
   */
  async getConfiguredUrl(): Promise<string> {
    try {
      const record = await db.query.applicationSettings.findFirst({
        where: eq(schema.applicationSettings.key, SETTINGS_KEY),
      });
      const val = (record?.valueJson as any) || {};
      return (val.webhookUrl || '').trim();
    } catch {
      return '';
    }
  }

  /**
   * Tests connection to the MCP server endpoint
   */
  async testConnection(customUrl?: string): Promise<McpTestResult> {
    const rawUrl = customUrl || (await this.getConfiguredUrl());
    const mcpUrl = resolveMcpUrl(rawUrl);

    if (!mcpUrl) {
      return {
        success: false,
        message: 'No MCP server URL configured. Please enter your domain or tunnel URL.',
        mcpUrl: '',
      };
    }

    const startTime = Date.now();
    try {
      // 1. Initialize session with MCP server
      const initRes = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'DailyBuild-Server-MCP/1.0',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'dailybuild-server', version: '1.0' },
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - startTime;

      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => '');
        return {
          success: false,
          message: `MCP server responded with HTTP ${initRes.status}: ${errText.slice(0, 150)}`,
          mcpUrl,
          latencyMs,
          responseStatus: initRes.status,
        };
      }

      const sessionId = initRes.headers.get('mcp-session-id') || undefined;
      const initBody = await initRes.text();
      const initData = this.parseSseJsonRpc(initBody);
      const serverInfo = initData?.result?.serverInfo || { name: 'mcp-server', version: '1.0.0' };

      // 2. Send initialized notification if sessionId is present
      if (sessionId) {
        await fetch(mcpUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'mcp-session-id': sessionId,
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
          }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      }

      // 3. Query available tools
      let tools: Array<{ name: string; description?: string }> = [];
      try {
        const toolsHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'ngrok-skip-browser-warning': 'true',
        };
        if (sessionId) toolsHeaders['mcp-session-id'] = sessionId;

        const toolsRes = await fetch(mcpUrl, {
          method: 'POST',
          headers: toolsHeaders,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/list',
            params: {},
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (toolsRes.ok) {
          const toolsText = await toolsRes.text();
          const toolsData = this.parseSseJsonRpc(toolsText);
          tools = (toolsData?.result?.tools || []).map((t: any) => ({
            name: t.name,
            description: t.description || t.title,
          }));
        }
      } catch (err: any) {
        console.warn('[MCP Client] Could not list tools:', err.message);
      }

      const hasImgTool = tools.some((t) => t.name === 'generate_and_upload_image' || t.name.includes('image'));
      return {
        success: true,
        message: `Connected to MCP server "${serverInfo.name}" (${serverInfo.version}) at ${mcpUrl}.${
          hasImgTool ? ' Image generation tool verified and active.' : ''
        }`,
        mcpUrl,
        serverInfo,
        tools,
        latencyMs,
        responseStatus: initRes.status,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `MCP Server unreachable at ${mcpUrl}: ${err.message}`,
        mcpUrl,
        error: err.message,
      };
    }
  }

  /**
   * Generates an image by sending the prompt to the configured MCP endpoint
   */
  async generateImage(params: {
    prompt: string;
    customUrl?: string;
    articleId?: string | null;
    timeoutMs?: number;
  }): Promise<McpGenerateResult> {
    const rawUrl = params.customUrl || (await this.getConfiguredUrl());
    const mcpUrl = resolveMcpUrl(rawUrl);

    if (!mcpUrl) {
      throw new Error('No MCP server URL configured. Please configure your domain in Admin -> Image Providers.');
    }

    const logs: string[] = [
      `[${new Date().toLocaleTimeString()}] Connecting to MCP endpoint: ${mcpUrl}`,
    ];

    // 1. Initialize MCP session
    const initRes = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'DailyBuild-Server-MCP/1.0',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'dailybuild-server', version: '1.0' },
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => '');
      throw new Error(`MCP initialize handshake failed (HTTP ${initRes.status}): ${errText}`);
    }

    const sessionId = initRes.headers.get('mcp-session-id') || undefined;
    const initBody = await initRes.text();
    const initData = this.parseSseJsonRpc(initBody);
    const serverName = initData?.result?.serverInfo?.name || 'mcp-server';
    logs.push(`[${new Date().toLocaleTimeString()}] Handshake acknowledged by "${serverName}". Session ID: ${sessionId || 'none'}`);

    // 2. Initialized notification
    if (sessionId) {
      await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }

    // 3. Call tool generate_and_upload_image
    logs.push(`[${new Date().toLocaleTimeString()}] Executing tool "generate_and_upload_image" with prompt (${params.prompt.length} chars)...`);
    const toolHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'ngrok-skip-browser-warning': 'true',
    };
    if (sessionId) toolHeaders['mcp-session-id'] = sessionId;

    const timeoutMs = params.timeoutMs || 180000; // 3 minutes timeout for browser generation
    const toolRes = await fetch(mcpUrl, {
      method: 'POST',
      headers: toolHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'generate_and_upload_image',
          arguments: {
            prompt: params.prompt,
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!toolRes.ok) {
      const errText = await toolRes.text().catch(() => '');
      throw new Error(`MCP tool execution error (HTTP ${toolRes.status}): ${errText}`);
    }

    const streamBody = await toolRes.text();
    const rpcResponse = this.parseSseJsonRpc(streamBody);

    if (rpcResponse?.error) {
      throw new Error(`MCP error ${rpcResponse.error.code}: ${rpcResponse.error.message}`);
    }

    const rawContent = rpcResponse?.result?.content?.[0]?.text;
    if (!rawContent) {
      throw new Error(`MCP response did not contain content payload. Raw stream: ${streamBody.slice(0, 300)}`);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawContent);
    } catch {
      payload = { image_url: rawContent.trim() };
    }

    const originalImageUrl = payload.image_url || payload.display_url || payload.url;
    if (!originalImageUrl) {
      throw new Error(`MCP returned payload without image_url: ${JSON.stringify(payload)}`);
    }

    logs.push(`[${new Date().toLocaleTimeString()}] MCP generation successful! ImgBB URL: ${originalImageUrl} (Duration: ${payload.duration_ms || 'n/a'}ms)`);

    // 4. Download and process watermark locally into WebP
    let publicUrl = originalImageUrl;
    try {
      logs.push(`[${new Date().toLocaleTimeString()}] Downloading and processing watermark into WebP...`);
      const imgFetch = await fetch(originalImageUrl, {
        headers: { 'User-Agent': 'DailyBuild-Server/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (imgFetch.ok) {
        const arr = await imgFetch.arrayBuffer();
        const wmRes = await processFeaturedImageWatermark(Buffer.from(arr), {
          prefix: `mcp_${params.articleId || 'auto'}`,
        });
        publicUrl = wmRes.publicUrl;
        logs.push(`[${new Date().toLocaleTimeString()}] Watermarked WebP asset stored at: ${publicUrl}`);
      }
    } catch (wmErr: any) {
      logs.push(`[${new Date().toLocaleTimeString()}] Watermark warning: ${wmErr.message}. Utilizing direct ImgBB URL.`);
    }

    return {
      imageUrl: publicUrl,
      originalImageUrl,
      displayUrl: payload.display_url,
      requestId: payload.request_id,
      durationMs: payload.duration_ms,
      logs,
    };
  }

  /**
   * Helper to parse SSE / text streams or standard JSON from MCP responses
   */
  private parseSseJsonRpc(text: string): any {
    if (!text) return null;
    const clean = text.trim();

    // Check if directly valid JSON
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        return JSON.parse(clean);
      } catch {}
    }

    // Parse SSE lines (e.g. "data: {...}")
    const lines = clean.split('\n');
    let lastDataJson: any = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim();
        try {
          lastDataJson = JSON.parse(jsonStr);
        } catch {}
      }
    }

    return lastDataJson;
  }
}

export const mcpImageClient = new McpImageClient();
