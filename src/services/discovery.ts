/** Public MCP tool + x402 bazaar metadata for Smithery, PayAI, x402scan, and the MCP registry. */

import {
  AGENT_INSTRUCTIONS,
  DIAGNOSE_ERROR_DESCRIPTION,
  FETCH_SYNTAX_DESCRIPTION,
  LIST_DEPRECATIONS_DESCRIPTION,
  LIST_FRAMEWORKS_DESCRIPTION,
  RESOLVE_SYMBOL_DESCRIPTION,
  REVIEW_CODE_DESCRIPTION,
  REWRITE_CODE_DESCRIPTION,
  SEARCH_DOCS_DESCRIPTION,
  SERVER_DESCRIPTION,
  SERVER_DESCRIPTION_PAID,
  WORKING_EXAMPLE_DESCRIPTION,
  XRPL_INTENT_TX_DESCRIPTION,
} from "../mcp/tool-copy.js";

export const PRODUCTION_ORIGIN = "https://titan-frameworks-production.up.railway.app";
export const PRODUCTION_MCP_URL = `${PRODUCTION_ORIGIN}/mcp`;

const FRAMEWORKS = ["langchain", "llamaindex", "ollama", "xrpl"] as const;

const SEARCH_SCHEMA = {
  type: "object",
  required: ["framework", "query"],
  properties: {
    framework: {
      type: "string",
      enum: [...FRAMEWORKS],
      description: "One of langchain, llamaindex, ollama, or xrpl — the library the user is coding against",
    },
    query: {
      type: "string",
      description: "2–8 keywords or an API symbol. Not a stack trace (use diagnose_framework_error)",
    },
  },
} as const;

const SYNTAX_SCHEMA = {
  type: "object",
  required: ["framework", "topic"],
  properties: {
    framework: {
      type: "string",
      enum: [...FRAMEWORKS],
      description: "One of langchain, llamaindex, ollama, or xrpl — the library the user is coding against",
    },
    topic: {
      type: "string",
      description:
        "One topic word: agents, rag, chat, tools, streaming, wallet, payment, trustlines, channels, rlusd, hooks, or migration",
    },
  },
} as const;

const DIAGNOSE_SCHEMA = {
  type: "object",
  required: ["framework", "error_log"],
  properties: {
    framework: {
      type: "string",
      enum: [...FRAMEWORKS],
      description: "One of langchain, llamaindex, ollama, or xrpl — the library that threw the error",
    },
    error_log: {
      type: "string",
      description: "Raw traceback or exception text. Paste the error, not a question about it",
    },
  },
} as const;

const FRAMEWORK_PROP = {
  type: "string",
  enum: [...FRAMEWORKS],
  description: "One of langchain, llamaindex, ollama, or xrpl — the library the user is coding against",
} as const;

const REVIEW_SCHEMA = {
  type: "object",
  required: ["framework", "code"],
  properties: {
    framework: FRAMEWORK_PROP,
    code: {
      type: "string",
      description: "Source to lint before running. Not a stack trace (use diagnose_framework_error)",
    },
    filename: {
      type: "string",
      description: "Optional path used only in unified-diff headers",
    },
  },
} as const;

const RESOLVE_SCHEMA = {
  type: "object",
  required: ["framework", "symbol"],
  properties: {
    framework: FRAMEWORK_PROP,
    symbol: {
      type: "string",
      description: "API name or import path, e.g. ChatOpenAI, ServiceContext, RippleAPI",
    },
  },
} as const;

const EXAMPLE_SCHEMA = {
  type: "object",
  required: ["framework", "goal"],
  properties: {
    framework: FRAMEWORK_PROP,
    goal: {
      type: "string",
      description: "What to build: agent, rag, chat, lcel, payment, rlusd, trustline, …",
    },
    language: {
      type: "string",
      description: "python or typescript. Omit to take the best match",
    },
    runtime: {
      type: "string",
      description: "openai, ollama, or xrpl-testnet. Omit to take the best match",
    },
  },
} as const;

const XRPL_INTENT_SCHEMA = {
  type: "object",
  required: ["intent"],
  properties: {
    intent: {
      type: "string",
      description: "payment, trustline, rlusd, or channel — what the transaction should do",
    },
    language: {
      type: "string",
      description: "typescript (default) or python",
    },
  },
} as const;

const LIST_FRAMEWORKS_SCHEMA = {
  type: "object",
  properties: {},
} as const;

const LIST_DEPRECATIONS_SCHEMA = {
  type: "object",
  properties: {
    framework: {
      type: "string",
      description: "Optional. One of langchain, llamaindex, ollama, or xrpl. Omit to list every known deprecation",
    },
  },
} as const;

export const MCP_PUBLIC_TOOLS = [
  {
    name: "search_ai_framework_docs",
    description: SEARCH_DOCS_DESCRIPTION,
    inputSchema: SEARCH_SCHEMA,
  },
  {
    name: "fetch_latest_syntax",
    description: FETCH_SYNTAX_DESCRIPTION,
    inputSchema: SYNTAX_SCHEMA,
  },
  {
    name: "diagnose_framework_error",
    description: DIAGNOSE_ERROR_DESCRIPTION,
    inputSchema: DIAGNOSE_SCHEMA,
  },
  {
    name: "review_framework_code",
    description: REVIEW_CODE_DESCRIPTION,
    inputSchema: REVIEW_SCHEMA,
  },
  {
    name: "rewrite_framework_code",
    description: REWRITE_CODE_DESCRIPTION,
    inputSchema: REVIEW_SCHEMA,
  },
  {
    name: "resolve_symbol",
    description: RESOLVE_SYMBOL_DESCRIPTION,
    inputSchema: RESOLVE_SCHEMA,
  },
  {
    name: "fetch_working_example",
    description: WORKING_EXAMPLE_DESCRIPTION,
    inputSchema: EXAMPLE_SCHEMA,
  },
  {
    name: "draft_xrpl_intent_tx",
    description: XRPL_INTENT_TX_DESCRIPTION,
    inputSchema: XRPL_INTENT_SCHEMA,
  },
  {
    name: "list_supported_frameworks",
    description: LIST_FRAMEWORKS_DESCRIPTION,
    inputSchema: LIST_FRAMEWORKS_SCHEMA,
  },
  {
    name: "list_known_deprecations",
    description: LIST_DEPRECATIONS_DESCRIPTION,
    inputSchema: LIST_DEPRECATIONS_SCHEMA,
  },
] as const;

