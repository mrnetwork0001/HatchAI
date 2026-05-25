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

  const isOnCorrectChain = wallet.chainId === CHAIN_ID;
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

  // ── Auto-switch network if connected to wrong chain ─────────────────────────
  useEffect(() => {
    if (wallet.connected && wallet.chainId && wallet.chainId !== CHAIN_ID) {
      addLog("Network", `Connected to wrong chain (${wallet.chainId}). Prompting to switch to correct network (Chain ID: ${CHAIN_ID})...`, "info");
      switchToChain(CHAIN_ID).then((success) => {
        if (success) {
          addLog("Network", "Successfully switched to correct network.", "success");
        } else {
          addLog("Network Error", "Failed to switch network or switch rejected by user.", "error");
        }
      });
    }
  }, [wallet.connected, wallet.chainId, addLog]);

  // ── Derived State ───────────────────────────────────────────────────────────
  const nowSec = Math.floor(Date.now() / 1000);
  const launchTime = poolConfig ? Number(poolConfig[2]) : 0;
  const decayDuration = poolConfig ? Number(poolConfig[3]) : 86400;
  const startFee = poolConfig ? Number(poolConfig[4]) : 100000;
  const endFee = poolConfig ? Number(poolConfig[5]) : 3000;
  const maxSwapAmount = poolConfig ? poolConfig[6] : 0n;
  const cooldownDuration = poolConfig ? Number(poolConfig[7]) : 60;

  const timeElapsed = launchTime > 0 ? (nowSec - launchTime) * 1000 : 0;
  const isProtectionActive = launchTime > 0 && nowSec < launchTime + decayDuration;

  const getCurrentFeeRate = () => {
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
    if (wallet.chainId !== CHAIN_ID) {
      addLog("Swap Error", `Switch to X Layer Testnet (Chain: ${CHAIN_ID}) first.`, "error");
      await switchToChain(CHAIN_ID);
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
    if (wallet.chainId !== CHAIN_ID) {
      addLog("Claim Error", `Switch to X Layer Testnet (Chain: ${CHAIN_ID}) first.`, "error");
      await switchToChain(CHAIN_ID);
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
      const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
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

  // ── Launchpad Initializer ──────────────────────────────────────────────────
  const initializePool = async (config) => {
    if (!wallet.connected) {
      addLog("Launchpad Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== CHAIN_ID) {
      addLog("Launchpad Error", `Switch to X Layer Testnet (Chain: ${CHAIN_ID}) first.`, "error");
      await switchToChain(CHAIN_ID);
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
      cooldownSeconds
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

      const decayDuration = BigInt(Math.floor(parseFloat(decayDurationHours) * 3600));
      const startFee = Math.floor(parseFloat(startFeePercent) * 10000);
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
      
      const initTx = await poolManagerContract.initialize(poolKey, sqrtPriceX96, hookData);
      setPendingTxHash(initTx.hash);
      addLog("Launchpad", `Transaction submitted: ${initTx.hash}. Waiting for confirmation...`, "info");
      
      await initTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);
      
      const newPoolId = computePoolId(poolKey);

      // Query symbol of the project token
      const projectTokenContract = new ethers.Contract(projectToken, ERC20_ABI, signer);
      const symbol = await projectTokenContract.symbol().catch(() => "CUSTOM");

      addLog(
        "LAUNCH SUCCESSFUL",
        `Pool successfully initialized! ID: ${newPoolId.slice(0, 10)}... Tx: ${initTx.hash}`,
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
        cooldownSeconds
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

      return { success: true, txHash: initTx.hash, poolId: newPoolId };
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
        switchChain: () => switchToChain(CHAIN_ID),
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
        resetToDefaultPool,
        selectPool,
        customPools,
        isCustomPoolActive,
        projectTokenDetails: customTokenDetails,

        logs,
        addLog,

        deployments,
        isDeployed,
        explorerUrl: deployments.explorerUrl,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
