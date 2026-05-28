/**
 * wagmiConfig.js - Wagmi + RainbowKit configuration for Hatch
 *
 * Defines X Layer Mainnet and Testnet chains.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

// ── X Layer Mainnet Chain Definition ──────────────────────────────────────────
export const xlayerMainnet = defineChain({
  id: 196,
  name: "X Layer Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.xlayer.tech"],
    },
    public: {
      http: ["https://rpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer",
    },
  },
});

// ── X Layer Testnet Chain Definition (Chain ID 1952) ──────────────────────────
export const xlayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: {
    default: {
      http: ["https://testrpc.xlayer.tech"],
    },
    public: {
      http: ["https://testrpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

// ── X Layer Testnet Chain Definition (Chain ID 195 - legacy/injected fallback) ──
export const xlayerTestnet195 = defineChain({
  id: 195,
  name: "X Layer Testnet (195)",
  nativeCurrency: {
    decimals: 18,
    name: "OKB",
    symbol: "OKB",
  },
  rpcUrls: {
    default: {
      http: ["https://testrpc.xlayer.tech"],
    },
    public: {
      http: ["https://testrpc.xlayer.tech"],
    },
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  },
  testnet: true,
});

// ── Wagmi Config ───────────────────────────────────────────────────────────────
export const wagmiConfig = getDefaultConfig({
  appName: "Hatch - Launch Protection Hook",
  appDescription:
    "Uniswap V4 hook with dynamic fee decay, anti-whale protection, and creator royalties on X Layer",
  appUrl: "https://hatch.xlayer.app",
  appIcon: "https://hatch.xlayer.app/logo.png",
  projectId: "hatch_xlayer_2026", // WalletConnect project ID (non-prod placeholder)
  chains: [xlayerMainnet, xlayerTestnet, xlayerTestnet195],
  ssr: false,
});
