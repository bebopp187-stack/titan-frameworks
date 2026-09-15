import { LIST_DEPRECATIONS_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListDeprecationsInputSchema, ListDeprecationsOutputSchema } from "../types/index.js";
import { listKnownDeprecations } from "../services/list-catalogs.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerListDeprecationsTool(server: McpServer): void {
  server.registerTool(
    "list_known_deprecations",
    {
      title: "List Known Deprecations",
      description: LIST_DEPRECATIONS_DESCRIPTION,
      inputSchema: ListDeprecationsInputSchema,
      outputSchema: ListDeprecationsOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework }) => {
      try {
        const scoped = framework?.trim() || "all";
        return await timedQuery(scoped, "list_known_deprecations", async () =>
          jsonToolResult(listKnownDeprecations(framework)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
