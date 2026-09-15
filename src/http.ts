import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createTitanServer, SERVER_INFO } from "./server.js";
import { attachX402, paymentRequiredBody, publicMcpResource, x402MockMiddleware, xrplNetwork, xrplPriceDrops } from "./services/x402.js";
import { MCP_PUBLIC_TOOLS, mcpServerCard, openApiDocument, x402WellKnownIndex } from "./services/discovery.js";
import { projectRoot } from "./services/frameworks.js";
import { loadDocsIndex } from "./services/docs-store.js";
import { recordMcpCall } from "./services/earnings.js";

const app = express();
app.set("trust proxy", 1);
app.use((req, res, nextFn) => {
  if (
    req.path === "/admin" ||
    req.path.startsWith("/admin/") ||
    req.path.startsWith("/api/admin") ||
    req.path.startsWith("/_next")
  ) {
    nextFn();
    return;
  }
  express.json({ limit: "1mb" })(req, res, nextFn);
});
app.use((req, res, next) => {
  if (!(req.path === "/admin" || req.path.startsWith("/admin/") || req.path.startsWith("/api/admin") || req.path.startsWith("/_next"))) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Authorization, X-PAYMENT, PAYMENT-SIGNATURE, X-Payment-Signature",
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
    tools: MCP_PUBLIC_TOOLS.map((tool) => tool.name),
    frameworks: ["langchain", "llamaindex", "ollama", "xrpl"],
    pricing: {
      httpMcp: "$0.001 USDC or 1000 drops XRP / 0.001 RLUSD",
      networks: ["eip155:8453", xrplNetwork()],
      xrpDrops: xrplPriceDrops(),
      enabled: process.env.X402_ENABLED === "true",
      xrplLive: process.env.X402_XRPL_LIVE === "true",
      usdcLive: process.env.X402_USDC_LIVE === "true",
    },
  });
});

app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument());
});

app.get("/.well-known/x402", (_req, res) => {
  res.json(x402WellKnownIndex());
});

app.get("/.well-known/x402.json", (req, res) => {
  res.json(paymentRequiredBody(publicMcpResource(req)));
});

app.get("/.well-known/mcp/server-card.json", (_req, res) => {
  res.json(mcpServerCard(SERVER_INFO.version));
});

app.all("/mcp", x402MockMiddleware, async (req, res) => {
  const accept = String(req.headers.accept ?? "");
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    req.headers.accept = "application/json, text/event-stream";
  }
  recordMcpCall();
  const server = createTitanServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

export default app;

type NextFactory = (opts: { dev?: boolean; dir?: string }) => {
  prepare: () => Promise<void>;
  getRequestHandler: () => (req: IncomingMessage, res: ServerResponse) => unknown;
};

async function start(): Promise<void> {
  if (process.env.VERCEL || process.env.MCP_STDIO === "1") return;
  const require = createRequire(import.meta.url);
  const loaded = require("next") as NextFactory | { default: NextFactory };
  const createNext = typeof loaded === "function" ? loaded : loaded.default;
  const dev = process.env.NODE_ENV !== "production";
  const nextApp = createNext({ dev, dir: projectRoot() });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();
  app.use((req, res) => {
    void handle(req, res);
  });
  const port = Number(process.env.PORT ?? 3333);
  app.listen(port, "0.0.0.0", () => {
    console.error(`Titan Frameworks HTTP MCP on http://0.0.0.0:${port}/mcp`);
    console.error(`Admin dashboard on http://0.0.0.0:${port}/admin`);
  });
}

void start().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
