import { mcpHttpRequiresPayment } from "../src/services/x402.js";

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "glama", version: "0" } },
};
const toolsList = { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} };
const toolsCall = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: { name: "search_ai_framework_docs", arguments: { framework: "langchain", query: "LCEL" } },
};

const listFrameworks = {
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: { name: "list_supported_frameworks", arguments: {} },
};

const cases: Array<[string, boolean, string, unknown]> = [
  ["GET session is free", false, "GET", undefined],
  ["DELETE session is free", false, "DELETE", undefined],
  ["initialize is free", false, "POST", initialize],
  ["tools/list is free", false, "POST", toolsList],
  ["tools/call is paid", true, "POST", toolsCall],
  ["list_supported_frameworks is free", false, "POST", listFrameworks],
  ["batch with paid tools/call is paid", true, "POST", [initialize, toolsCall]],
  ["batch with only list_supported_frameworks is free", false, "POST", [initialize, listFrameworks]],
  ["empty POST is not billed", false, "POST", {}],
];

let failed = 0;
for (const [label, expected, method, body] of cases) {
  const actual = mcpHttpRequiresPayment(method, body);
  if (actual !== expected) {
    console.error(`fail: ${label} (got ${actual}, expected ${expected})`);
    failed += 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

if (failed > 0) process.exit(1);
