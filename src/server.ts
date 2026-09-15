import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import { loadDocsIndex } from "./services/docs-store.js";

export const SERVER_INFO = {
  name: "titan-frameworks",
  version: "1.0.0",
  title: "Titan Frameworks",
  websiteUrl: "https://docs.langchain.com",
};

export function createTitanServer(): McpServer {
  const server = new McpServer({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    title: SERVER_INFO.title,
  });

  registerTools(server);

  server.registerResource(
    "index-status",
    "titan://index/status",
    {
      title: "Docs index status",
      description: "How many chunks are indexed per framework",
      mimeType: "application/json",
    },
    async () => {
      const index = loadDocsIndex();
      return {
        contents: [
          {
            uri: "titan://index/status",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                updatedAt: index.updatedAt,
                frameworks: index.frameworks,
                chunkCount: index.chunks.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  return server;
}
