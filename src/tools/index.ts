import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchDocsTool } from "./search-docs.js";
import { registerFetchSyntaxTool } from "./fetch-syntax.js";
import { registerDiagnoseErrorTool } from "./diagnose-error.js";
import { registerReviewCodeTool } from "./review-code.js";
import { registerRewriteCodeTool } from "./rewrite-code.js";
import { registerResolveSymbolTool } from "./resolve-symbol.js";
import { registerWorkingExampleTool } from "./working-example.js";
import { registerXrplIntentTxTool } from "./xrpl-intent-tx.js";

export function registerTools(server: McpServer): void {
  registerSearchDocsTool(server);
  registerFetchSyntaxTool(server);
  registerDiagnoseErrorTool(server);
  registerReviewCodeTool(server);
  registerRewriteCodeTool(server);
  registerResolveSymbolTool(server);
  registerWorkingExampleTool(server);
  registerXrplIntentTxTool(server);
}
