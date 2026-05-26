import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

// Use the provided private key, or fall back to Hardhat's built-in account #0 for local work
const rawKey = process.env.PRIVATE_KEY || "";
const PRIVATE_KEY = rawKey.replace("0x", "").length === 64
  ? rawKey
  : "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default (local only)
const XLAYER_TESTNET_RPC = process.env.XLAYER_TESTNET_RPC || "https://testrpc.xlayer.tech";


/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris",
    },
  },

  networks: {
    // Local Hardhat for unit tests
    hardhat: {
      chainId: 31337,
    },

    // X Layer Testnet — EVM L2 by OKX
    xlayer_testnet: {
      url: XLAYER_TESTNET_RPC,
      chainId: 1952,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      timeout: 120000, // 2 min timeout for slower testnet
    },

    // X Layer Mainnet — EVM L2 by OKX
    xlayer_mainnet: {
      url: process.env.XLAYER_MAINNET_RPC || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
      timeout: 120000,
    },
  },

  // OKLink (X Layer's block explorer, Etherscan-compatible)
  etherscan: {
    apiKey: {
      xlayer_testnet: "NO_API_KEY_NEEDED", // OKLink public API
      xlayer_mainnet: "NO_API_KEY_NEEDED",
    },
    customChains: [
      {
        network: "xlayer_testnet",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER_TESTNET",
          browserURL: "https://www.oklink.com/xlayer-test",
        },
      },
      {
        network: "xlayer_mainnet",
        chainId: 196,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER",
          browserURL: "https://www.oklink.com/xlayer",
        },
      },
    ],
  },
};

