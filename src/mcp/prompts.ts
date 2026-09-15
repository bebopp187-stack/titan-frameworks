import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const FrameworkArg = z.string().describe("langchain, llamaindex, ollama, or xrpl");

export const MCP_PUBLIC_PROMPTS = [
  {
    name: "migrate_framework_code",
    description:
      "Review then rewrite a snippet against current LangChain, LlamaIndex, Ollama, or XRPL APIs. Use when you have source, not a stack trace.",
  },
  {
    name: "diagnose_stack_trace",
    description:
      "Match a traceback to a known deprecated API and return the replacement. Use only when you have an error_log.",
  },
  {
    name: "start_from_example",
    description:
      "Fetch a complete runnable file for a goal such as agent, rag, chat, payment, or rlusd.",
  },
] as const;

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "migrate_framework_code",
    {
      title: "Migrate Framework Code",
      description: MCP_PUBLIC_PROMPTS[0].description,
      argsSchema: {
        framework: FrameworkArg,
        code: z.string().describe("Source to lint and patch"),
        filename: z.string().optional().describe("Optional path for diff headers"),
      },
    },
    async ({ framework, code, filename }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Migrate this ${framework} snippet to current APIs.`,
              "Call review_framework_code first, then rewrite_framework_code if there are hits.",
              "Do not execute or submit anything. Catalog-backed only.",
              filename ? `filename: ${filename}` : "",
              "",
              "```",
              code,
              "```",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "diagnose_stack_trace",
    {
      title: "Diagnose Stack Trace",
      description: MCP_PUBLIC_PROMPTS[1].description,
      argsSchema: {
        framework: FrameworkArg,
        error_log: z.string().describe("Raw traceback or exception text"),
      },
    },
    async ({ framework, error_log }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call diagnose_framework_error for ${framework} with this error_log. If matched=false, call search_ai_framework_docs with the failing symbol.\n\n${error_log}`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "start_from_example",
    {
      title: "Start From Example",
      description: MCP_PUBLIC_PROMPTS[2].description,
      argsSchema: {
        framework: FrameworkArg,
        goal: z.string().describe("What to build: agent, rag, chat, payment, rlusd, …"),
        language: z.string().optional().describe("python or typescript"),
      },
    },
    async ({ framework, goal, language }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call fetch_working_example for ${framework} with goal ${JSON.stringify(goal)}${language ? ` and language ${language}` : ""}. If matched=false, call fetch_latest_syntax for the same topic.`,
          },
        },
      ],
    }),
  );
}
