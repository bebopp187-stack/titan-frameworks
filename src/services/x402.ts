import type { NextFunction, Request, Response, Express } from "express";
import { recordSettlement } from "./earnings.js";
import { bazaarExtensions, discoveryOutputSchema, withBazaarPayload } from "./discovery.js";

/** USDC on Base mainnet (6 decimals). $0.001 = 1000 atomic units. */
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const X402_PRICE_USDC = "0.001";
export const X402_ATOMIC = "1000";
export const X402_NETWORK = "eip155:8453";
export const USDC_FACILITATOR_DEFAULT = "https://facilitator.payai.network";

/** RLUSD 40-hex currency code on XRPL. */
export const RLUSD_HEX = "524C555344000000000000000000000000000000";
/** Ripple USD (RLUSD) issuer on XRPL mainnet. Override with XRPL_RLUSD_ISSUER. */
export const RLUSD_ISSUER_MAINNET = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
export const DEFAULT_XRPL_SOURCE_TAG = "804681468";

export type XrplNetwork = "xrpl:0" | "xrpl:1";

export function xrplNetwork(): XrplNetwork {
  const raw = (process.env.XRPL_NETWORK ?? "xrpl:1").trim();
  return raw === "xrpl:0" ? "xrpl:0" : "xrpl:1";
}

export function xrplPayTo(): string {
  return (
    process.env.XRPL_PAY_TO_ADDRESS ??
    process.env.XRPL_PAY_TO ??
    "rkpckEddjHhS2vvg7sR3Gb3BX3CVzE2kb"
  );
}

export function xrplPriceDrops(): string {
  return process.env.XRPL_PRICE_DROPS || "1000";
}

export function xrplSourceTag(): number {
  const n = Number(process.env.XRPL_SOURCE_TAG ?? DEFAULT_XRPL_SOURCE_TAG);
  return Number.isFinite(n) ? n : Number(DEFAULT_XRPL_SOURCE_TAG);
}

export const XRPL_FACILITATOR_MAINNET = "https://xrpl-facilitator-mainnet.t54.ai";
export const XRPL_FACILITATOR_TESTNET = "https://xrpl-facilitator-testnet.t54.ai";

export function xrplFacilitatorUrl(): string {
  const override = process.env.XRPL_FACILITATOR_URL?.trim();
  if (override) return override;
  return xrplNetwork() === "xrpl:0" ? XRPL_FACILITATOR_MAINNET : XRPL_FACILITATOR_TESTNET;
}

export function xrplRlusdIssuer(): string {
  return process.env.XRPL_RLUSD_ISSUER ?? RLUSD_ISSUER_MAINNET;
}

export function usdcPayTo(): string {
  return process.env.X402_PAY_TO ?? "0x584c004037bc369b3b49bd18381a5a6d0c1c1215";
}

export function usdcFacilitatorUrl(): string {
  return process.env.X402_USDC_FACILITATOR_URL?.trim() || USDC_FACILITATOR_DEFAULT;
}

function xrplLive(): boolean {
  return process.env.X402_XRPL_LIVE === "true";
}

function usdcLive(): boolean {
  return process.env.X402_USDC_LIVE === "true";
}

export function usdcAccept(resource: string) {
  const payTo = usdcPayTo();
  const facilitatorUrl = usdcFacilitatorUrl();
  return {
    scheme: "exact" as const,
    network: X402_NETWORK,
    maxAmountRequired: X402_ATOMIC,
    amount: X402_ATOMIC,
    resource,
    description: "Titan Frameworks MCP tool call (USDC)",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 60,
    asset: USDC_BASE,
    extra: {
      name: "USD Coin",
      version: "2",
      priceUsd: X402_PRICE_USDC,
      facilitatorUrl,
    },
  };
}

export function xrplAccepts(resource: string) {
  const payTo = xrplPayTo();
  const network = xrplNetwork();
  const facilitatorUrl = xrplFacilitatorUrl();
  const sourceTag = xrplSourceTag();
  const drops = xrplPriceDrops();
  const rlusdPrice = process.env.XRPL_PRICE_RLUSD || "0.001";

  const xrp = {
    scheme: "exact" as const,
    network,
    maxAmountRequired: drops,
    amount: drops,
    resource,
    description: "Titan Frameworks MCP tool call (XRP)",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 600,
    asset: "XRP",
    price: drops,
    sourceTag,
    facilitatorUrl,
    extra: {
      name: "XRP",
      sourceTag,
      facilitatorUrl,
      invoiceId: `titan-${Date.now()}`,
    },
  };

  const rlusd = {
    scheme: "exact" as const,
    network,
    maxAmountRequired: rlusdPrice,
    amount: rlusdPrice,
    resource,
    description: "Titan Frameworks MCP tool call (RLUSD)",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 600,
    asset: "RLUSD",
    price: rlusdPrice,
    sourceTag,
    facilitatorUrl,
    extra: {
      name: "RLUSD",
      sourceTag,
      facilitatorUrl,
      issuer: xrplRlusdIssuer(),
      currencyHex: RLUSD_HEX,
      invoiceId: `titan-rlusd-${Date.now()}`,
    },
  };

  return [xrp, rlusd];
}

