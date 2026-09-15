import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SearchInputSchema, SearchOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { searchFrameworkDocs } from "../services/search.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";

export function registerSearchDocsTool(server: McpServer): void {
  server.registerTool(
    "search_ai_framework_docs",
    {
      title: "Search AI Framework Docs",
      description:
        "Keyword search over locally indexed Markdown for langchain, llamaindex, or ollama. Returns compact chunks.",
      inputSchema: SearchInputSchema,
      outputSchema: SearchOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, query }) => {
      try {
        return jsonToolResult(searchFrameworkDocs(normalizeFramework(framework), query));
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
