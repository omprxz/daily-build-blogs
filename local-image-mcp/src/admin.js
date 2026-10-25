import express from "express";
import path from "node:path";
import { config } from "./config.js";
import { getRequest, getStats, listRequests } from "./database.js";

export function createAdminApp() {
  const app = express();
  app.disable("x-powered-by");

  app.get("/api/requests", (req, res) => {
    res.json({
      stats: getStats(),
      requests: listRequests({
        search: String(req.query.search || "").slice(0, 300),
        status: String(req.query.status || "").slice(0, 30),
        limit: Number(req.query.limit) || 200
      })
    });
  });

  app.get("/api/requests/:id", (req, res) => {
    const record = getRequest(Number(req.params.id));
    if (!record) return res.status(404).json({ error: "Request not found" });
    return res.json(record);
  });

  app.use("/generated", express.static(config.generatedDir, {
    fallthrough: false,
    index: false,
    dotfiles: "deny"
  }));

  app.get("/", (_req, res) => {
    res.sendFile(path.resolve(config.projectDir, "public", "index.html"));
  });

  return app;
}
