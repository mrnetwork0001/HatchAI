import { ethers } from "ethers";
import { XLAYER_CHAIN, XLAYER_TESTNET, switchToChain } from "./xlayer";
import deployments from "../deployments.json";

const TARGET_CHAIN_ID = deployments.chainId;

export const INITIAL_STATE = {
  connected: false,
  address: null,
  chainId: null,
  balance: null,
  isXLayer: false,
  provider: null,
  signer: null,
};

/** Connect to MetaMask or injected wallet */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or OKX Wallet.");
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
    const isSupported = chainId === TARGET_CHAIN_ID;

    if (!isSupported) {
      // By default, switch to the target chain (e.g. 1952)
      await switchToChain(TARGET_CHAIN_ID);
      // Re-check after switch
      const updatedNetwork = await provider.getNetwork();
      const updatedChainId = Number(updatedNetwork.chainId);
      return {
        connected: true,
        address,
        chainId: updatedChainId,
        balance,
        isXLayer: updatedChainId === XLAYER_CHAIN.chainId || updatedChainId === XLAYER_TESTNET.chainId || updatedChainId === TARGET_CHAIN_ID,
        provider,
        signer,
      };
    }

    return {
      connected: true,
      address,
      chainId,
      balance,
      isXLayer: chainId === XLAYER_CHAIN.chainId || chainId === XLAYER_TESTNET.chainId || chainId === TARGET_CHAIN_ID,
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
