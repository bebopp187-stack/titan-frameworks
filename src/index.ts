import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTitanServer } from "./server.js";

async function main(): Promise<void> {
  const server = createTitanServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
