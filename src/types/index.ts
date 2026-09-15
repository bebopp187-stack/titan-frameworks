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

export const ReviewInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library the snippet is written against"),
  code: z
    .string()
    .min(1)
    .max(100000)
    .describe("Source to lint before running. Not a stack trace (use diagnose_framework_error)"),
  filename: z.string().max(120).optional().describe("Optional path used only in unified-diff headers"),
});

export const ReviewIssueSchema = z.object({
  id: z.string(),
  deprecated: z.string(),
  replacement: z.string(),
  pattern: z.string(),
  line: z.number().int(),
  excerpt: z.string(),
  reason: z.string(),
  fix: z.string(),
  hunk: z.string(),
});

export const ReviewOutputSchema = z.object({
  framework: FrameworkIdSchema,
  matched: z.boolean(),
  issueCount: z.number().int(),
  issues: z.array(ReviewIssueSchema),
  hints: z.array(z.string()),
});

export const RewriteInputSchema = ReviewInputSchema;

export const RewriteAppliedSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
});

export const RewriteLeftoverSchema = z.object({
  id: z.string(),
  deprecated: z.string(),
  replacement: z.string(),
  pattern: z.string(),
  reason: z.string(),
  fix: z.string(),
});

export const RewriteOutputSchema = z.object({
  framework: FrameworkIdSchema,
  changed: z.boolean(),
  filename: z.string(),
  code: z.string(),
  diff: z.string(),
  applied: z.array(RewriteAppliedSchema),
  leftover: z.array(RewriteLeftoverSchema),
  notes: z.array(z.string()),
});

export const ResolveSymbolInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library that owns the symbol"),
  symbol: z
    .string()
    .min(1)
    .describe("API name or import path, e.g. ChatOpenAI, ServiceContext, RippleAPI"),
});

export const ResolveSymbolOutputSchema = z.object({
  framework: FrameworkIdSchema,
  matched: z.boolean(),
  symbol: z.string(),
  package: z.string(),
  install: z.string(),
  importLine: z.string(),
  call: z.string(),
  note: z.string(),
  aliases: z.array(z.string()),
  hints: z.array(z.string()),
});

export const WorkingExampleInputSchema = z.object({
  framework: z
    .string()
    .describe("One of langchain, llamaindex, ollama, or xrpl — the library the example should use"),
  goal: z
    .string()
    .min(1)
    .describe("What to build: agent, rag, chat, lcel, payment, rlusd, trustline, …"),
  language: z.string().optional().describe("python or typescript. Omit to take the best match"),
  runtime: z.string().optional().describe("openai, ollama, or xrpl-testnet. Omit to take the best match"),
});

export const WorkingExampleOutputSchema = z.object({
  framework: FrameworkIdSchema,
  matched: z.boolean(),
  id: z.string(),
  filename: z.string(),
  language: z.string(),
  runtime: z.string(),
  versions: z.array(z.string()),
  run: z.string(),
  code: z.string(),
  goals: z.array(z.string()),
  hints: z.array(z.string()),
});

export const XrplIntentInputSchema = z.object({
  intent: z
    .string()
    .min(1)
    .describe("payment, trustline, rlusd, or channel — what the transaction should do"),
  language: z.string().optional().describe("typescript (default) or python"),
});

export const XrplIntentOutputSchema = z.object({
  matched: z.boolean(),
  intent: z.string(),
  transactionType: z.string(),
  language: z.string(),
  requiredFields: z.array(z.string()),
  failureCodes: z.array(z.string()),
  notes: z.array(z.string()),
  skeleton: z.string(),
  submits: z.literal(false),
  movesFunds: z.literal(false),
  hints: z.array(z.string()),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;
export type SearchOutput = z.infer<typeof SearchOutputSchema>;
export type SyntaxInput = z.infer<typeof SyntaxInputSchema>;
export type SyntaxOutput = z.infer<typeof SyntaxOutputSchema>;
export type DiagnoseInput = z.infer<typeof DiagnoseInputSchema>;
export type DiagnoseOutput = z.infer<typeof DiagnoseOutputSchema>;
export type ReviewInput = z.infer<typeof ReviewInputSchema>;
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
export type RewriteInput = z.infer<typeof RewriteInputSchema>;
export type RewriteOutput = z.infer<typeof RewriteOutputSchema>;
export type ResolveSymbolInput = z.infer<typeof ResolveSymbolInputSchema>;
export type ResolveSymbolOutput = z.infer<typeof ResolveSymbolOutputSchema>;
export type WorkingExampleInput = z.infer<typeof WorkingExampleInputSchema>;
export type WorkingExampleOutput = z.infer<typeof WorkingExampleOutputSchema>;
export type XrplIntentInput = z.infer<typeof XrplIntentInputSchema>;
export type XrplIntentOutput = z.infer<typeof XrplIntentOutputSchema>;

export interface KnownError {
  id: string;
  framework: FrameworkId;
  deprecated: string;
  replacement: string;
  patterns: string[];
  codePatterns?: string[];
  rewrites?: { from: string; to: string }[];
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

export interface SymbolMapEntry {
  framework: FrameworkId;
  aliases: string[];
  symbol: string;
  package: string;
  install: string;
  importLine: string;
  call: string;
  note: string;
}

export interface WorkingExampleEntry {
  id: string;
  framework: FrameworkId;
  goals: string[];
  language: string;
  runtime: string;
  filename: string;
  versions: string[];
  run: string;
  code: string;
}

export interface XrplIntentEntry {
  intent: string;
  aliases: string[];
  transactionType: string;
  requiredFields: string[];
  failureCodes: string[];
  notes: string[];
  skeletons: { typescript: string; python: string };
}
