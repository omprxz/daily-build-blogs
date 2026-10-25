import fs from "node:fs/promises";
import { config } from "./config.js";

export async function uploadToImgBB(imagePath) {
  if (!config.imgbbApiKey) throw new Error("IMGBB_API_KEY is missing in .env");

  const image = await fs.readFile(imagePath);
  const form = new FormData();
  form.append("image", image.toString("base64"));

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(config.imgbbApiKey)}`,
    { method: "POST", body: form, signal: AbortSignal.timeout(60000) }
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || `ImgBB upload failed with HTTP ${response.status}`);
  }

  return {
    url: result.data.url,
    displayUrl: result.data.display_url || result.data.url,
    deleteUrl: result.data.delete_url || null
  };
}
