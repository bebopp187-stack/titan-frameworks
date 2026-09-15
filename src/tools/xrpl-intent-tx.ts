import { XRPL_INTENT_TX_DESCRIPTION } from "../mcp/tool-copy.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { XrplIntentInputSchema, XrplIntentOutputSchema } from "../types/index.js";
import { xrplIntentTx } from "../services/xrpl-intents.js";
import { jsonError, jsonToolResult } from "../services/tool-result.js";
import { timedQuery } from "../services/query-log.js";

export function registerXrplIntentTxTool(server: McpServer): void {
  server.registerTool(
    "draft_xrpl_intent_tx",
    {
      title: "Draft XRPL Intent Transaction",
      description: XRPL_INTENT_TX_DESCRIPTION,
      inputSchema: XrplIntentInputSchema,
      outputSchema: XrplIntentOutputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ intent, language }) => {
      try {
        return await timedQuery("xrpl", "draft_xrpl_intent_tx", async () =>
          jsonToolResult(xrplIntentTx(intent, language)),
        );
      } catch (err) {
        return jsonError((err as Error).message);
      }
    },
  );
}
