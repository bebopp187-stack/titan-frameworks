import { buildDocsIndex, writeDocsIndex } from "../src/services/indexer.js";

async function main(): Promise<void> {
  const index = await buildDocsIndex();
  const { jsonPath, sqlitePath } = writeDocsIndex(index);
  console.log(`Wrote ${index.chunks.length} chunks`);
  console.log(`JSON   ${jsonPath}`);
  console.log(`SQLite ${sqlitePath}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
