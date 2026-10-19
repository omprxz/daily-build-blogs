import { spawn, execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { AIProviderAdapter, GenerationOptions, GenerationResult, DiscoveredModel, TestConnectionResult } from './types.js';

export interface OsEnvironment {
  platform: NodeJS.Platform;
  isWindows: boolean;
  isLinux: boolean;
  isMac: boolean;
  osName: string;
}

/**
 * Detect current operating system environment (Windows, Linux, or macOS).
 */
export function detectOperatingSystem(): OsEnvironment {
  const platform = process.platform;
  return {
    platform,
    isWindows: platform === 'win32',
    isLinux: platform === 'linux',
    isMac: platform === 'darwin',
    osName: platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : os.type(),
  };
}

/**
 * Resolves the path to the tgpt executable based on the detected OS.
 */
export function resolveTgptExecutable(): string {
  const { isWindows } = detectOperatingSystem();

  // 1. Check explicit environment override
  if (process.env.TGPT_PATH && fs.existsSync(process.env.TGPT_PATH)) {
    return process.env.TGPT_PATH;
  }

  // 2. Windows-specific lookup
  if (isWindows) {
    try {
      const stdout = execSync('where tgpt', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (stdout) {
        const first = stdout.split(/\r?\n/)[0].trim();
        if (first) return first;
      }
    } catch {
      // not in immediate where output
    }

    const userProfile = process.env.USERPROFILE || '';
    const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
    const winLocations = [
      path.join(localAppData, 'tgpt', 'tgpt.exe'),
      path.join(userProfile, 'AppData', 'Local', 'tgpt', 'tgpt.exe'),
      path.join(userProfile, '.local', 'bin', 'tgpt.exe'),
      path.join(userProfile, 'bin', 'tgpt.exe'),
      path.join(userProfile, 'scoop', 'shims', 'tgpt.exe'),
      path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'tgpt.exe'),
      path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'tgpt', 'tgpt.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'tgpt', 'tgpt.exe'),
      path.join(process.cwd(), 'tgpt.exe'),
      'tgpt.exe',
      'tgpt',
    ];

    for (const loc of winLocations) {
      if (fs.existsSync(loc)) return loc;
    }

    return 'tgpt'; // fallback to standard command name
  }

  // 3. Linux/Unix-specific lookup
  try {
    const stdout = execSync('which tgpt', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (stdout) return stdout;
  } catch {
    // not in immediate which output
  }

  const homeDir = process.env.HOME || '';
  const linuxLocations = [
    '/usr/local/bin/tgpt',
    '/usr/bin/tgpt',
    path.join(homeDir, '.local', 'bin', 'tgpt'),
    path.join(homeDir, 'bin', 'tgpt'),
    'tgpt',
  ];

  for (const loc of linuxLocations) {
    if (fs.existsSync(loc)) return loc;
  }

  return 'tgpt';
}

/**
 * Executes tgpt CLI safely with prompt input and OS detection.
 */
export async function executeTgptCommand(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 90000
): Promise<string> {
  const osInfo = detectOperatingSystem();
  const tgptExec = resolveTgptExecutable();

  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\nTask:\n${prompt}`
    : prompt;

  return new Promise<string>((resolve, reject) => {
    let resolved = false;

    // Use -q flag (quiet mode) to output only the model's text response
    const args = ['-q'];
    const isWindows = osInfo.isWindows;

    // If we have an absolute path or direct .exe, run without cmd.exe shell wrapper for reliability
    const useShell = isWindows && !path.isAbsolute(tgptExec) && !tgptExec.toLowerCase().endsWith('.exe');

    // We pass prompt through stdin to avoid escaping issues with large text / quotes
    const child = spawn(tgptExec, args, {
      shell: useShell,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill();
        reject(new Error(`TGPT generation timed out after ${timeoutMs}ms on ${osInfo.osName}`));
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(
          new Error(
            `Failed to spawn TGPT on ${osInfo.osName} (${tgptExec}): ${err.message}. Please verify TGPT is installed and in PATH.`
          )
        );
      }
    });

    child.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);

      if (code === 0 && stdoutData.trim()) {
        resolve(stdoutData.trim());
      } else if (stdoutData.trim()) {
        // Some CLI tools exit with non-zero warning but provide output
        resolve(stdoutData.trim());
      } else {
        // If stdin piping produced no output, try direct argument invocation as fallback
        fallbackArgExecution(tgptExec, fullPrompt, isWindows)
          .then(resolve)
          .catch((fallbackErr) => {
            reject(
              new Error(
                `TGPT execution exited with code ${code} on ${osInfo.osName}. Output: "${stderrData.trim() || stdoutData.trim()}". Fallback error: ${fallbackErr.message}`
              )
            );
          });
      }
    });

    try {
      child.stdin.write(fullPrompt);
      child.stdin.end();
    } catch (stdinErr: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        fallbackArgExecution(tgptExec, fullPrompt, isWindows).then(resolve).catch(reject);
      }
    }
  });
}

function fallbackArgExecution(execPath: string, promptText: string, isWindows: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    // Escaped argument execution
    const useShell = isWindows && !path.isAbsolute(execPath) && !execPath.toLowerCase().endsWith('.exe');
    const child = spawn(execPath, ['-q', promptText], {
      shell: useShell,
      env: process.env,
    });

    let out = '';
    let err = '';

    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));

    child.on('close', (code) => {
      if (code === 0 || out.trim()) {
        resolve(out.trim());
      } else {
        reject(new Error(err.trim() || `Exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

export class TgptAdapter implements AIProviderAdapter {
  slug = 'tgpt';
  name = 'TGPT (Terminal GPT CLI)';

  getCapabilities() {
    return ['text_generation', 'summarization', 'chat'];
  }

  async testConnection(_apiKey?: string, _baseUrl?: string): Promise<TestConnectionResult> {
    const osInfo = detectOperatingSystem();
    const start = Date.now();
    const models = await this.discoverModels();
    try {
      const output = await executeTgptCommand('Reply only with: OK', undefined, 30000);
      return {
        success: true,
        message: `TGPT verified on ${osInfo.osName} (${resolveTgptExecutable()}). Response: "${output.slice(0, 30)}"`,
        latencyMs: Date.now() - start,
        models,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `TGPT check on ${osInfo.osName} failed: ${err.message}`,
        latencyMs: Date.now() - start,
        models,
      };
    }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    const osInfo = detectOperatingSystem();
    return [
      {
        id: `tgpt-${osInfo.isWindows ? 'windows' : 'linux'}`,
        name: `TGPT CLI (${osInfo.osName} Native Fallback)`,
        capabilities: ['text', 'structured_output'],
        pricingNotes: 'Free local terminal execution via TGPT',
        isDefault: true,
      },
    ];
  }

  async generateText(options: GenerationOptions): Promise<GenerationResult> {
    const osInfo = detectOperatingSystem();
    const start = Date.now();

    const outputText = await executeTgptCommand(
      options.prompt,
      options.systemInstruction,
      60000
    );

    const durationMs = Date.now() - start;
    let structuredJson: any = null;

    if (options.responseJsonSchema) {
      try {
        // Try direct parse or extract from markdown json block
        const jsonMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const toParse = jsonMatch ? jsonMatch[1] : outputText;
        structuredJson = JSON.parse(toParse.trim());
      } catch (e) {
        console.warn('[TGPT] Failed to parse structured JSON from output:', e);
      }
    }

    const inputTokens = Math.ceil(options.prompt.length / 4);
    const outputTokens = Math.ceil(outputText.length / 4);

    return {
      content: outputText,
      model: `tgpt-${osInfo.isWindows ? 'windows' : 'linux'}`,
      provider: this.slug,
      inputTokens,
      outputTokens,
      estimatedCostUsd: '0.000000',
      durationMs,
      structuredJson,
    };
  }
}

export const tgptAdapter = new TgptAdapter();
