import { readFileSync } from "node:fs";
import path from "node:path";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTitanServer, SERVER_INFO } from "./server.js";
import { attachX402, paymentRequiredBody, x402MockMiddleware } from "./services/x402.js";
import { projectRoot } from "./services/frameworks.js";
import { loadDocsIndex } from "./services/docs-store.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Authorization, X-PAYMENT, PAYMENT-SIGNATURE",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

attachX402(app);

app.get("/health", (_req, res) => {
  const index = loadDocsIndex();
  res.json({
    ok: true,
    server: SERVER_INFO.name,
    version: SERVER_INFO.version,
    chunks: index.chunks.length,
    updatedAt: index.updatedAt,
  });
});

app.get("/llms.txt", (_req, res) => {
  const file = path.join(projectRoot(), "llms.txt");
  res.type("text/plain").send(readFileSync(file, "utf8"));
});

app.get("/tools", (_req, res) => {
  res.json({
    tools: [
      "search_ai_framework_docs",
      "fetch_latest_syntax",
      "diagnose_framework_error",
    ],
    pricing: {
      httpMcp: "$0.001 USDC",
      network: "eip155:8453",
      enabled: process.env.X402_ENABLED === "true",
    },
  });
});

app.get("/.well-known/x402.json", (req, res) => {
  const resource = `${req.protocol}://${req.get("host") ?? "localhost"}/mcp`;
  res.json(paymentRequiredBody(resource));
});

app.get("/.well-known/mcp/server-card.json", (_req, res) => {
  res.json({
    serverInfo: {
      name: SERVER_INFO.title,
      version: SERVER_INFO.version,
    },
    authentication: { required: false, schemes: [] },
    tools: [
      {
        name: "search_ai_framework_docs",
        description:
          "Keyword search over locally indexed Markdown for langchain, llamaindex, or ollama.",
        inputSchema: {
          type: "object",
          required: ["framework", "query"],
          properties: {
            framework: { type: "string" },
            query: { type: "string" },
          },
        },
      },
      {
        name: "fetch_latest_syntax",
        description: "Working imports, snippets, and migration notes for a framework topic.",
        inputSchema: {
          type: "object",
          required: ["framework", "topic"],
          properties: {
            framework: { type: "string" },
            topic: { type: "string" },
          },
        },
      },
      {
        name: "diagnose_framework_error",
        description: "Match a stack trace against known deprecated APIs and return an exact fix.",
        inputSchema: {
          type: "object",
          required: ["framework", "error_log"],
          properties: {
            framework: { type: "string" },
            error_log: { type: "string" },
          },
        },
      },
    ],
    resources: [],
    prompts: [],
  });
});

app.all("/mcp", x402MockMiddleware, async (req, res) => {
  const server = createTitanServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

export default app;

const isVercel = Boolean(process.env.VERCEL);
if (!isVercel && process.env.MCP_STDIO !== "1") {
  const port = Number(process.env.PORT ?? 3333);
  app.listen(port, "0.0.0.0", () => {
    console.error(`Titan Frameworks HTTP MCP on http://0.0.0.0:${port}/mcp`);
  });
}
