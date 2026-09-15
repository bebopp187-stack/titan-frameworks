import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools as registerCoreTools } from "../tools/index.js";

/** MCP tool registration. Framework param includes `xrpl` (xrpl.js / xrpl-py). */
export function registerTools(server: McpServer): void {
  registerCoreTools(server);
}

export { registerSearchDocsTool } from "../tools/search-docs.js";
export { registerFetchSyntaxTool } from "../tools/fetch-syntax.js";
export { registerDiagnoseErrorTool } from "../tools/diagnose-error.js";
