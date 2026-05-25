/**
 * WalletContext.jsx
 *
 * Provides live blockchain state to all Hatch UI components.
 * Replaces the previous wagmi hooks with real MetaMask / OKX Wallet direct provider connections.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { connectWallet, disconnectWallet, INITIAL_STATE } from "./lib/wallet";
import { switchToChain } from "./lib/xlayer";
import deployments from "./deployments.json";
import { MOCK_ERC20_ABI, MOCK_ERC20_BYTECODE } from "./lib/mockErc20";


// ── ABIs (minimal - only functions the frontend needs) ───────────────────────
const HATCH_HOOK_ABI = [
  {
    name: "poolConfigs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "projectToken", type: "address" },
      { name: "launchTime", type: "uint256" },
      { name: "decayDuration", type: "uint256" },
      { name: "startFee", type: "uint24" },
      { name: "endFee", type: "uint24" },
      { name: "maxSwapAmount", type: "uint256" },
      { name: "cooldownDuration", type: "uint256" },
    ],
  },
  {
    name: "totalCreatorFeesClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalTokensBurned",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "lastSwapTimestamp",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimFees",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
    ],
    outputs: [],
  },
];

const POOL_MANAGER_ABI = [
  {
    name: "pools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "reserves0", type: "uint256" },
      { name: "reserves1", type: "uint256" },
      { name: "initialized", type: "bool" },
    ],
  },
  {
    name: "hookFees0",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hookFees1",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "swap",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "zeroForOne", type: "bool" },
          { name: "amountSpecified", type: "int256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
  {
    name: "initialize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
  },
  {
    name: "addLiquidityDirect",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    outputs: [],
  },
];

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
];

// ── Pool Key (from deployments.json) ─────────────────────────────────────────
export const POOL_KEY = deployments.poolKey;
export const CONTRACTS = deployments.contracts;
export const CHAIN_ID = deployments.chainId;

// Compute pool ID (keccak256 of ABI-encoded PoolKey)
function computePoolId(poolKey) {
  try {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = coder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [
        poolKey.currency0,
        poolKey.currency1,
        poolKey.fee,
        poolKey.tickSpacing,
        poolKey.hooks
      ]
    );
    return ethers.keccak256(encoded);
  } catch (err) {
    console.error("Error computing pool ID:", err);
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(INITIAL_STATE);
  const [logs, setLogs] = useState([]);
  const [pendingTxHash, setPendingTxHash] = useState(null);
  const [isTxPending, setIsTxPending] = useState(false);
  const [isTxSuccess, setIsTxSuccess] = useState(false);

  const [targetChainId, setTargetChainId] = useState(CHAIN_ID);
  const isOnCorrectChain = wallet.chainId === targetChainId;
  const isDeployed = CONTRACTS.hatchHook !== "0x0000000000000000000000000000000000000000";

  // ── Dynamic Pool State ──────────────────────────────────────────────────────
  const defaultPoolId = isDeployed ? computePoolId(POOL_KEY) : "0x0000000000000000000000000000000000000000000000000000000000000000";
  const [activePoolKey, setActivePoolKey] = useState(POOL_KEY);
  const [poolIdHex, setPoolIdHex] = useState(defaultPoolId);
  const [isCustomPoolActive, setIsCustomPoolActive] = useState(false);
  const [customTokenDetails, setCustomTokenDetails] = useState({
    symbol: "HATCH",
    isHatchCurrency0: deployments.isHatchCurrency0,
    projectTokenAddress: CONTRACTS.hatchToken
  });

  // ── Custom Pool Registrations ───────────────────────────────────────────────
  const [customPools, setCustomPools] = useState(() => {
    try {
      const saved = localStorage.getItem("hatch_custom_pools");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ── Log Helper ──────────────────────────────────────────────────────────────
  const addLog = useCallback((tag, message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-99), { timestamp, tag, message, type }]);
  }, []);

  // ── Live Contract Reads ─────────────────────────────────────────────────────
  const [blockNumber, setBlockNumber] = useState(0);
  const [activeDecayMode, setActiveDecayMode] = useState("time");
  const [activeStartBlock, setActiveStartBlock] = useState(0);
  const [okbBalance, setOkbBalance] = useState("0");
  const [wethBalance, setWethBalance] = useState("0");
  const [hatchBalance, setHatchBalance] = useState("0");
  const [poolReserves, setPoolReserves] = useState({ weth: 0, hatch: 0 });
  const [poolConfig, setPoolConfig] = useState(null);
  const [totalCreatorFeesClaimed, setTotalCreatorFeesClaimed] = useState("0");
  const [totalTokensBurned, setTotalTokensBurned] = useState("0");
  const [accumulatedFees, setAccumulatedFees] = useState(0);
  const [lastSwapTs, setLastSwapTs] = useState(0n);
  const [wethAllowance, setWethAllowance] = useState(0n);

  const fetchOnChainData = useCallback(async (currentWallet) => {
    const { connected, address, provider } = currentWallet;
    if (!connected || !address || !provider) {
      setOkbBalance("0");
      setWethBalance("0");
      setHatchBalance("0");
      setPoolReserves({ weth: 0, hatch: 0 });
      setPoolConfig(null);
      setTotalCreatorFeesClaimed("0");
      setTotalTokensBurned("0");
      setAccumulatedFees(0);
      setLastSwapTs(0n);
      setWethAllowance(0n);
      return;
    }

    try {
      const balanceWei = await provider.getBalance(address);
      setOkbBalance(Number(ethers.formatEther(balanceWei)).toFixed(4));
      provider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => {});

      if (!isDeployed) return;

      const wethContract = new ethers.Contract(CONTRACTS.weth, ERC20_ABI, provider);
      const hatchTokenContract = new ethers.Contract(customTokenDetails.projectTokenAddress, ERC20_ABI, provider);
      const poolManagerContract = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, provider);
      const hatchHookContract = new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, provider);

      const [
        wethBalRes,
        hatchBalRes,
        poolStateRes,
        poolConfigRes,
        claimedRes,
        burnedRes,
        fees0Res,
        fees1Res,
        lastSwapRes,
        allowanceRes
      ] = await Promise.allSettled([
        wethContract.balanceOf(address),
        hatchTokenContract.balanceOf(address).catch(() => 0n),
        poolManagerContract.pools(poolIdHex),
        hatchHookContract.poolConfigs(poolIdHex),
        hatchHookContract.totalCreatorFeesClaimed(poolIdHex),
        hatchHookContract.totalTokensBurned(poolIdHex),
        poolManagerContract.hookFees0(poolIdHex),
        poolManagerContract.hookFees1(poolIdHex),
        hatchHookContract.lastSwapTimestamp(poolIdHex, address),
        wethContract.allowance(address, CONTRACTS.poolManager)
      ]);

      if (wethBalRes.status === "fulfilled") {
        setWethBalance(Number(ethers.formatEther(wethBalRes.value)).toFixed(4));
      }
      if (hatchBalRes.status === "fulfilled") {
        setHatchBalance(Number(ethers.formatEther(hatchBalRes.value)).toFixed(2));
      }

      if (poolStateRes.status === "fulfilled") {
        const poolState = poolStateRes.value;
        setPoolReserves({
          weth: Number(ethers.formatEther(customTokenDetails.isHatchCurrency0 ? poolState[1] : poolState[0])),
          hatch: Number(ethers.formatEther(customTokenDetails.isHatchCurrency0 ? poolState[0] : poolState[1])),
        });
      }

      if (poolConfigRes.status === "fulfilled") {
        setPoolConfig(poolConfigRes.value);
      }

      if (claimedRes.status === "fulfilled") {
        setTotalCreatorFeesClaimed(Number(ethers.formatEther(claimedRes.value)).toFixed(4));
      }

      if (burnedRes.status === "fulfilled") {
        setTotalTokensBurned(Number(ethers.formatEther(burnedRes.value)).toFixed(2));
      }

      let accFees = 0;
      if (fees0Res.status === "fulfilled" && fees1Res.status === "fulfilled") {
        const val = customTokenDetails.isHatchCurrency0 ? fees1Res.value : fees0Res.value;
        accFees = Number(ethers.formatEther(val));
      } else if (fees0Res.status === "fulfilled") {
        if (!customTokenDetails.isHatchCurrency0) {
          accFees = Number(ethers.formatEther(fees0Res.value));
        }
      } else if (fees1Res.status === "fulfilled") {
        if (customTokenDetails.isHatchCurrency0) {
          accFees = Number(ethers.formatEther(fees1Res.value));
        }
      }
      setAccumulatedFees(accFees);

      if (lastSwapRes.status === "fulfilled") {
        setLastSwapTs(BigInt(lastSwapRes.value));
      }

      if (allowanceRes.status === "fulfilled") {
        setWethAllowance(BigInt(allowanceRes.value));
      }

    } catch (err) {
      console.error("Error fetching onchain data:", err);
    }
  }, [poolIdHex, isDeployed, customTokenDetails]);

  // Periodic polling for watch-like updates
  useEffect(() => {
    fetchOnChainData(wallet);

    if (wallet.connected && wallet.address) {
      const interval = setInterval(() => {
        fetchOnChainData(wallet);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [wallet, fetchOnChainData]);

  useEffect(() => {
    if (!wallet.connected) {
      const rpcUrl = targetChainId === 196 ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      provider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => {});
      const interval = setInterval(() => {
        provider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => {});
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [wallet.connected, targetChainId]);

  // Listen for window.ethereum events
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = async (hexChainId) => {
      const chainId = Number(hexChainId);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const isXLayer = chainId === 196 || chainId === 1952;
        setWallet({
          connected: true,
          address,
          chainId,
          isXLayer,
          provider,
          signer,
        });
        addLog("Network", `Switched network to chain ID ${chainId}`, "info");
      } catch (err) {
        setWallet(INITIAL_STATE);
      }
    };

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setWallet(INITIAL_STATE);
        addLog("Wallet", "Disconnected from accounts change.", "info");
      } else {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const isXLayer = chainId === 196 || chainId === 1952;
          setWallet({
            connected: true,
            address,
            chainId,
            isXLayer,
            provider,
            signer,
          });
          addLog("Wallet", `Switched to account: ${address.slice(0, 6)}...${address.slice(-4)}`, "info");
        } catch (err) {
          setWallet(INITIAL_STATE);
        }
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [addLog]);

  // Connect & Disconnect handlers
  const handleConnect = async () => {
    try {
      addLog("Wallet", "Connecting wallet...", "info");
      const state = await connectWallet();
      setWallet(state);
      addLog("Wallet Connected", `Address: ${state.address?.slice(0, 10)}... Chain: ${state.chainId}`, "success");
      return state;
    } catch (err) {
      addLog("Wallet Error", err.message, "error");
      throw err;
    }
  };

  const handleDisconnect = () => {
    setWallet(disconnectWallet());
    addLog("Wallet", "Disconnected.", "info");
  };

  const handleSwitchChain = async () => {
    const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
    addLog("Network", `Prompting wallet to switch to ${targetName} (Chain ID: ${targetChainId})...`, "info");
    const success = await switchToChain(targetChainId);
    if (success) {
      addLog("Network", `Wallet successfully switched to ${targetName}.`, "success");
    } else {
      addLog("Network Error", `Failed to switch wallet network.`, "error");
    }
  };

  // ── Auto-switch network if connected to wrong chain ─────────────────────────
  useEffect(() => {
    if (wallet.connected && wallet.chainId && wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Network", `Connected to wrong chain (${wallet.chainId}). Prompting to switch to correct network (${targetName}, Chain ID: ${targetChainId})...`, "info");
      switchToChain(targetChainId).then((success) => {
        if (success) {
          addLog("Network", `Successfully switched to ${targetName}.`, "success");
        } else {
          addLog("Network Error", "Failed to switch network or switch rejected by user.", "error");
        }
      });
    }
  }, [wallet.connected, wallet.chainId, targetChainId, addLog]);

  // ── Derived State ───────────────────────────────────────────────────────────
  const nowSec = Math.floor(Date.now() / 1000);
  const launchTime = poolConfig ? Number(poolConfig[2]) : 0;
  const decayDuration = poolConfig ? Number(poolConfig[3]) : 86400;
  const startFee = poolConfig ? Number(poolConfig[4]) : 100000;
  const endFee = poolConfig ? Number(poolConfig[5]) : 3000;
  const maxSwapAmount = poolConfig ? poolConfig[6] : 0n;
  const cooldownDuration = poolConfig ? Number(poolConfig[7]) : 60;

  const timeElapsed = launchTime > 0 ? (nowSec - launchTime) * 1000 : 0;
  const isProtectionActive = activeDecayMode === "block"
    ? (activeStartBlock > 0 && blockNumber < activeStartBlock + Math.max(1, Math.floor(decayDuration / 2)))
    : (launchTime > 0 && nowSec < launchTime + decayDuration);

  const getCurrentFeeRate = () => {
    if (activeDecayMode === "block") {
      const blocksElapsed = blockNumber > activeStartBlock && activeStartBlock > 0 ? (blockNumber - activeStartBlock) : 0;
      const totalBlocks = Math.max(1, Math.floor(decayDuration / 2));
      
      if (blocksElapsed >= totalBlocks) return endFee / 1_000_000;
      
      const pct = (blocksElapsed / totalBlocks) * 100;
      if (pct < 10) {
        return 0.90;
      } else if (pct < 50) {
        return 0.50;
      } else if (pct < 100) {
        return 0.10;
      } else {
        return endFee / 1_000_000;
      }
    }

    if (!isProtectionActive || launchTime === 0) return endFee / 1_000_000;
    const elapsed = nowSec - launchTime;
    const feeRange = startFee - endFee;
    const fee = startFee - Math.floor((elapsed * feeRange) / decayDuration);
    return fee / 1_000_000;
  };

  const currentFeeRate = getCurrentFeeRate();

  // ── Actions ─────────────────────────────────────────────────────────────────

  const executeSwap = async (wethAmountStr) => {
    if (!wallet.connected) {
      addLog("Swap Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Swap Error", `Switch to ${targetName} (Chain: ${targetChainId}) first.`, "error");
      await switchToChain(targetChainId);
      return { success: false, reason: "Wrong network" };
    }

    let wethAmountWei;
    try {
      wethAmountWei = ethers.parseEther(wethAmountStr);
    } catch {
      addLog("Swap Error", "Invalid amount entered.", "error");
      return { success: false, reason: "Invalid amount" };
    }

    if (wethAmountWei <= 0n) {
      addLog("Swap Error", "Amount must be greater than 0.", "error");
      return { success: false, reason: "Zero amount" };
    }

    if (isProtectionActive && lastSwapTs) {
      const secondsSinceLast = BigInt(nowSec) - lastSwapTs;
      if (secondsSinceLast < BigInt(cooldownDuration)) {
        const remaining = Number(BigInt(cooldownDuration) - secondsSinceLast);
        addLog("REVERTED", `Swap blocked - cooldown active. Wait ${remaining}s.`, "error");
        return { success: false, reason: `Cooldown: wait ${remaining}s` };
      }
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      const signer = wallet.signer;
      const wethContract = new ethers.Contract(CONTRACTS.weth, ERC20_ABI, signer);
      const poolManagerContract = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, signer);

      const currentAllowance = wethAllowance || 0n;
      if (currentAllowance < wethAmountWei) {
        addLog("Approve", "Approving WETH for PoolManager...", "info");
        const approveTx = await wethContract.approve(CONTRACTS.poolManager, wethAmountWei * 10n);
        setPendingTxHash(approveTx.hash);
        addLog("Approve", `Approval tx submitted: ${approveTx.hash}. Waiting for confirmation...`, "info");
        await approveTx.wait();
        addLog("Approve", "WETH approved successfully!", "success");
        setWethAllowance(wethAmountWei * 10n);
      }

      const zeroForOne = !customTokenDetails.isHatchCurrency0;
      addLog("Swap", `Swapping ${wethAmountStr} WETH → ${customTokenDetails.symbol} onchain...`, "info");
      
      const swapTx = await poolManagerContract.swap(
        activePoolKey,
        {
          zeroForOne,
          amountSpecified: wethAmountWei,
          sqrtPriceLimitX96: zeroForOne
            ? 4295128740n
            : 1461446703485210103287273052203988822378723970341n,
        },
        "0x"
      );

      setPendingTxHash(swapTx.hash);
      addLog("SWAP SUBMITTED", `Tx hash: ${swapTx.hash}. Waiting for confirmation...`, "info");
      
      await swapTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);
      
      addLog(
        "SWAP SUCCESSFUL",
        `Tx hash: ${swapTx.hash} - View on OKLink: ${deployments.explorerUrl}/tx/${swapTx.hash}`,
        "success"
      );

      fetchOnChainData(wallet);
      return { success: true, txHash: swapTx.hash };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Transaction failed";
      addLog("REVERTED", `Swap failed: ${msg}`, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };

  const claimRoyalties = async () => {
    if (!wallet.connected) {
      addLog("Claim Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Claim Error", `Switch to ${targetName} (Chain: ${targetChainId}) first.`, "error");
      await switchToChain(targetChainId);
      return { success: false, reason: "Wrong network" };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      const signer = wallet.signer;
      const hatchHookContract = new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, signer);

      addLog("Fee Harvest", "Submitting claimFees() to HatchHook...", "info");
      const claimTx = await hatchHookContract.claimFees(activePoolKey);
      setPendingTxHash(claimTx.hash);
      addLog("Fee Harvest", `claimFees tx submitted: ${claimTx.hash}. Waiting for confirmation...`, "info");
      
      await claimTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);

      addLog(
        "FEE HARVEST SUCCESSFUL",
        `claimFees tx confirmed! View: ${deployments.explorerUrl}/tx/${claimTx.hash}`,
        "success"
      );

      fetchOnChainData(wallet);
      return { success: true, txHash: claimTx.hash };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Claim failed";
      addLog("Claim Error", msg, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };

  const claimRoyaltiesAutonomously = async () => {
    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      const rpcUrl = targetChainId === 196 ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const keeperWallet = new ethers.Wallet("0xe8630f3355506a81ca01f16d696d17add0826aea74de13f3202e8148d456e9fe", provider);
      
      const hatchHookContract = new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, keeperWallet);

      addLog("Agent AI", `Autonomous Agent triggering claimFees() via onchain Keeper: ${keeperWallet.address.slice(0, 8)}...`, "info");
      
      const claimTx = await hatchHookContract.claimFees(activePoolKey);
      setPendingTxHash(claimTx.hash);
      addLog("Agent AI", `Autonomous transaction sent: ${claimTx.hash}. Waiting for block confirmation...`, "info");
      
      await claimTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);

      addLog(
        "Agent AI Success",
        `Autonomous harvest completed successfully! Tx: ${claimTx.hash}`,
        "success"
      );

      fetchOnChainData(wallet);
      return { success: true, txHash: claimTx.hash };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Autonomous execution failed";
      addLog("Agent AI Error", msg, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };

  const deployToken = async (name, symbol, initialSupplyStr) => {
    if (!wallet.connected) {
      addLog("Deploy Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Deploy Error", `Switch to ${targetName} (Chain: ${targetChainId}) first.`, "error");
      await switchToChain(targetChainId);
      return { success: false, reason: "Wrong network" };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      addLog("Deploy Token", `Deploying standard ERC20 token ${name} (${symbol})...`, "info");
      
      const signer = wallet.signer;
      const factory = new ethers.ContractFactory(MOCK_ERC20_ABI, MOCK_ERC20_BYTECODE, signer);
      
      const supply = BigInt(initialSupplyStr);
      
      const contract = await factory.deploy(name, symbol, supply, { gasLimit: 3000000 });
      const deployTxHash = contract.deploymentTransaction().hash;
      setPendingTxHash(deployTxHash);
      addLog("Deploy Token", `Deployment transaction submitted. Hash: ${deployTxHash}. Waiting for confirmation...`, "info");
      
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      
      setIsTxSuccess(true);
      setPendingTxHash(null);
      addLog("DEPLOY SUCCESSFUL", `Token deployed at address: ${address}. Initial supply: ${initialSupplyStr} ${symbol} minted to your wallet.`, "success");
      
      fetchOnChainData(wallet);
      return { success: true, address, txHash: deployTxHash };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Deployment failed";
      addLog("DEPLOY ERROR", `Token deployment failed: ${msg}`, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };

  const mintWeth = async (amountStr = "10") => {
    if (!wallet.connected) {
      addLog("Faucet Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Faucet Error", `Switch to ${targetName} (Chain: ${targetChainId}) first.`, "error");
      await switchToChain(targetChainId);
      return { success: false, reason: "Wrong network" };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      addLog("WETH Faucet", `Minting ${amountStr} Mock WETH to your wallet...`, "info");
      
      const signer = wallet.signer;
      const wethContract = new ethers.Contract(CONTRACTS.weth, ERC20_ABI, signer);
      
      const amountWei = ethers.parseEther(amountStr);
      
      const mintTx = await wethContract.mint(wallet.address, amountWei, { gasLimit: 100000 });
      setPendingTxHash(mintTx.hash);
      addLog("WETH Faucet", `Transaction submitted. Hash: ${mintTx.hash}. Waiting for confirmation...`, "info");
      
      await mintTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);
      addLog("WETH FAUCET SUCCESSFUL", `${amountStr} Mock WETH minted to your wallet!`, "success");
      
      fetchOnChainData(wallet);
      return { success: true, txHash: mintTx.hash };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Faucet mint failed";
      addLog("WETH FAUCET ERROR", `Mint failed: ${msg}`, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };

  // ── Launchpad Initializer ──────────────────────────────────────────────────
  const initializePool = async (config) => {
    if (!wallet.connected) {
      addLog("Launchpad Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      addLog("Launchpad Error", `Switch to ${targetName} (Chain: ${targetChainId}) first.`, "error");
      await switchToChain(targetChainId);
      return { success: false, reason: "Wrong network" };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    const {
      projectToken,
      baseToken,
      priceRatio,
      decayDurationHours,
      startFeePercent,
      endFeePercent,
      maxSwapAmountTokens,
      cooldownSeconds,
      seedProjectAmount,
      seedWethAmount,
      decayMode = "time"
    } = config;

    try {
      addLog("Launchpad", "Preparing pool initialization parameters...", "info");
      
      const currency0 = projectToken.toLowerCase() < baseToken.toLowerCase() ? projectToken : baseToken;
      const currency1 = projectToken.toLowerCase() < baseToken.toLowerCase() ? baseToken : projectToken;
      const isHatchCurrency0 = projectToken.toLowerCase() === currency0.toLowerCase();

      const ratio = parseFloat(priceRatio);
      const price = isHatchCurrency0 ? (1 / ratio) : ratio;
      const sqrtPrice = Math.sqrt(price);
      const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 79228162514264337593543950336));

      const decayDuration = decayMode === "block"
        ? BigInt(Math.floor(parseFloat(decayDurationHours) * 2))
        : BigInt(Math.floor(parseFloat(decayDurationHours) * 3600));
      const startFee = decayMode === "block"
        ? 900000
        : Math.floor(parseFloat(startFeePercent) * 10000);
      const endFee = Math.floor(parseFloat(endFeePercent) * 10000);
      const maxSwapAmount = ethers.parseEther(maxSwapAmountTokens);
      const cooldownDuration = BigInt(cooldownSeconds);

      const coder = ethers.AbiCoder.defaultAbiCoder();
      const hookData = coder.encode(
        ["address", "address", "uint256", "uint24", "uint24", "uint256", "uint256"],
        [wallet.address, projectToken, decayDuration, startFee, endFee, maxSwapAmount, cooldownDuration]
      );

      const poolKey = {
        currency0,
        currency1,
        fee: 3000,
        tickSpacing: 60,
        hooks: CONTRACTS.hatchHook
      };

      addLog("Launchpad", "Initializing Uniswap V4 Pool on PoolManager...", "info");
      
      const signer = wallet.signer;
      const poolManagerContract = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, signer);
      
      const newPoolId = computePoolId(poolKey);

      // Check if pool is already initialized
      addLog("Launchpad", "Checking pool status on-chain...", "info");
      const poolState = await poolManagerContract.pools(newPoolId);
      const isAlreadyInitialized = poolState && (poolState.initialized || poolState[2]);

      let initTxHash = "";
      if (!isAlreadyInitialized) {
        addLog("Launchpad", "Initializing Uniswap V4 Pool on PoolManager...", "info");
        const initTx = await poolManagerContract.initialize(poolKey, sqrtPriceX96, hookData, { gasLimit: 3000000 });
        setPendingTxHash(initTx.hash);
        addLog("Launchpad", `Transaction submitted: ${initTx.hash}. Waiting for confirmation...`, "info");
        await initTx.wait();
        initTxHash = initTx.hash;
        setIsTxSuccess(true);
        setPendingTxHash(null);
      } else {
        addLog("Launchpad", "Pool already initialized on-chain. Skipping initialize step.", "info");
      }

      // ── Optional Initial Liquidity Seeding ─────────────────────────────────
      const pAmt = parseFloat(seedProjectAmount || "0");
      const wAmt = parseFloat(seedWethAmount || "0");
      if (pAmt > 0 && wAmt > 0) {
        const reserves0 = poolState ? (poolState.reserves0 || poolState[0]) : 0n;
        const reserves1 = poolState ? (poolState.reserves1 || poolState[1]) : 0n;
        const hasLiquidity = (reserves0 && reserves0 > 0n) || (reserves1 && reserves1 > 0n);

        if (!hasLiquidity) {
          addLog("Launchpad", "Seeding initial liquidity to PoolManager...", "info");
          const seedProjectWei = ethers.parseEther(seedProjectAmount);
          const seedWethWei = ethers.parseEther(seedWethAmount);

          const projectERC20 = new ethers.Contract(projectToken, ERC20_ABI, signer);
          const wethERC20 = new ethers.Contract(baseToken, ERC20_ABI, signer);

          // 1. Approve project token spend
          addLog("Launchpad", `Approving ${seedProjectAmount} Project Tokens for PoolManager...`, "info");
          const appTx0 = await projectERC20.approve(CONTRACTS.poolManager, seedProjectWei, { gasLimit: 150000 });
          await appTx0.wait();

          // 2. Approve WETH spend
          addLog("Launchpad", `Approving ${seedWethAmount} WETH for PoolManager...`, "info");
          const appTx1 = await wethERC20.approve(CONTRACTS.poolManager, seedWethWei, { gasLimit: 150000 });
          await appTx1.wait();

          // 3. Call addLiquidityDirect
          addLog("Launchpad", "Submitting addLiquidityDirect transaction...", "info");
          const liq0 = isHatchCurrency0 ? seedProjectWei : seedWethWei;
          const liq1 = isHatchCurrency0 ? seedWethWei : seedProjectWei;

          const addLiqTx = await poolManagerContract.addLiquidityDirect(poolKey, liq0, liq1, { gasLimit: 3000000 });
          setPendingTxHash(addLiqTx.hash);
          await addLiqTx.wait();
          addLog("Launchpad", `Liquidity seeded successfully! Tx: ${addLiqTx.hash}`, "success");
        } else {
          addLog("Launchpad", "Pool already has seeded liquidity. Skipping liquidity seeding step.", "info");
        }
      }

      // Query symbol of the project token
      const projectTokenContract = new ethers.Contract(projectToken, ERC20_ABI, signer);
      const symbol = await projectTokenContract.symbol().catch(() => "CUSTOM");

      addLog(
        "LAUNCH SUCCESSFUL",
        `Pool successfully initialized! ID: ${newPoolId.slice(0, 10)}... Tx: ${initTxHash || "Already Initialized"}`,
        "success"
      );

      // Switch active pool context in UI
      setActivePoolKey(poolKey);
      setPoolIdHex(newPoolId);
      setIsCustomPoolActive(true);
      setCustomTokenDetails({
        symbol,
        isHatchCurrency0,
        projectTokenAddress: projectToken
      });
      setActiveDecayMode(decayMode);
      setActiveStartBlock(blockNumber || 0);

      // Add to custom pools list
      const newPool = {
        poolKey,
        poolId: newPoolId,
        symbol,
        isHatchCurrency0,
        projectTokenAddress: projectToken,
        createdAt: Date.now(),
        priceRatio,
        decayDurationHours,
        startFeePercent,
        endFeePercent,
        maxSwapAmountTokens,
        cooldownSeconds,
        seedProjectAmount,
        seedWethAmount,
        decayMode,
        startBlock: blockNumber || 0
      };

      setCustomPools((prev) => {
        const updated = [newPool, ...prev];
        try {
          localStorage.setItem("hatch_custom_pools", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save pool to local storage", e);
        }
        return updated;
      });

      return { success: true, txHash: initTxHash, poolId: newPoolId };
    } catch (err) {
      console.error(err);
      const msg = err?.reason || err?.message || "Initialization failed";
      addLog("LAUNCH ERROR", `Pool initialization failed: ${msg}`, "error");
      return { success: false, reason: msg };
    } finally {
      setIsTxPending(false);
    }
  };


  const resetToDefaultPool = () => {
    setActivePoolKey(POOL_KEY);
    setPoolIdHex(defaultPoolId);
    setIsCustomPoolActive(false);
    setCustomTokenDetails({
      symbol: "HATCH",
      isHatchCurrency0: deployments.isHatchCurrency0,
      projectTokenAddress: CONTRACTS.hatchToken
    });
    setActiveDecayMode("time");
    setActiveStartBlock(0);
    addLog("Launchpad", "Active pool reset to default HATCH pool.", "info");
  };

  const selectPool = (pool) => {
    setActivePoolKey(pool.poolKey);
    setPoolIdHex(pool.poolId);
    setIsCustomPoolActive(pool.symbol !== "HATCH");
    setCustomTokenDetails({
      symbol: pool.symbol,
      isHatchCurrency0: pool.isHatchCurrency0,
      projectTokenAddress: pool.projectTokenAddress
    });
    setActiveDecayMode(pool.decayMode || "time");
    setActiveStartBlock(pool.startBlock || 0);
    addLog("Launchpad", `Switched active pool view to ${pool.symbol}.`, "info");
  };

  // ── Context Value ───────────────────────────────────────────────────────────
  return (
    <WalletContext.Provider
      value={{
        address: wallet.address,
        isConnected: wallet.connected,
        isOnCorrectChain,
        chainId: wallet.chainId,
        switchChain: handleSwitchChain,
        connect: handleConnect,
        disconnect: handleDisconnect,

        okbBalance,
        wethBalance,
        hatchBalance,

        poolReserves,
        accumulatedFees,
        totalCreatorFeesClaimed,
        totalTokensBurned,

        isProtectionActive,
        currentFeeRate,
        timeElapsed,
        launchTime,
        decayDuration,
        startFee,
        endFee,
        maxSwapAmount: maxSwapAmount ? Number(ethers.formatEther(maxSwapAmount)).toFixed(0) : "1000",
        cooldownDuration,

        pendingTxHash,
        isTxPending,
        isTxSuccess,

        executeSwap,
        claimRoyalties,
        claimRoyaltiesAutonomously,
        initializePool,
        deployToken,
        mintWeth,
        resetToDefaultPool,
        selectPool,
        customPools,
        isCustomPoolActive,
        projectTokenDetails: customTokenDetails,

        logs,
        addLog,

        blockNumber,
        activeDecayMode,
        activeStartBlock,

        deployments,
        isDeployed,
        explorerUrl: targetChainId === 196 ? "https://www.oklink.com/xlayer" : "https://www.oklink.com/xlayer-test",
        targetChainId,
        setTargetChainId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
