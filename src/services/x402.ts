import type { NextFunction, Request, Response, Express } from "express";
import { recordSettlement } from "./earnings.js";

/** USDC on Base mainnet (6 decimals). $0.001 = 1000 atomic units. */
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const X402_PRICE_USDC = "0.001";
export const X402_ATOMIC = "1000";
export const X402_NETWORK = "eip155:8453";

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

export function xrplFacilitatorUrl(): string {
  return process.env.XRPL_FACILITATOR_URL ?? "https://xrpl-facilitator-testnet.t54.ai";
}

export function xrplRlusdIssuer(): string {
  return process.env.XRPL_RLUSD_ISSUER ?? RLUSD_ISSUER_MAINNET;
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
  const payTo = process.env.X402_PAY_TO ?? "0x584c004037bc369b3b49bd18381a5a6d0c1c1215";
  return {
    x402Version: 1,
    error: "PAYMENT_REQUIRED",
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        maxAmountRequired: X402_ATOMIC,
        resource,
        description: "Titan Frameworks MCP tool call",
        mimeType: "application/json",
        payTo,
        maxTimeoutSeconds: 60,
        asset: USDC_BASE,
        extra: {
          name: "USD Coin",
          version: "2",
          priceUsd: X402_PRICE_USDC,
        },
      },
      ...xrplAccepts(resource),
    ],
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
  const rec = decoded as { accepted?: { asset?: string }; asset?: string };
  const asset = (rec?.accepted?.asset ?? rec?.asset ?? "XRP").toUpperCase();
  if (asset.includes("RLUSD") || asset.startsWith("524C555344")) return "RLUSD";
  if (asset.includes("USDC") || asset.startsWith("0X833")) return "USDC";
  return "XRP";
}

async function verifyWithFacilitator(proof: string, resource: string): Promise<boolean> {
  const url = xrplFacilitatorUrl().replace(/\/$/, "");
  const requirements = xrplAccepts(resource)[0];
  const payload = decodeProof(proof);
  try {
    const res = await fetch(`${url}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        paymentHeader: proof,
        paymentPayload: payload,
        paymentRequirements: requirements,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { isValid?: boolean; valid?: boolean };
    if (body.isValid === false || body.valid === false) return false;

    await fetch(`${url}/settle`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        x402Version: 2,
        paymentHeader: proof,
        paymentPayload: payload,
        paymentRequirements: requirements,
      }),
      signal: AbortSignal.timeout(20_000),
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
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

  const live = process.env.X402_XRPL_LIVE === "true";
  if (live) {
    const ok = await verifyWithFacilitator(proof, resource);
    if (!ok) {
      const body = paymentRequiredBody(resource);
      res.setHeader("PAYMENT-REQUIRED", Buffer.from(JSON.stringify(body), "utf8").toString("base64"));
      res.status(402).json({ ...body, error: "PAYMENT_INVALID" });
      return;
    }
  }

  const decoded = decodeProof(proof);
  const asset = assetFromProof(decoded);
  const amount =
    asset === "XRP"
      ? xrplPriceDrops()
      : asset === "RLUSD"
        ? process.env.XRPL_PRICE_RLUSD || "0.001"
        : X402_ATOMIC;
  recordSettlement({ asset, network: asset === "USDC" ? X402_NETWORK : xrplNetwork(), amount });
  const response = Buffer.from(
    JSON.stringify({ success: true, asset, network: xrplNetwork() }),
    "utf8",
  ).toString("base64");
  res.setHeader("PAYMENT-RESPONSE", response);
  res.setHeader("X-PAYMENT-RESPONSE", live ? "xrpl:settled" : "mock:settled");
  next();
}

export function attachX402(_app: Express): void {
  /*
   * Live Base USDC x402. Install and uncomment:
   *   npm install @x402/express @x402/evm @x402/core
   *
   * Live XRPL via x402-xrpl (replaces the custom /mcp 402 with XRPL-only):
   *   npm install x402-xrpl
   *   import { requirePayment } from "x402-xrpl/express";
   *   _app.use(requirePayment({
   *     path: "/mcp",
   *     price: process.env.XRPL_PRICE_DROPS || "1000",
   *     payToAddress: process.env.XRPL_PAY_TO_ADDRESS!,
   *     network: process.env.XRPL_NETWORK ?? "xrpl:1",
   *     facilitatorUrl: process.env.XRPL_FACILITATOR_URL,
   *     asset: "XRP",
   *     extra: { sourceTag: Number(process.env.XRPL_SOURCE_TAG ?? "804681468") },
   *   }));
   */
}
