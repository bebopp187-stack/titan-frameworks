import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiagnoseInputSchema, DiagnoseOutputSchema } from "../types/index.js";
import { normalizeFramework } from "../services/frameworks.js";
import { diagnoseFrameworkError } from "../services/catalog.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerDiagnoseErrorTool(server: McpServer): void {
  server.registerTool(
    "diagnose_framework_error",
    {
      title: "Diagnose Framework Error",
      description:
        "Match a stack trace against known deprecated APIs for langchain, llamaindex, ollama, or xrpl and return an exact fix.",
      inputSchema: DiagnoseInputSchema,
      outputSchema: DiagnoseOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ framework, error_log }) => {
      try {
        const id = normalizeFramework(framework);
        return await timedQuery(id, "diagnose_framework_error", async () =>
          jsonToolResult(diagnoseFrameworkError(id, error_log)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