const SEARCH_EXAMPLE = { framework: "langchain", query: "LCEL agent RAG" };

const SEARCH_OUTPUT_EXAMPLE = {
  framework: "langchain",
  query: "LCEL agent RAG",
  hitCount: 1,
  hits: [
    {
      id: "langchain-lcel",
      title: "LCEL",
      url: "https://docs.langchain.com",
      score: 1,
      headingPath: "LCEL",
      chunk: "LangChain Expression Language composes runnables with the pipe operator.",
    },
  ],
};

const MCP_CALL_EXAMPLE = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "search_ai_framework_docs",
    arguments: SEARCH_EXAMPLE,
  },
};

/** x402 v2 bazaar extension. PayAI catalogs this after a settled verify. */
export function bazaarExtensions() {
  return {
    bazaar: {
      info: {
        input: {
          type: "mcp",
          toolName: "search_ai_framework_docs",
          description: MCP_PUBLIC_TOOLS[0].description,
          transport: "streamable-http",
          inputSchema: SEARCH_SCHEMA,
          example: SEARCH_EXAMPLE,
        },
        output: {
          type: "json",
          example: SEARCH_OUTPUT_EXAMPLE,
        },
      },
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          input: {
            type: "object",
            properties: {
              type: { type: "string", const: "mcp" },
              toolName: { type: "string" },
              description: { type: "string" },
              transport: { type: "string", enum: ["streamable-http"] },
              inputSchema: { type: "object" },
              example: { type: "object" },
            },
            required: ["type", "toolName", "inputSchema"],
            additionalProperties: false,
          },
          output: {
            type: "object",
            properties: {
              type: { type: "string" },
              example: { type: "object" },
            },
            required: ["type"],
          },
        },
        required: ["input"],
      },
    },
  };
}

/**
 * v1/x402scan discovery shape. Keep HTTP POST + JSON Schema + example body so
 * x402scan, CDP Bazaar, and PayAI's v1 fallback can all parse the 402.
 */
export function discoveryOutputSchema() {
  return {
    input: {
      type: "http",
      method: "POST",
      discoverable: true,
      bodyType: "json",
      schema: {
        type: "object",
        required: ["jsonrpc", "method"],
        properties: {
          jsonrpc: { type: "string", const: "2.0" },
          id: { type: ["string", "number"] },
          method: { type: "string" },
          params: { type: "object" },
        },
      },
      body: MCP_CALL_EXAMPLE,
    },
    output: {
      type: "json",
      example: SEARCH_OUTPUT_EXAMPLE,
    },
  };
}

export function mcpServerCard(version: string) {
  return {
    serverInfo: {
      name: "Titan Frameworks",
      version,
      description: SERVER_DESCRIPTION,
    },
    instructions: AGENT_INSTRUCTIONS,
    authentication: {
      required: false,
      schemes: ["x402"],
    },
    tools: MCP_PUBLIC_TOOLS,
    resources: [
      {
        name: "index-status",
        uri: "titan://index/status",
        description: "How many chunks are indexed per framework",
        mimeType: "application/json",
      },
    ],
    prompts: [],
  };
}

export function x402WellKnownIndex() {
  return {
    version: 1,
    resources: [PRODUCTION_MCP_URL],
  };
}

export function openApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Titan Frameworks MCP",
      version: "1.0.0",
      description: SERVER_DESCRIPTION_PAID,
    },
    servers: [{ url: PRODUCTION_ORIGIN }],
    paths: {
      "/mcp": {
        post: {
          operationId: "mcp",
          summary: "Streamable HTTP MCP (x402)",
          description:
            "JSON-RPC MCP endpoint. initialize, ping, and tools/list are free. tools/call requires $0.001 USDC on Base or 1000 drops XRP / 0.001 RLUSD, then runs a registered Titan tool.",
          "x-payment-info": {
            protocols: ["x402"],
            price: { mode: "fixed", currency: "USD", amount: "0.001" },
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: discoveryOutputSchema().input.schema,
                example: discoveryOutputSchema().input.body,
              },
            },
          },
          responses: {
            "200": {
              description: "MCP JSON-RPC response",
            },
            "402": {
              description: "Payment required (x402)",
            },
          },
        },
      },
    },
  };
}

/** Merge bazaar onto a client payment payload so PayAI can index even if the wallet client omitted extensions. */
export function withBazaarPayload(decoded: unknown, resource: { url: string; description: string; mimeType: string }) {
  if (!decoded || typeof decoded !== "object") return decoded;
  const rec = decoded as Record<string, unknown>;
  const existing = rec.extensions;
  const extensions =
    existing && typeof existing === "object"
      ? { ...(existing as Record<string, unknown>), ...bazaarExtensions() }
      : bazaarExtensions();
  const currentResource = rec.resource;
  return {
    ...rec,
    extensions,
    resource:
      currentResource && typeof currentResource === "object"
        ? { ...(currentResource as Record<string, unknown>), ...resource }
        : resource,
  };
}
