import { REVIEW_CODE_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReviewInputSchema, ReviewOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { reviewFrameworkCode } from "../services/code-review.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerReviewCodeTool(server: McpServer): void {
  server.registerTool(
    "review_framework_code",
    {
      title: "Review Framework Code",
      description: REVIEW_CODE_DESCRIPTION,
      inputSchema: ReviewInputSchema,
      outputSchema: ReviewOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, code, filename }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "review_framework_code", async () =>
          jsonToolResult(reviewFrameworkCode(id, code, filename)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
