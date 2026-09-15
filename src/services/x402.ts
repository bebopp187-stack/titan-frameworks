import type { NextFunction, Request, Response, Express } from "express";
import { recordSettlement } from "./earnings.js";

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

export function paymentRequiredBody(resource: string) {
  return {
    x402Version: 2,
    error: "PAYMENT_REQUIRED",
    accepts: [usdcAccept(resource), ...xrplAccepts(resource)],
  };
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

async function postFacilitator(
  facilitatorUrl: string,
  proof: string,
  requirements: unknown,
): Promise<boolean> {
  const url = facilitatorUrl.replace(/\/$/, "");
  const payload = decodeProof(proof);
  const body = {
    x402Version: 2,
    paymentHeader: proof,
    paymentPayload: payload,
    paymentRequirements: requirements,
  };
  try {
    const res = await fetch(`${url}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return false;
    const verified = (await res.json()) as { isValid?: boolean; valid?: boolean };
    if (verified.isValid === false || verified.valid === false) return false;

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

async function verifyXrpl(
  proof: string,
  resource: string,
  asset: "XRP" | "RLUSD",
): Promise<boolean> {
  const requirements = asset === "RLUSD" ? xrplAccepts(resource)[1] : xrplAccepts(resource)[0];
  return postFacilitator(xrplFacilitatorUrl(), proof, requirements);
}

async function verifyUsdc(proof: string, resource: string): Promise<boolean> {
  return postFacilitator(usdcFacilitatorUrl(), proof, usdcAccept(resource));
}

/**
 * Lightweight x402 gate (Base USDC + XRPL XRP/RLUSD). Enable with X402_ENABLED=true.
 * Missing PAYMENT-SIGNATURE / X-Payment-Signature → HTTP 402 with accepts[].
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
  const proof = paymentProof(req);
  const resource = `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`;
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
      const ok = await verifyXrpl(proof, resource, asset);
      if (!ok) {
        const body = paymentRequiredBody(resource);
        res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
        res.status(402).json({ ...body, error: "PAYMENT_INVALID" });
        return;
      }
    }
  } else if (usdcOn) {
    const ok = await verifyUsdc(proof, resource);
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
