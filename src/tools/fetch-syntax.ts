import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SyntaxInputSchema, SyntaxOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { fetchLatestSyntax } from "../services/catalog.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";

export function registerFetchSyntaxTool(server: McpServer): void {
  server.registerTool(
    "fetch_latest_syntax",
    {
      title: "Fetch Latest Syntax",
      description:
        "Return working imports, code snippets, and migration notes for a framework topic (agents, rag, wallet, payment, trustlines, ...).",
      inputSchema: SyntaxInputSchema,
      outputSchema: SyntaxOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, topic }) => {
      try {
        return jsonToolResult(fetchLatestSyntax(normalizeFramework(framework), topic));
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
