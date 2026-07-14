"use strict";
/**
 * Single source of truth for the A2MCP x402 payment terms.
 * Both the HTTP 402 challenge and the settlement-side verification read from here,
 * so the amount/asset/recipient advertised can never drift from what is enforced.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOURCE_ID = exports.NETWORK_NAME = exports.LAUNCH_FEE_UNITS = exports.PAY_TO_ADDRESS = exports.USDT_EIP712_VERSION = exports.USDT_EIP712_NAME = exports.USDT_DECIMALS = exports.USDT_ADDRESS = exports.XLAYER_MAINNET_CHAIN_ID = void 0;
exports.launchFeeHuman = launchFeeHuman;
exports.XLAYER_MAINNET_CHAIN_ID = 196;
// USD₮0 on X Layer (6 decimals)
exports.USDT_ADDRESS = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
exports.USDT_DECIMALS = 6;
exports.USDT_EIP712_NAME = "USD₮0";
exports.USDT_EIP712_VERSION = "1";
// Where the launch fee is collected (OKX Agentic Wallet).
exports.PAY_TO_ADDRESS = "0x66A4c73e7C02858B49F15fBC24589A76B97C0F5a";
// The launch fee, expressed once in minimal units and derived everywhere else.
exports.LAUNCH_FEE_UNITS = "500000"; // 0.5 USD₮0 (6 decimals)
// CAIP-2 network id. The OKX task-402-pay CLI rejects the raw "xlayer_mainnet"
// id and requires the CAIP-2 form (eip155:<chainId>).
exports.NETWORK_NAME = "eip155:196";
exports.RESOURCE_ID = "hatchai-agent-launch";
/** Human-readable fee string, e.g. "0.5 USDT", derived from the canonical units. */
function launchFeeHuman() {
    const units = BigInt(exports.LAUNCH_FEE_UNITS);
    const divisor = BigInt(10) ** BigInt(exports.USDT_DECIMALS);
    const whole = units / divisor;
    const frac = units % divisor;
    const fracStr = frac === 0n
        ? ""
        : "." + frac.toString().padStart(exports.USDT_DECIMALS, "0").replace(/0+$/, "");
    return `${whole}${fracStr} USDT`;
}
