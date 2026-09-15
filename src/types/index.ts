import { z } from "zod";

export const FRAMEWORK_IDS = ["langchain", "llamaindex", "ollama", "xrpl"] as const;
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

export const FrameworkIdSchema = z.enum(FRAMEWORK_IDS);

export interface DocChunk {
  id: string;
  framework: FrameworkId;
  title: string;
  url: string;
  source: string;
  headingPath: string;
  text: string;
  tokens: number;
  updatedAt: string;
}

export interface DocsIndex {
  version: 1;
  updatedAt: string;
  frameworks: Partial<
    Record<
      FrameworkId,
      {
        displayName: string;
        indexedAt: string;
        chunkCount: number;
        sources: string[];
      }
    >
  >;
  chunks: DocChunk[];
}

export const SearchInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library the user is coding against"),
  query: z
    .string()
    .min(1)
    .describe("2–8 keywords or an API symbol. Not a stack trace (use diagnose_framework_error)"),
});

export const SearchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  score: z.number(),
  headingPath: z.string(),
  chunk: z.string(),
});

export const SearchOutputSchema = z.object({
  framework: FrameworkIdSchema,
  query: z.string(),
  hitCount: z.number().int(),
  hits: z.array(SearchHitSchema),
});

export const SyntaxInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library the user is coding against"),
  topic: z
    .string()
    .min(1)
    .describe(
      "One topic word: agents, rag, chat, tools, streaming, wallet, payment, trustlines, channels, rlusd, hooks, or migration",
    ),
});

export const SyntaxOutputSchema = z.object({
  framework: FrameworkIdSchema,
  topic: z.string(),
  versionNote: z.string(),
  imports: z.array(z.string()),
  snippets: z.array(
    z.object({
      title: z.string(),
      language: z.string(),
      code: z.string(),
    }),
  ),
  migrationNotes: z.array(z.string()),
  relatedDocs: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    }),
  ),
});

export const DiagnoseInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library that threw the error"),
  error_log: z
    .string()
    .min(1)
    .describe("Raw traceback or exception text. Paste the error, not a question about it"),
});

export const DiagnoseOutputSchema = z.object({
  framework: FrameworkIdSchema,
  matched: z.boolean(),
  matches: z.array(
    z.object({
      id: z.string(),
      deprecated: z.string(),
      replacement: z.string(),
      confidence: z.number(),
      reason: z.string(),
      fix: z.string(),
      snippet: z.string().optional(),
    }),
  ),
  hints: z.array(z.string()),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;
export type SearchOutput = z.infer<typeof SearchOutputSchema>;
export type SyntaxInput = z.infer<typeof SyntaxInputSchema>;
export type SyntaxOutput = z.infer<typeof SyntaxOutputSchema>;
export type DiagnoseInput = z.infer<typeof DiagnoseInputSchema>;
export type DiagnoseOutput = z.infer<typeof DiagnoseOutputSchema>;

export interface KnownError {
  id: string;
  framework: FrameworkId;
  deprecated: string;
  replacement: string;
  patterns: string[];
  reason: string;
  fix: string;
  snippet?: string;
}

export interface SyntaxEntry {
  id: string;
  framework: FrameworkId;
  topics: string[];
  versionNote: string;
  imports: string[];
  snippets: { title: string; language: string; code: string }[];
  migrationNotes: string[];
  relatedDocs: { title: string; url: string }[];
}
