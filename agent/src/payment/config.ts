/**
 * Single source of truth for the A2MCP x402 payment terms.
 * Both the HTTP 402 challenge and the settlement-side verification read from here,
 * so the amount/asset/recipient advertised can never drift from what is enforced.
 */

export const XLAYER_MAINNET_CHAIN_ID = 196;

// USD₮0 on X Layer (6 decimals)
export const USDT_ADDRESS = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
export const USDT_DECIMALS = 6;
export const USDT_EIP712_NAME = "USD₮0";
export const USDT_EIP712_VERSION = "1";

// Where the launch fee is collected (OKX Agentic Wallet).
export const PAY_TO_ADDRESS = "0x66A4c73e7C02858B49F15fBC24589A76B97C0F5a";

// The launch fee, expressed once in minimal units and derived everywhere else.
export const LAUNCH_FEE_UNITS = "500000"; // 0.5 USD₮0 (6 decimals)

export const NETWORK_NAME = "xlayer_mainnet";
export const RESOURCE_ID = "hatchai-agent-launch";

/** Human-readable fee string, e.g. "0.5 USDT", derived from the canonical units. */
export function launchFeeHuman(): string {
    const units = BigInt(LAUNCH_FEE_UNITS);
    const divisor = BigInt(10) ** BigInt(USDT_DECIMALS);
    const whole = units / divisor;
    const frac = units % divisor;
    const fracStr = frac === 0n
        ? ""
        : "." + frac.toString().padStart(USDT_DECIMALS, "0").replace(/0+$/, "");
    return `${whole}${fracStr} USDT`;
}
