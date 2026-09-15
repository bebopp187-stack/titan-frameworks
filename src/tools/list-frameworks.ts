import { LIST_FRAMEWORKS_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListFrameworksInputSchema, ListFrameworksOutputSchema } from "../types/index.js";
import { listSupportedFrameworks } from "../services/list-catalogs.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerListFrameworksTool(server: McpServer): void {
  server.registerTool(
    "list_supported_frameworks",
    {
      title: "List Supported Frameworks",
      description: LIST_FRAMEWORKS_DESCRIPTION,
      inputSchema: ListFrameworksInputSchema,
      outputSchema: ListFrameworksOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return await timedQuery("all", "list_supported_frameworks", async () =>
          jsonToolResult(listSupportedFrameworks()),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
