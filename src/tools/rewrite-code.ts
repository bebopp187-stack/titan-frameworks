import { REWRITE_CODE_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RewriteInputSchema, RewriteOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { rewriteFrameworkCode } from "../services/code-review.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerRewriteCodeTool(server: McpServer): void {
  server.registerTool(
    "rewrite_framework_code",
    {
      title: "Rewrite Framework Code",
      description: REWRITE_CODE_DESCRIPTION,
      inputSchema: RewriteInputSchema,
      outputSchema: RewriteOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, code, filename }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "rewrite_framework_code", async () =>
          jsonToolResult(rewriteFrameworkCode(id, code, filename)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
