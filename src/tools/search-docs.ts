import { SEARCH_DOCS_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SearchInputSchema, SearchOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { searchFrameworkDocs } from "../services/search.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerSearchDocsTool(server: McpServer): void {
  server.registerTool(
    "search_ai_framework_docs",
    {
      title: "Search AI Framework Docs",
      description: SEARCH_DOCS_DESCRIPTION,
      inputSchema: SearchInputSchema,
      outputSchema: SearchOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, query }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "search_ai_framework_docs", async () =>
          jsonToolResult(searchFrameworkDocs(id, query)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
