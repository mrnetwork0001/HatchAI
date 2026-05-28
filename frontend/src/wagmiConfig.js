/**
 * wagmiConfig.js - Wagmi + RainbowKit configuration for Hatch
 *
 * Defines the X Layer Testnet chain and sets up wallet connection providers.
 * Supports OKX Wallet, MetaMask, and WalletConnect.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

// ── X Layer Testnet Chain Definition ──────────────────────────────────────────
export const xlayerTestnet = defineChain({
  id: 195,
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
      http: ["https://xlayertestrpc.okx.com", "https://testrpc.xlayer.tech"],
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
  chains: [xlayerTestnet],
  ssr: false,
});
