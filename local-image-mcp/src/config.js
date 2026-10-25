import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectDir, ".env") });

function resolveFromProject(value, fallback) {
  const selected = value || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(projectDir, selected);
}

export const config = {
  projectDir,
  profileDir: resolveFromProject(process.env.PROFILE_DIR, "./chatgpt-profile"),
  generatedDir: resolveFromProject(process.env.GENERATED_DIR, "./generated"),
  databasePath: resolveFromProject(process.env.DATABASE_PATH, "./data/image-history.sqlite"),
  imgbbApiKey: (process.env.IMGBB_API_KEY || "").trim(),
  browserChannel: process.env.BROWSER_CHANNEL || "chrome",
  chromePath: (process.env.CHROME_PATH || "").trim(),
  headless: process.env.HEADLESS === "true",
  generationTimeoutMs: Math.max(30000, Number(process.env.GENERATION_TIMEOUT_MS) || 180000),
  adminHost: process.env.ADMIN_HOST || "127.0.0.1",
  adminPort: Number(process.env.ADMIN_PORT) || 4580
};
