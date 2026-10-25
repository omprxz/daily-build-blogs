import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new DatabaseSync(config.databasePath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS image_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    local_path TEXT,
    imgbb_url TEXT,
    display_url TEXT,
    error TEXT,
    duration_ms INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_image_requests_created_at
  ON image_requests(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_image_requests_status
  ON image_requests(status);
`);

const insertRequest = db.prepare(`
  INSERT INTO image_requests (prompt, status, created_at)
  VALUES (?, 'queued', ?)
`);

export function createRequest(prompt) {
  const result = insertRequest.run(prompt, new Date().toISOString());
  return Number(result.lastInsertRowid);
}

export function updateRequest(id, values) {
  const allowed = new Set([
    "status", "completed_at", "local_path", "imgbb_url",
    "display_url", "error", "duration_ms"
  ]);
  const entries = Object.entries(values).filter(([key]) => allowed.has(key));
  if (!entries.length) return;
  const sql = `UPDATE image_requests SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...entries.map(([, value]) => value), id);
}

export function getRequest(id) {
  return db.prepare("SELECT * FROM image_requests WHERE id = ?").get(id);
}

export function listRequests({ search = "", status = "", limit = 200 } = {}) {
  const filters = [];
  const params = [];
  if (search) {
    filters.push("(prompt LIKE ? OR imgbb_url LIKE ? OR local_path LIKE ?)");
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (status) {
    filters.push("status = ?");
    params.push(status);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  params.push(Math.min(500, Math.max(1, Number(limit) || 200)));
  return db.prepare(`
    SELECT * FROM image_requests
    ${where}
    ORDER BY id DESC
    LIMIT ?
  `).all(...params);
}

export function getStats() {
  return db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status IN ('queued', 'generating', 'uploading') THEN 1 ELSE 0 END) AS active
    FROM image_requests
  `).get();
}
