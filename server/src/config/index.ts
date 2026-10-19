
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  appName: process.env.APP_NAME || 'Daily Build Blogs',
  appUrl: process.env.APP_URL || 'https://blogs.dailybuild.tech',

  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/daily_build_blogs',
    name: process.env.DB_NAME || 'daily_build_blogs',
  },

  jwtSecret: process.env.JWT_SECRET || 'dailybuild_dev_super_secret_jwt_key_9948271',
  sessionSecret: process.env.SESSION_SECRET || 'dailybuild_dev_session_secret_3829104',
  encryptionKey: process.env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@dailybuild.tech',
    name: process.env.ADMIN_NAME || 'System Administrator',
    password: process.env.ADMIN_PASSWORD || 'Admin@DailyBuild2026!',
  },

  storage: {
    uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
    grokKey: process.env.XAI_GROK_API_KEY || '',
    claudeKey: process.env.ANTHROPIC_API_KEY || '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },

  automation: {
    emergencyKillSwitch: process.env.EMERGENCY_KILL_SWITCH_ACTIVE === 'true',
    timeoutMs: parseInt(process.env.WORKFLOW_EXECUTION_TIMEOUT_MS || '120000', 10),
  },

  google: {
    pagespeedApiKey: process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PAGESPEED_API_KEY || process.env.GEMINI_API_KEY || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.APP_URL || 'https://blogs.dailybuild.tech'}/api/sites/gsc/oauth-callback`,
  },
};

