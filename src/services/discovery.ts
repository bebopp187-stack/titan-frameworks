/** Public MCP tool + x402 bazaar metadata for Smithery, PayAI, x402scan, and the MCP registry. */

export const PRODUCTION_ORIGIN = "https://titan-frameworks-production.up.railway.app";
export const PRODUCTION_MCP_URL = `${PRODUCTION_ORIGIN}/mcp`;

const FRAMEWORKS = ["langchain", "llamaindex", "ollama", "xrpl"] as const;

const SEARCH_SCHEMA = {
  type: "object",
  required: ["framework", "query"],
  properties: {
    framework: { type: "string", enum: [...FRAMEWORKS] },
    query: { type: "string", description: "Keyword or natural-language search query" },
  },
} as const;

const SYNTAX_SCHEMA = {
  type: "object",
  required: ["framework", "topic"],
  properties: {
    framework: { type: "string", enum: [...FRAMEWORKS] },
    topic: {
      type: "string",
      description: "agents | rag | chat | tools | streaming | wallet | payment | migration",
    },
  },
} as const;

const DIAGNOSE_SCHEMA = {
  type: "object",
  required: ["framework", "error_log"],
  properties: {
    framework: { type: "string", enum: [...FRAMEWORKS] },
    error_log: { type: "string", description: "Stack trace or error message to match" },
  },
} as const;

export const MCP_PUBLIC_TOOLS = [
  {
    name: "search_ai_framework_docs",
    description:
      "Keyword search over locally indexed Markdown for langchain, llamaindex, ollama, or xrpl.",
    inputSchema: SEARCH_SCHEMA,
  },
  {
    name: "fetch_latest_syntax",
    description: "Working imports, snippets, and migration notes for a framework topic.",
    inputSchema: SYNTAX_SCHEMA,
  },
  {
    name: "diagnose_framework_error",
    description: "Match a stack trace against known deprecated APIs and return an exact fix.",
    inputSchema: DIAGNOSE_SCHEMA,
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
    },
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
      description:
        "Paid Streamable HTTP MCP for live LangChain, LlamaIndex, Ollama, and XRPL docs.",
    },
    servers: [{ url: PRODUCTION_ORIGIN }],
    paths: {
      "/mcp": {
        post: {
          operationId: "mcp",
          summary: "Streamable HTTP MCP (x402)",
          description:
            "JSON-RPC MCP endpoint. Pay $0.001 USDC on Base or 1000 drops XRP / 0.001 RLUSD, then call search_ai_framework_docs, fetch_latest_syntax, or diagnose_framework_error.",
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
