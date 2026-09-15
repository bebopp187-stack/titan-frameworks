import { FETCH_SYNTAX_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SyntaxInputSchema, SyntaxOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { fetchLatestSyntax } from "../services/catalog.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerFetchSyntaxTool(server: McpServer): void {
  server.registerTool(
    "fetch_latest_syntax",
    {
      title: "Fetch Latest Syntax",
      description: FETCH_SYNTAX_DESCRIPTION,
      inputSchema: SyntaxInputSchema,
      outputSchema: SyntaxOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, topic }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "fetch_latest_syntax", async () =>
          jsonToolResult(fetchLatestSyntax(id, topic)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
