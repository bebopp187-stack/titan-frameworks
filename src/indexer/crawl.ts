import type { FrameworkId } from "../types/index.js";

/** Crawl target used by `npm run index-docs` / `src/services/indexer.ts`. */
export interface CrawlSourceSpec {
  llmsTxt: string[];
  releases: string;
  extra: string[];
  githubDocs?: { repo: string; path: string };
}

/**
 * xrpl.js (plus xrpl-py syntax references) — Client, Wallet, Payment Channels,
 * Trustlines, Issued Assets / RLUSD, and Hooks notes.
 */
export const XRPL_CRAWL_TARGET: CrawlSourceSpec = {
  llmsTxt: ["https://xrpl.org/llms.txt", "https://js.xrpl.org/llms.txt"],
  releases: "https://api.github.com/repos/XRPLF/xrpl.js/releases?per_page=8",
  extra: [
    "https://raw.githubusercontent.com/XRPLF/xrpl.js/main/README.md",
    "https://raw.githubusercontent.com/XRPLF/xrpl.js/main/MIGRATION.md",
    "https://raw.githubusercontent.com/XRPLF/xrpl.js/main/PACKAGES.md",
    "https://raw.githubusercontent.com/XRPLF/xrpl-py/master/README.md",
    "https://xrpl.org/docs/references/http-websocket-apis",
    "https://xrpl.org/docs/concepts/payment-types",
    "https://xrpl.org/docs/concepts/payment-types/payment-channels",
    "https://xrpl.org/docs/concepts/tokens/fungible-tokens",
    "https://xrpl.org/docs/concepts/tokens/decentralized-exchange/offers",
    "https://xrpl.org/docs/tutorials/javascript/send-payments",
    "https://js.xrpl.org/classes/Client.html",
    "https://js.xrpl.org/classes/Wallet.html",
    "https://xrpl.org/docs/references/protocol/transactions/types/payment",
    "https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate",
    "https://xrpl.org/docs/references/protocol/transactions/types/trustset",
    "https://xrpl.org/docs/tutorials/how-tos/use-tokens/issue-a-fungible-token",
  ],
  githubDocs: { repo: "XRPLF/xrpl.js", path: "docs" },
};

export const XRPL_FRAMEWORK_KEY = "xrpl" as const satisfies FrameworkId;

export function crawlTargets(): Record<"xrpl", CrawlSourceSpec> {
  return { xrpl: XRPL_CRAWL_TARGET };
}
