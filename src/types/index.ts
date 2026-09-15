import { z } from "zod";

export const FRAMEWORK_IDS = ["langchain", "llamaindex", "ollama"] as const;
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
    .describe("Target library: langchain | llamaindex | ollama"),
  query: z.string().min(1).describe("Keyword or natural-language search query"),
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
    .describe("Target library: langchain | llamaindex | ollama"),
  topic: z
    .string()
    .min(1)
    .describe("Topic such as agents, rag, chat, tools, streaming, migration"),
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
    .describe("Target library: langchain | llamaindex | ollama"),
  error_log: z.string().min(1).describe("Stack trace or error message to match"),
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
