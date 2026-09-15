import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchDocsTool } from "./search-docs.js";
import { registerFetchSyntaxTool } from "./fetch-syntax.js";
import { registerDiagnoseErrorTool } from "./diagnose-error.js";
import { registerReviewCodeTool } from "./review-code.js";
import { registerRewriteCodeTool } from "./rewrite-code.js";
import { registerResolveSymbolTool } from "./resolve-symbol.js";
import { registerWorkingExampleTool } from "./working-example.js";
import { registerXrplIntentTxTool } from "./xrpl-intent-tx.js";
import { registerListFrameworksTool } from "./list-frameworks.js";
import { registerListDeprecationsTool } from "./list-deprecations.js";

export function registerTools(server: McpServer): void {
  registerReviewCodeTool(server);
  registerRewriteCodeTool(server);
  registerDiagnoseErrorTool(server);
  registerResolveSymbolTool(server);
  registerWorkingExampleTool(server);
  registerFetchSyntaxTool(server);
  registerSearchDocsTool(server);
  registerXrplIntentTxTool(server);
  registerListFrameworksTool(server);
  registerListDeprecationsTool(server);
}
