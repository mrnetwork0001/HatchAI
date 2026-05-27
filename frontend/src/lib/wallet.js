import { ethers } from "ethers";
import { XLAYER_CHAIN, XLAYER_TESTNET, switchToChain } from "./xlayer";
import deployments from "../deployments.json";

const SUPPORTED_CHAINS = Object.keys(deployments).map(Number);
const DEFAULT_CHAIN_ID = deployments["1952"] ? 1952 : (SUPPORTED_CHAINS[0] || 1952);

export const INITIAL_STATE = {
  connected: false,
  address: null,
  chainId: null,
  balance: null,
  isXLayer: false,
  provider: null,
  signer: null,
};

/** Connect to OKX Wallet or injected EVM wallet */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install OKX Wallet or another EVM wallet.");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
      throw new Error("No accounts found. Please unlock your wallet.");
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const balance = ethers.formatEther(await provider.getBalance(address));
    
    // Check if the current chain is supported
    const isSupported = SUPPORTED_CHAINS.includes(chainId);

    if (!isSupported) {
      // By default, switch to the default chain (e.g. 1952)
      await switchToChain(DEFAULT_CHAIN_ID);
      // Re-check after switch
      const updatedNetwork = await provider.getNetwork();
      const updatedChainId = Number(updatedNetwork.chainId);
      return {
        connected: true,
        address,
        chainId: updatedChainId,
        balance,
        isXLayer: SUPPORTED_CHAINS.includes(updatedChainId),
        provider,
        signer,
      };
    }

    return {
      connected: true,
      address,
      chainId,
      balance,
      isXLayer: true,
      provider,
      signer,
    };
  } catch (error) {
    if (error.code === 4001) {
      throw new Error("Connection rejected. Please approve the wallet connection.");
    }
    throw error;
  }
}

/** Disconnect wallet (reset state) */
export function disconnectWallet() {
  return { ...INITIAL_STATE };
}

/** Shorten an address for display */
export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format balance with proper decimals */
export function formatBalance(balance, decimals = 4) {
  if (!balance) return "0";
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(decimals);
}