export function mcpResourceInfo(url: string) {
  return {
    url,
    description:
      "Review and rewrite LangChain, LlamaIndex, Ollama, and XRPL code against current APIs. Docs, examples, and XRPL tx skeletons included.",
    mimeType: "application/json",
    serviceName: "Titan Frameworks",
    tags: ["mcp", "langchain", "llamaindex", "ollama", "xrpl", "review", "rewrite", "x402"],
  };
}

export function paymentRequiredBody(resource: string) {
  return {
    x402Version: 2,
    error: "PAYMENT_REQUIRED",
    resource: mcpResourceInfo(resource),
    accepts: [usdcAccept(resource), ...xrplAccepts(resource)],
    outputSchema: discoveryOutputSchema(),
    extensions: bazaarExtensions(),
  };
}

function firstForwarded(req: Request, name: string): string | undefined {
  const raw = req.get(name);
  if (!raw) return undefined;
  return raw.split(",")[0]?.trim() || undefined;
}

/** Canonical /mcp URL for x402 requirements (https behind Railway/Vercel). */
export function publicMcpResource(req: Request): string {
  const host = firstForwarded(req, "x-forwarded-host") ?? firstForwarded(req, "host") ?? "localhost";
  const forwardedProto = firstForwarded(req, "x-forwarded-proto");
  const hostname = host.split(":")[0] ?? host;
  const hostedHttps = /\.up\.railway\.app$/i.test(hostname) || /\.vercel\.app$/i.test(hostname);
  const proto = forwardedProto || (hostedHttps ? "https" : req.protocol || "http");
  return `${proto}://${host}/mcp`;
}

function paymentProof(req: Request): string | undefined {
  const raw =
    req.header("payment-signature") ??
    req.header("x-payment-signature") ??
    req.header("x-payment") ??
    req.header("PAYMENT-SIGNATURE") ??
    req.header("X-Payment-Signature") ??
    req.header("X-PAYMENT");
  return raw?.trim() || undefined;
}

function decodeProof(proof: string): unknown {
  try {
    return JSON.parse(proof);
  } catch {
    try {
      return JSON.parse(Buffer.from(proof, "base64").toString("utf8"));
    } catch {
      return { signedTxBlob: proof };
    }
  }
}

function assetFromProof(decoded: unknown): "XRP" | "RLUSD" | "USDC" {
  const rec = decoded as {
    accepted?: { asset?: string; network?: string };
    asset?: string;
    network?: string;
    payload?: { signedTxBlob?: string };
  };
  const asset = String(rec?.accepted?.asset ?? rec?.asset ?? "").toUpperCase();
  const network = String(rec?.accepted?.network ?? rec?.network ?? "").toLowerCase();
  if (asset.includes("USDC") || asset.startsWith("0X833") || network.startsWith("eip155")) {
    return "USDC";
  }
  if (asset.includes("RLUSD") || asset.startsWith("524C555344")) return "RLUSD";
  if (asset === "XRP" || network.startsWith("xrpl") || rec?.payload?.signedTxBlob) return "XRP";
  if (network.startsWith("eip155")) return "USDC";
  return "USDC";
}

function isXrplAsset(asset: "XRP" | "RLUSD" | "USDC"): asset is "XRP" | "RLUSD" {
  return asset === "XRP" || asset === "RLUSD";
}

function asV2Requirements(req: unknown): unknown {
  if (!req || typeof req !== "object") return req;
  const r = { ...(req as Record<string, unknown>) };
  const amount = r.amount ?? r.maxAmountRequired;
  if (amount != null) r.amount = amount;
  delete r.maxAmountRequired;
  return r;
}

