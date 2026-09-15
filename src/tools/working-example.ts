import { WORKING_EXAMPLE_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WorkingExampleInputSchema, WorkingExampleOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { workingExample } from "../services/examples.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerWorkingExampleTool(server: McpServer): void {
  server.registerTool(
    "fetch_working_example",
    {
      title: "Fetch Working Example",
      description: WORKING_EXAMPLE_DESCRIPTION,
      inputSchema: WorkingExampleInputSchema,
      outputSchema: WorkingExampleOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, goal, language, runtime }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "fetch_working_example", async () =>
          jsonToolResult(workingExample(id, goal, language, runtime)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
