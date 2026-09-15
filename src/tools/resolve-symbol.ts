import { RESOLVE_SYMBOL_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResolveSymbolInputSchema, ResolveSymbolOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { resolveSymbol } from "../services/symbols.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerResolveSymbolTool(server: McpServer): void {
  server.registerTool(
    "resolve_symbol",
    {
      title: "Resolve Symbol",
      description: RESOLVE_SYMBOL_DESCRIPTION,
      inputSchema: ResolveSymbolInputSchema,
      outputSchema: ResolveSymbolOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, symbol }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "resolve_symbol", async () => jsonToolResult(resolveSymbol(id, symbol)));
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
