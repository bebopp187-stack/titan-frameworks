import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchDocsTool } from "./search-docs.js";
import { registerFetchSyntaxTool } from "./fetch-syntax.js";
import { registerDiagnoseErrorTool } from "./diagnose-error.js";

export function registerTools(server: McpServer): void {
  registerSearchDocsTool(server);
  registerFetchSyntaxTool(server);
  registerDiagnoseErrorTool(server);
}