async function postFacilitator(
  facilitatorUrl: string,
  proof: string,
  requirements: unknown,
  resource: string,
): Promise<boolean> {
  const url = facilitatorUrl.replace(/\/$/, "");
  const payload = withBazaarPayload(decodeProof(proof), mcpResourceInfo(resource));
  const body = {
    x402Version: 2,
    paymentHeader: proof,
    paymentPayload: payload,
    paymentRequirements: asV2Requirements(requirements),
  };
  try {
    const res = await fetch(`${url}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`x402 verify ${res.status} ${facilitatorUrl}`, detail.slice(0, 300));
      return false;
    }
    const verified = (await res.json()) as { isValid?: boolean; valid?: boolean; invalidReason?: string };
    if (verified.isValid === false || verified.valid === false) {
      console.error("x402 verify rejected", verified.invalidReason ?? verified);
      return false;
    }

    await fetch(`${url}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

function requirementsFromProof(
  decoded: unknown,
  resource: string,
  asset: "XRP" | "RLUSD" | "USDC",
): unknown {
  const rec = decoded as { accepted?: unknown };
  if (rec?.accepted && typeof rec.accepted === "object") return rec.accepted;
  if (asset === "USDC") return usdcAccept(resource);
  return asset === "RLUSD" ? xrplAccepts(resource)[1] : xrplAccepts(resource)[0];
}

async function verifyXrpl(
  proof: string,
  resource: string,
  asset: "XRP" | "RLUSD",
  decoded: unknown,
): Promise<boolean> {
  return postFacilitator(xrplFacilitatorUrl(), proof, requirementsFromProof(decoded, resource, asset), resource);
}

async function verifyUsdc(proof: string, resource: string, decoded: unknown): Promise<boolean> {
  return postFacilitator(usdcFacilitatorUrl(), proof, requirementsFromProof(decoded, resource, "USDC"), resource);
}

const PAID_MCP_METHODS = new Set(["tools/call"]);

function jsonRpcMethods(body: unknown): string[] {
  if (Array.isArray(body)) {
    return body.flatMap((item) => jsonRpcMethods(item));
  }
  if (body && typeof body === "object" && "method" in body) {
    const method = (body as { method?: unknown }).method;
    if (typeof method === "string" && method.trim()) return [method];
  }
  return [];
}

/**
 * Charge `tools/call` only. Directories (Glama, Smithery) health-check with
 * unpaid `initialize` + `tools/list` and treat HTTP 402 as a dead connector.
 * GET/DELETE are Streamable HTTP session channels, not tool execution.
 */
export function mcpHttpRequiresPayment(httpMethod: string, body: unknown): boolean {
  if (httpMethod.toUpperCase() !== "POST") return false;
  return jsonRpcMethods(body).some((method) => PAID_MCP_METHODS.has(method));
}

/**
 * Lightweight x402 gate (Base USDC + XRPL XRP/RLUSD). Enable with X402_ENABLED=true.
 * Missing PAYMENT-SIGNATURE / X-Payment-Signature on paid methods → HTTP 402 with accepts[].
 */
export async function x402MockMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (process.env.X402_ENABLED !== "true") {
    next();
    return;
  }
  if (!mcpHttpRequiresPayment(req.method, req.body)) {
    next();
    return;
  }
  const proof = paymentProof(req);
  const resource = publicMcpResource(req);
  if (!proof) {
    const body = paymentRequiredBody(resource);
    res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
    res.status(402).json(body);
    return;
  }

  const decoded = decodeProof(proof);
  const asset = assetFromProof(decoded);
  const xrplOn = xrplLive();
  const usdcOn = usdcLive();

  if (isXrplAsset(asset)) {
    if (xrplOn) {
      const ok = await verifyXrpl(proof, resource, asset, decoded);
      if (!ok) {
        const body = paymentRequiredBody(resource);
        res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
        res.status(402).json({ ...body, error: "PAYMENT_INVALID" });
        return;
      }
    }
  } else if (usdcOn) {
    const ok = await verifyUsdc(proof, resource, decoded);
    if (!ok) {
      const body = paymentRequiredBody(resource);
      res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
      res.status(402).json({ ...body, error: "PAYMENT_INVALID" });
      return;
    }
  } else if (xrplOn) {
    const body = paymentRequiredBody(resource);
    res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
    res.status(402).json({ ...body, error: "PAYMENT_INVALID" });
    return;
  }

  const amount =
    asset === "XRP"
      ? xrplPriceDrops()
      : asset === "RLUSD"
        ? process.env.XRPL_PRICE_RLUSD || "0.001"
        : X402_ATOMIC;
  recordSettlement({ asset, network: asset === "USDC" ? X402_NETWORK : xrplNetwork(), amount });
  const settled =
    isXrplAsset(asset) && xrplOn ? "xrpl:settled" : asset === "USDC" && usdcOn ? "usdc:settled" : "mock:settled";
  const response = Buffer.from(
    JSON.stringify({ success: true, asset, network: asset === "USDC" ? X402_NETWORK : xrplNetwork() }),
    "utf8",
  ).toString("base64");
  res.setHeader("PAYMENT-RESPONSE", response);
  res.setHeader("X-PAYMENT-RESPONSE", settled);
  next();
}

export function attachX402(_app: Express): void {
  /*
   * Dual-rail live settlement lives in x402MockMiddleware:
   *   X402_USDC_LIVE=true  → PayAI (or X402_USDC_FACILITATOR_URL) for Base USDC
   *   X402_XRPL_LIVE=true  → T54 facilitator for XRP / RLUSD
   * USDC proofs are never sent to the XRPL facilitator.
   */
}
