import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { z } from "zod";
import { config } from "./config.js";
import { createRequest, updateRequest } from "./database.js";
import { generateImage } from "./browser.js";
import { uploadToImgBB } from "./imgbb.js";
import { createAdminApp } from "./admin.js";

function createMcpServer() {
  const server = new McpServer({
    name: "local-chatgpt-image-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "generate_and_upload_image",
    {
      title: "Generate image and upload to ImgBB",
      description: "Use the configured local ChatGPT browser profile to generate an image, save it locally, upload it to ImgBB, and record the request in SQLite.",
      inputSchema: {
        prompt: z.string().trim().min(1).max(12000).describe("The exact image-generation prompt")
      }
    },
    async ({ prompt }) => {
      const startedAt = Date.now();
      const requestId = createRequest(prompt);

      try {
        updateRequest(requestId, { status: "generating" });

        const generated = await generateImage(prompt, requestId);
        updateRequest(requestId, {
          status: "uploading",
          local_path: generated.imagePath
        });

        const uploaded = await uploadToImgBB(generated.imagePath);

        updateRequest(requestId, {
          status: "completed",
          completed_at: new Date().toISOString(),
          local_path: generated.imagePath,
          imgbb_url: uploaded.url,
          display_url: uploaded.displayUrl,
          duration_ms: Date.now() - startedAt
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              request_id: requestId,
              image_url: uploaded.url,
              display_url: uploaded.displayUrl,
              local_path: generated.imagePath,
              image_size_bytes: generated.size,
              duration_ms: Date.now() - startedAt
            }, null, 2)
          }]
        };
      } catch (error) {
        updateRequest(requestId, {
          status: "failed",
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          duration_ms: Date.now() - startedAt
        });

        return {
          isError: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              request_id: requestId,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );

  return server;
}

const app = createAdminApp();
app.use(express.json({ limit: "10mb" }));

// Enable CORS and preflight handling for web-based MCP clients (like MCP Inspector)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id, mcp-protocol-version, last-event-id");
  res.header("Access-Control-Expose-Headers", "mcp-session-id");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Map of active Streamable HTTP sessions
const sessions = new Map();

function checkIsInit(body) {
  if (Array.isArray(body)) {
    return body.some(isInitializeRequest);
  }
  return isInitializeRequest(body);
}

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  try {
    let session = sessionId ? sessions.get(sessionId) : undefined;
    let transport;

    if (session) {
      transport = session.transport;
    } else if (!sessionId && checkIsInit(req.body)) {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          sessions.set(sid, { transport, server });
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && sessions.has(sid)) {
          sessions.delete(sid);
        }
      };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else if (sessionId) {
      res.status(404).json({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
      return;
    } else {
      // Stateless request support
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        transport.close();
        server.close();
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP POST error:", error);
    if (!res.headersSent) res.status(500).json({ error: "MCP request failed" });
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId) {
    res.status(400).send("Missing session ID");
    return;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
    return;
  }
  try {
    await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error("MCP GET error:", error);
    if (!res.headersSent) res.status(500).end();
  }
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId) {
    res.status(400).send("Missing session ID");
    return;
  }
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
    return;
  }
  try {
    await session.transport.handleRequest(req, res);
  } catch (error) {
    console.error("MCP DELETE error:", error);
    if (!res.headersSent) res.status(500).end();
  } finally {
    sessions.delete(sessionId);
    try {
      await session.transport.close();
      await session.server.close();
    } catch {}
  }
});

app.listen(config.adminPort, config.adminHost, () => {
  console.error(`Admin panel: http://${config.adminHost}:${config.adminPort}`);
  console.error(`MCP endpoint: http://${config.adminHost}:${config.adminPort}/mcp`);
  console.error(`Using browser profile: ${config.profileDir}`);
});
