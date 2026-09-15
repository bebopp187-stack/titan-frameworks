import type { NextFunction, Request, Response, Express } from "express";

/** USDC on Base mainnet (6 decimals). $0.001 = 1000 atomic units. */
export const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const X402_PRICE_USDC = "0.001";
export const X402_ATOMIC = "1000";
export const X402_NETWORK = "eip155:8453";

export function paymentRequiredBody(resource: string) {
  const payTo = process.env.X402_PAY_TO ?? "0x0000000000000000000000000000000000000000";
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
    ],
  };
}

/**
 * Lightweight x402 gate. Enable with X402_ENABLED=true.
 * Missing X-PAYMENT / PAYMENT-SIGNATURE → HTTP 402 with machine-readable accepts[].
 * A present header is treated as paid in mock mode (no chain verify).
 */
export function x402MockMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.X402_ENABLED !== "true") {
    next();
    return;
  }
  const proof =
    req.header("payment-signature") ??
    req.header("x-payment") ??
    req.header("PAYMENT-SIGNATURE") ??
    req.header("X-PAYMENT");
  if (proof && proof.trim().length > 0) {
    res.setHeader("X-PAYMENT-RESPONSE", "mock:settled");
    next();
    return;
  }
  const resource = `${req.protocol}://${req.get("host") ?? "localhost"}${req.originalUrl}`;
  res.status(402).json(paymentRequiredBody(resource));
}

export function attachX402(_app: Express): void {
  /*
   * Live x402 (Base mainnet, $0.001 USDC). Install and uncomment:
   *
   *   npm install @x402/express @x402/evm @x402/core
   *
   * import { paymentMiddleware, x402ResourceServer } from "@x402/express";
   * import { ExactEvmScheme } from "@x402/evm/exact/server";
   * import { HTTPFacilitatorClient } from "@x402/core/server";
   *
   * const payTo = process.env.X402_PAY_TO!;
   * const facilitator = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
   * const resourceServer = new x402ResourceServer(facilitator)
   *   .register("eip155:8453", new ExactEvmScheme());
   *
   * _app.use(
   *   paymentMiddleware(
   *     {
   *       "POST /mcp": {
   *         accepts: [{
   *           scheme: "exact",
   *           price: "$0.001",
   *           network: "eip155:8453",
   *           payTo,
   *         }],
   *         description: "Titan Frameworks MCP tools",
   *         mimeType: "application/json",
   *       },
   *     },
   *     resourceServer,
   *   ),
   * );
   */
}
