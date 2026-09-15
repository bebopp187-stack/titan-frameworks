import { buildDocsIndex, writeDocsIndex } from "../src/services/indexer.js";
import { enabledFrameworks } from "../src/services/framework-config.js";

async function main(): Promise<void> {
  const index = await buildDocsIndex({ frameworks: enabledFrameworks() });
  const { jsonPath, sqlitePath } = writeDocsIndex(index);
  console.log(`Wrote ${index.chunks.length} chunks`);
  console.log(`JSON   ${jsonPath}`);
  console.log(`SQLite ${sqlitePath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
