// ─── XLayer Chain Configuration ──────────────────────────────────────────────

export const XLAYER_CHAIN = {
  chainId: 196,
  chainIdHex: "0xc4",
  chainName: "XLayer Mainnet",
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

export const XLAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: "0x7a0",
  chainName: "XLayer Testnet",
  rpcUrls: ["https://testrpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer-test"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
};

/** Default RPC URL */
export const RPC_URL = XLAYER_TESTNET.rpcUrls[0];

/** Explorer link helper */
export function getExplorerUrl(type, value, chainId = 1952) {
  const base = chainId === 1952 ? XLAYER_TESTNET.blockExplorerUrls[0] : XLAYER_CHAIN.blockExplorerUrls[0];
  return `${base}/${type}/${value}`;
}

/** Add chain to OKX Wallet / EVM wallet */
export async function addChainToWallet(chainId) {
  if (!window.ethereum) return false;

  const info = chainId === 1952 ? XLAYER_TESTNET : XLAYER_CHAIN;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: info.chainIdHex,
          chainName: info.chainName,
          rpcUrls: info.rpcUrls,
          blockExplorerUrls: info.blockExplorerUrls,
          nativeCurrency: info.nativeCurrency,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Switch wallet to a specific chain */
export async function switchToChain(chainId) {
  if (!window.ethereum) return false;

  const hex = chainId === 1952 ? XLAYER_TESTNET.chainIdHex : XLAYER_CHAIN.chainIdHex;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
    return true;
  } catch (error) {
    // Chain not added yet - try adding
    if (error.code === 4902) {
      return addChainToWallet(chainId);
    }
    return false;
  }
}
