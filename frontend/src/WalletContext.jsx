/**
 * WalletContext.jsx
 *
 * Provides live blockchain state to all Hatch UI components.
 * Replaces the previous wagmi hooks with real OKX Wallet / EVM wallet direct provider connections.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { INITIAL_STATE } from "./lib/wallet";
import deployments from "./deployments.json";

// Wagmi & RainbowKit hooks
import { useAccount, useChainId, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
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

// Helper to validate EVM addresses
const isValidAddress = (addr) => addr && addr !== ethers.ZeroAddress && ethers.isAddress(addr);

// Compute pool ID (keccak256 of ABI-encoded PoolKey)
function computePoolId(poolKey) {
  if (!poolKey || !poolKey.currency0 || !poolKey.currency1) {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
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

  // ── Wagmi & RainbowKit Hooks ───────────────────────────────────────────────
  const { address: wagmiAddress, isConnected: wagmiIsConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();

  // ── Sync Wagmi state with Ethers ───────────────────────────────────────────
  useEffect(() => {
    if (wagmiIsConnected && walletClient && wagmiAddress) {
      const updateEthersWallet = async () => {
        try {
          // Build an ethers provider backed by the wagmi walletClient's transport.
          // For read-only RPC calls (balanceOf, etc.) we use a public JsonRpcProvider
          // so we never trigger wallet pop-ups. For write operations (sendTransaction)
          // we delegate directly to the wagmi walletClient which already holds the
          // OKX / MetaMask / Rabby session and properly encodes calldata.
          
          let chainId = Number(walletClient.chain?.id || wagmiChainId);
          if (chainId === 195) chainId = 1952; // Normalize X Layer Testnet

          const rpcUrl = chainId === 196
            ? "https://rpc.xlayer.tech"
            : "https://testrpc.xlayer.tech";

          // Public provider for read-only calls
          const provider = new ethers.JsonRpcProvider(rpcUrl);

          // Wrap walletClient as an ethers Signer so that contract.method() calls
          // go through the connected wallet (OKX / MetaMask / Rabby).
          const signer = new ethers.VoidSigner(wagmiAddress, provider);

          // Override populateTransaction to prevent ethers from injecting a nonce.
          // VoidSigner calls provider.getTransactionCount() which can return null on
          // some RPC endpoints, causing "invalid BigNumberish value (tx.nonce, null)".
          // We let viem (walletClient) manage nonce automatically instead.
          signer.populateTransaction = async (tx) => {
            const resolved = await ethers.resolveProperties(tx);
            // Only fill in fields that viem won't auto-manage; skip nonce entirely.
            return {
              ...resolved,
              from: wagmiAddress,
              // Remove nonce so viem auto-manages it (avoids null nonce error)
              nonce: undefined,
            };
          };

          // Monkey-patch sendTransaction to use the wagmi walletClient.
          // This is the only method that actually needs wallet signing.
          signer.sendTransaction = async (tx) => {
            // Resolve any ethers promises in the tx object
            const resolved = await ethers.resolveProperties(tx);
            const hash = await walletClient.sendTransaction({
              // For contract deployments, `to` is null — viem needs it omitted (undefined)
              ...(resolved.to != null && { to: resolved.to }),
              data: resolved.data || "0x",
              value: resolved.value ? BigInt(resolved.value.toString()) : 0n,
              gas: resolved.gasLimit ? BigInt(resolved.gasLimit.toString()) : undefined,
              gasPrice: resolved.gasPrice ? BigInt(resolved.gasPrice.toString()) : undefined,
              // Let viem auto-manage nonce; only pass if explicitly provided and not null
              nonce: (resolved.nonce != null) ? Number(resolved.nonce) : undefined,
              chainId: chainId,
              account: wagmiAddress,
            });
            // Return immediately with hash — .wait() polls for the receipt asynchronously
            return {
              hash,
              wait: (confirms = 1) => provider.waitForTransaction(hash, confirms),
              from: wagmiAddress,
              to: resolved.to,
              data: resolved.data || "0x",
              value: resolved.value ? BigInt(resolved.value.toString()) : 0n,
            };
          };

          // Also patch signMessage (needed for some flows)
          signer.signMessage = async (message) => {
            return walletClient.signMessage({ message: typeof message === "string" ? message : { raw: message } });
          };

          setWallet({
            connected: true,
            address: wagmiAddress,
            chainId,
            isXLayer: chainId === 196 || chainId === 1952,
            provider,
            signer,
          });
        } catch (err) {
          console.error("Error setting up ethers provider/signer from walletClient:", err);
        }
      };
      updateEthersWallet();
    } else {
      setWallet(INITIAL_STATE);
    }
  }, [walletClient, wagmiAddress, wagmiIsConnected, wagmiChainId]);

  const [logs, setLogs] = useState([]);
  const [pendingTxHash, setPendingTxHash] = useState(null);
  const [isTxPending, setIsTxPending] = useState(false);
  const [isTxSuccess, setIsTxSuccess] = useState(false);

  // ── Stable RPC provider (reused across polls) ─────────────────────────────
  const publicProviderRef = useRef(null);
  const providerChainIdRef = useRef(null);

  // Dynamic chain ID configuration
  const [targetChainId, setTargetChainId] = useState(() => {
    if (deployments["196"]) return 196;
    if (deployments["1952"]) return 1952;
    const keys = Object.keys(deployments);
    return Number(keys[0]) || 196;
  });

  const activeConfig = deployments[targetChainId] || deployments["196"] || deployments;
  const CONTRACTS = activeConfig.contracts || {};
  const POOL_KEY = activeConfig.poolKey || {};
  const isDeployed = !!(CONTRACTS.hatchHook && CONTRACTS.hatchHook !== "0x0000000000000000000000000000000000000000");

  const isOnCorrectChain = wallet.chainId === targetChainId;

  // ── Dynamic Pool State ──────────────────────────────────────────────────────
  const defaultPoolId = (isDeployed && POOL_KEY.currency0) ? computePoolId(POOL_KEY) : "0x0000000000000000000000000000000000000000000000000000000000000000";
  const [activePoolKey, setActivePoolKey] = useState(POOL_KEY);
  const [poolIdHex, setPoolIdHex] = useState(defaultPoolId);
  const [isCustomPoolActive, setIsCustomPoolActive] = useState(false);
  const [customTokenDetails, setCustomTokenDetails] = useState(() => {
    const defaultChainId = deployments["1952"] ? 1952 : (Object.keys(deployments)[0] || 1952);
    if (defaultChainId === 196) {
      return {
        symbol: "USDT0",
        isHatchCurrency0: true,
        projectTokenAddress: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736"
      };
    }
    const activeConfig = deployments[defaultChainId] || deployments;
    const CONTRACTS = activeConfig.contracts || {};
    return {
      symbol: activeConfig.isHatchCurrency0 ? "HATCH" : "MATCH",
      isHatchCurrency0: activeConfig.isHatchCurrency0 !== undefined ? activeConfig.isHatchCurrency0 : true,
      projectTokenAddress: CONTRACTS.hatchToken || "0x0000000000000000000000000000000000000000"
    };
  });

  // Keep state in sync with network switches
  useEffect(() => {
    const activeConfig = deployments[targetChainId] || deployments["196"] || deployments;
    const CONTRACTS = activeConfig.contracts || {};
    const POOL_KEY = activeConfig.poolKey || {};
    const isDeployed = !!(CONTRACTS.hatchHook && CONTRACTS.hatchHook !== "0x0000000000000000000000000000000000000000");
    const defaultPoolId = (isDeployed && POOL_KEY.currency0) ? computePoolId(POOL_KEY) : "0x0000000000000000000000000000000000000000000000000000000000000000";

    setActivePoolKey(POOL_KEY);
    setPoolIdHex(defaultPoolId);
    setIsCustomPoolActive(false);

    // Reset balances & reserves on network switch
    setWethBalance("0.0000");
    setHatchBalance("0.00");
    setPoolReserves({ weth: 0, hatch: 0 });
    setPoolConfig(null);
    setTotalCreatorFeesClaimed("0");
    setTotalTokensBurned("0");
    setAccumulatedFees(0);
    setLastSwapTs(0n);
    setWethAllowance(0n);

    if (targetChainId === 196) {
      setCustomTokenDetails({
        symbol: "USDT0",
        isHatchCurrency0: true,
        projectTokenAddress: CONTRACTS.usdt0 || "0x779Ded0c9e1022225f8E0630b35a9b54bE713736"
      });
    } else {
      setCustomTokenDetails({
        symbol: activeConfig.isHatchCurrency0 ? "HATCH" : "MATCH",
        isHatchCurrency0: activeConfig.isHatchCurrency0 !== undefined ? activeConfig.isHatchCurrency0 : true,
        projectTokenAddress: CONTRACTS.hatchToken || "0x0000000000000000000000000000000000000000"
      });
    }
  }, [targetChainId]);

  // Reset pool-specific states when the active pool changes
  useEffect(() => {
    setPoolReserves({ weth: 0, hatch: 0 });
    setPoolConfig(null);
    setTotalCreatorFeesClaimed("0");
    setTotalTokensBurned("0");
    setAccumulatedFees(0);
    setLastSwapTs(0n);
  }, [poolIdHex]);

  // ── Custom Pool Registrations ───────────────────────────────────────────────
  // Hardcoded showcase pools — always present regardless of backend or localStorage
  const SHOWCASE_POOLS = [
    { poolId: "0x1ea175ae9e7f075f8539de8f118f8407c7e046300ea3e94e2f3f318dc1229bdc", chainId: 196, symbol: "HAI", isHatchCurrency0: false, projectTokenAddress: "0xef3a51df4761feab2ed21424f5123a793aea46dc", createdAt: 1779880233640, priceRatio: "1000", startFeePercent: "10", endFeePercent: "0.3", maxSwapAmountTokens: "1000", cooldownSeconds: "30", decayDurationHours: "24", decayMode: "time", startBlock: 0, poolKey: {} },
    { poolId: "0x8fb70c677e4715d804e07a0a3f976e8e985b56a83fc5bcc8d076c31718ae2989", chainId: 196, symbol: "NTU", isHatchCurrency0: false, projectTokenAddress: "0x27f2373d532b94cd060da9303e8aeb1794a58d61", createdAt: 1779880233640, priceRatio: "1000", startFeePercent: "10", endFeePercent: "0.3", maxSwapAmountTokens: "1000", cooldownSeconds: "30", decayDurationHours: "24", decayMode: "time", startBlock: 0, poolKey: {} }
  ];

  const [customPools, setCustomPools] = useState(() => {
    try {
      const saved = localStorage.getItem("hatch_custom_pools");
      const localPools = saved ? JSON.parse(saved) : [];
      // Merge showcase pools with any local pools
      const merged = [...SHOWCASE_POOLS];
      localPools.forEach(lp => {
        if (!merged.find(p => p.poolId === lp.poolId)) {
          merged.push(lp);
        }
      });
      return merged;
    } catch {
      return [...SHOWCASE_POOLS];
    }
  });

  // Also try fetching from backend if available (additive merge)
  useEffect(() => {
    const fetchBackendPools = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
        const res = await fetch(`${backendUrl}/pools`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          setCustomPools(prev => {
            const merged = [...prev];
            data.forEach(bp => {
              if (!merged.find(p => p.poolId === bp.poolId)) {
                merged.push(bp);
              }
            });
            // Also push any local-only pools to backend
            prev.forEach(lp => {
              if (!data.find(p => p.poolId === lp.poolId)) {
                fetch(`${backendUrl}/pools`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(lp)
                }).catch(() => {});
              }
            });
            return merged;
          });
        }
      } catch (e) {
        console.error("Backend unavailable, using hardcoded pools:", e.message);
      }
    };
    fetchBackendPools();
  }, []);

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
    const { connected, address } = currentWallet || {};
    
    // Reuse a single public provider per chain to avoid rate-limiting from creating new connections every poll
    const rpcUrl = targetChainId === 196 ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech";
    if (!publicProviderRef.current || providerChainIdRef.current !== targetChainId) {
      publicProviderRef.current = new ethers.JsonRpcProvider(rpcUrl, undefined, { batchMaxCount: 1 });
      providerChainIdRef.current = targetChainId;
    }
    const publicProvider = publicProviderRef.current;

    try {
      // Fetch native gas balance if connected using publicProvider
      if (connected && address) {
        publicProvider.getBalance(address).then((balanceWei) => {
          setOkbBalance(Number(ethers.formatEther(balanceWei)).toFixed(4));
        }).catch(() => {});
        publicProvider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => {});
      } else {
        setOkbBalance("0");
        setWethBalance("0");
        setHatchBalance("0");
        setWethAllowance(0n);
      }

      if (!isDeployed) return;

      const hasWeth = isValidAddress(CONTRACTS.weth);
      const hasHatch = isValidAddress(customTokenDetails.projectTokenAddress);
      const hasPoolManager = isValidAddress(CONTRACTS.poolManager);
      const hasHatchHook = isValidAddress(CONTRACTS.hatchHook);
      const hasValidPool = poolIdHex && poolIdHex !== ethers.ZeroHash && poolIdHex !== "0x0000000000000000000000000000000000000000000000000000000000000000";

      const wethContract = hasWeth ? new ethers.Contract(CONTRACTS.weth, ERC20_ABI, publicProvider) : null;
      const hatchTokenContract = hasHatch ? new ethers.Contract(customTokenDetails.projectTokenAddress, ERC20_ABI, publicProvider) : null;
      const poolManagerContract = hasPoolManager ? new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, publicProvider) : null;
      const hatchHookContract = hasHatchHook ? new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, publicProvider) : null;

      const userQueries = (connected && address) ? [
        wethContract ? wethContract.balanceOf(address) : Promise.reject("No WETH"),
        hatchTokenContract ? hatchTokenContract.balanceOf(address).catch(() => 0n) : Promise.reject("No HATCH"),
        (wethContract && hasPoolManager) ? wethContract.allowance(address, CONTRACTS.poolManager) : Promise.reject("No Allowance")
      ] : [
        Promise.reject("Disconnected"),
        Promise.reject("Disconnected"),
        Promise.reject("Disconnected")
      ];

      const poolQueries = [
        (poolManagerContract && hasValidPool) ? (
          targetChainId === 196 ? (
            Promise.all([
              new ethers.Contract(
                "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
                [
                  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
                  "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
                ],
                publicProvider
              ).getSlot0(poolIdHex).catch(() => [{ sqrtPriceX96: 0n }]),
              new ethers.Contract(
                "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
                [
                  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
                  "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
                ],
                publicProvider
              ).getLiquidity(poolIdHex).catch(() => 0n)
            ]).then(([slot0, liquidity]) => {
              return { isMainnet: true, slot0, liquidity };
            })
          ) : poolManagerContract.pools(poolIdHex)
        ) : Promise.reject("No Pool"),
        (hatchHookContract && hasValidPool) ? hatchHookContract.poolConfigs(poolIdHex).catch((e) => { console.error("poolConfigs error:", e.message); return null; }) : Promise.reject("No Config"),
        (hatchHookContract && hasValidPool) ? hatchHookContract.totalCreatorFeesClaimed(poolIdHex).catch(() => 0n) : Promise.reject("No Claimed"),
        (hatchHookContract && hasValidPool) ? hatchHookContract.totalTokensBurned(poolIdHex).catch(() => 0n) : Promise.reject("No Burned"),
        // hookFees0/hookFees1 only exist on MockPoolManager (testnet), not on official V4 PoolManager
        (poolManagerContract && hasValidPool && targetChainId !== 196) ? poolManagerContract.hookFees0(poolIdHex) : Promise.reject("No Fees0"),
        (poolManagerContract && hasValidPool && targetChainId !== 196) ? poolManagerContract.hookFees1(poolIdHex) : Promise.reject("No Fees1"),
        (hatchHookContract && hasValidPool && connected && address) ? hatchHookContract.lastSwapTimestamp(poolIdHex, address).catch(() => 0n) : Promise.reject("No LastSwap")
      ];

      const [
        wethBalRes,
        hatchBalRes,
        allowanceRes,
        poolStateRes,
        poolConfigRes,
        claimedRes,
        burnedRes,
        fees0Res,
        fees1Res,
        lastSwapRes
      ] = await Promise.allSettled([...userQueries, ...poolQueries]);

      console.log("OnChainData Polled:", {
        walletConnected: connected,
        walletAddress: address,
        poolIdHex,
        projectTokenAddress: customTokenDetails.projectTokenAddress,
        wethBalResStatus: wethBalRes.status,
        wethBalResValue: wethBalRes.status === "fulfilled" ? wethBalRes.value.toString() : null,
        hatchBalResStatus: hatchBalRes.status,
        hatchBalResValue: hatchBalRes.status === "fulfilled" ? hatchBalRes.value.toString() : null,
        poolStateResStatus: poolStateRes.status,
        poolStateResValue: poolStateRes.status === "fulfilled" ? poolStateRes.value : null,
        poolConfigResStatus: poolConfigRes.status,
        poolConfigResValue: poolConfigRes.status === "fulfilled" ? poolConfigRes.value : null
      });

      addLog("Debug WETH Balance", `Status: ${wethBalRes.status}, Value: ${wethBalRes.status === "fulfilled" ? wethBalRes.value.toString() : wethBalRes.reason}`, "info");
      addLog("Debug Token Balance", `Status: ${hatchBalRes.status}, Value: ${hatchBalRes.status === "fulfilled" ? hatchBalRes.value.toString() : hatchBalRes.reason}`, "info");
      addLog("Debug Pool Reserves", `Status: ${poolStateRes.status}, Value: ${poolStateRes.status === "fulfilled" ? JSON.stringify(poolStateRes.value, (k, v) => typeof v === 'bigint' ? v.toString() : v) : poolStateRes.reason}`, "info");
      addLog("Debug Pool Config", `Status: ${poolConfigRes.status}, Value: ${poolConfigRes.status === "fulfilled" ? JSON.stringify(poolConfigRes.value, (k, v) => typeof v === 'bigint' ? v.toString() : v) : poolConfigRes.reason}`, "info");

      if (wethBalRes.status === "fulfilled") {
        setWethBalance(Number(ethers.formatEther(wethBalRes.value)).toFixed(4));
      }
      if (hatchBalRes.status === "fulfilled") {
        const symbol = customTokenDetails.symbol;
        const decimals = (symbol === "USDT" || symbol === "USDT0") ? 6 : 18;
        setHatchBalance(Number(ethers.formatUnits(hatchBalRes.value, decimals)).toFixed(2));
      }

      if (poolStateRes.status === "fulfilled") {
        const val = poolStateRes.value;
        if (val && val.isMainnet) {
          try {
            const { slot0, liquidity } = val;
            const Q96 = 2n ** 96n;
            const raw0 = slot0?.[0] ?? slot0?.sqrtPriceX96 ?? 0n;
            const sqrtPriceX96 = typeof raw0 === 'bigint' ? raw0 : BigInt(raw0?.toString?.() || "0");
            const L = typeof liquidity === 'bigint' ? liquidity : BigInt(liquidity?.toString?.() || "0");

            let wethRes = 0;
            let hatchRes = 0;

            if (sqrtPriceX96 > 0n && L > 0n) {
              const x = (L * Q96) / sqrtPriceX96;
              const y = (L * sqrtPriceX96) / Q96;

              const symbol = customTokenDetails.symbol;
              const decimalsHatch = (symbol === "USDT" || symbol === "USDT0") ? 6 : 18;

              const r0 = Number(ethers.formatUnits(x, customTokenDetails.isHatchCurrency0 ? decimalsHatch : 18));
              const r1 = Number(ethers.formatUnits(y, customTokenDetails.isHatchCurrency0 ? 18 : decimalsHatch));

              wethRes = customTokenDetails.isHatchCurrency0 ? r1 : r0;
              hatchRes = customTokenDetails.isHatchCurrency0 ? r0 : r1;
            }
            setPoolReserves({ weth: wethRes, hatch: hatchRes });
          } catch (bigIntErr) {
            console.warn("Pool state BigInt conversion failed:", bigIntErr.message);
            setPoolReserves({ weth: 0, hatch: 0 });
          }
        } else {
          const poolState = val;
          try {
            setPoolReserves({
              weth: Number(ethers.formatEther(customTokenDetails.isHatchCurrency0 ? poolState[1] : poolState[0])),
              hatch: Number(ethers.formatEther(customTokenDetails.isHatchCurrency0 ? poolState[0] : poolState[1])),
            });
          } catch {
            setPoolReserves({ weth: 0, hatch: 0 });
          }
        }
      }

      if (poolConfigRes.status === "fulfilled" && poolConfigRes.value) {
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
        try {
          const v = lastSwapRes.value;
          setLastSwapTs(BigInt(typeof v === 'bigint' ? v : (v?.toString() || "0")));
        } catch { setLastSwapTs(0n); }
      }

      if (allowanceRes.status === "fulfilled") {
        try {
          const v = allowanceRes.value;
          setWethAllowance(BigInt(typeof v === 'bigint' ? v : (v?.toString() || "0")));
        } catch { setWethAllowance(0n); }
      }

    } catch (err) {
      console.error("Error fetching onchain data:", err);
    }
  }, [poolIdHex, isDeployed, customTokenDetails, targetChainId]);

  // Periodic polling for watch-like updates (polls every 5s regardless of wallet connection status)
  useEffect(() => {
    fetchOnChainData(wallet);

    const interval = setInterval(() => {
      fetchOnChainData(wallet);
    }, 5000);
    return () => clearInterval(interval);
  }, [wallet, fetchOnChainData]);

  useEffect(() => {
    if (!wallet.connected) {
      const rpcUrl = targetChainId === 196 ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech";
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      provider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => { });
      const interval = setInterval(() => {
        provider.getBlockNumber().then((b) => setBlockNumber(Number(b))).catch(() => { });
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [wallet.connected, targetChainId]);

  // Connect & Disconnect handlers
  const handleConnect = async () => {
    try {
      addLog("Wallet", "Connecting wallet...", "info");
      if (openConnectModal) {
        openConnectModal();
      } else {
        addLog("Wallet Error", "Wallet modal not available.", "error");
      }
    } catch (err) {
      addLog("Wallet Error", err.message, "error");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAsync();
      addLog("Wallet", "Disconnected.", "info");
    } catch (err) {
      addLog("Wallet Error", err.message, "error");
    }
  };

  const handleSwitchChain = async () => {
    const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
    addLog("Network", `Prompting wallet to switch to ${targetName} (Chain ID: ${targetChainId})...`, "info");
    try {
      await switchChainAsync({ chainId: targetChainId });
      addLog("Network", `Wallet successfully switched to ${targetName}.`, "success");
    } catch (err) {
      addLog("Network Error", `Failed to switch wallet network: ${err.message}`, "error");
    }
  };

  // ── Auto-switch network if connected to wrong chain ─────────────────────────
  useEffect(() => {
    if (wallet.connected && wallet.chainId && wallet.chainId !== targetChainId) {
      const targetName = targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet";
      setTimeout(() => {
        addLog("Network", `Connected to wrong chain (${wallet.chainId}). Prompting to switch to correct network (${targetName}, Chain ID: ${targetChainId})...`, "info");
      }, 0);
      switchChainAsync({ chainId: targetChainId }).then(() => {
        setTimeout(() => addLog("Network", `Successfully switched to ${targetName}.`, "success"), 0);
      }).catch((err) => {
        setTimeout(() => addLog("Network Error", `Failed to switch network: ${err.message}`, "error"), 0);
      });
    }
  }, [wallet.connected, wallet.chainId, targetChainId, addLog, switchChainAsync]);

  // ── Derived State ───────────────────────────────────────────────────────────
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
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
      if (!isValidAddress(CONTRACTS.weth) || !isValidAddress(CONTRACTS.poolManager)) {
        throw new Error("Required contracts (WETH or PoolManager) are not deployed on this network.");
      }
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
        `Tx hash: ${swapTx.hash} - View on OKLink: ${activeConfig.explorerUrl}/tx/${swapTx.hash}`,
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
        `claimFees tx confirmed! View: ${activeConfig.explorerUrl}/tx/${claimTx.hash}`,
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

  const claimRoyaltiesMainnet = async (tokenId) => {
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
    if (!tokenId) {
      addLog("Claim Error", "Please provide a valid LP NFT Token ID.", "error");
      return { success: false, reason: "No Token ID" };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      const signer = wallet.signer;
      const hatchHookContract = new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, signer);

      addLog("Fee Harvest", `Submitting claimFeesMainnet() to HatchHook for NFT ID: ${tokenId}...`, "info");

      const claimTx = await hatchHookContract.claimFeesMainnet(
        activePoolKey,
        CONTRACTS.positionManager,
        BigInt(tokenId)
      );
      setPendingTxHash(claimTx.hash);
      addLog("Fee Harvest", `claimFeesMainnet tx submitted: ${claimTx.hash}. Waiting for confirmation...`, "info");

      await claimTx.wait();
      setIsTxSuccess(true);
      setPendingTxHash(null);

      addLog(
        "FEE HARVEST SUCCESSFUL",
        `claimFeesMainnet tx confirmed! View: ${activeConfig.explorerUrl}/tx/${claimTx.hash}`,
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

    if (targetChainId === 196) {
      addLog("Faucet Error", "Mock WETH Faucet is not available on X Layer Mainnet.", "error");
      return { success: false, reason: "Mock WETH Faucet is not available on X Layer Mainnet. Mainnet uses real WETH." };
    }

    setIsTxPending(true);
    setIsTxSuccess(false);

    try {
      addLog("WETH Faucet", `Minting ${amountStr} Mock WETH to your wallet...`, "info");

      if (!isValidAddress(CONTRACTS.weth)) {
        throw new Error("Mock WETH contract is not deployed on this network (Mainnet uses real WETH).");
      }
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

    if (!ethers.isAddress(config.projectToken)) {
      addLog("Launchpad Error", "Invalid project token address.", "error");
      return { success: false, reason: "Invalid project token address" };
    }
    if (!ethers.isAddress(config.baseToken)) {
      addLog("Launchpad Error", "Invalid base token address.", "error");
      return { success: false, reason: "Invalid base token address" };
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
        fee: targetChainId === 196 ? 8388608 : 3000,
        tickSpacing: 60,
        hooks: CONTRACTS.hatchHook
      };

      addLog("Launchpad", "Initializing Uniswap V4 Pool on PoolManager...", "info");

      const signer = wallet.signer;
      const poolManagerContract = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, signer);

      const newPoolId = computePoolId(poolKey);

      // Check if pool is already initialized
      addLog("Launchpad", "Checking pool status onchain...", "info");
      let isAlreadyInitialized = false;
      let poolState = null;
      if (targetChainId === 196) {
        try {
          const rpcUrl = "https://rpc.xlayer.tech";
          const publicProvider = new ethers.JsonRpcProvider(rpcUrl);
          const stateViewContract = new ethers.Contract(
            "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
            ["function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"],
            publicProvider
          );
          const slot0 = await stateViewContract.getSlot0(newPoolId);
          isAlreadyInitialized = slot0 && BigInt(slot0[0]) > 0n;
        } catch (e) {
          console.log("Failed to check pool initialization via StateView", e);
        }
      } else {
        try {
          const testnetPublicProvider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
          const poolManagerRead = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, testnetPublicProvider);
          poolState = await poolManagerRead.pools(newPoolId);
          isAlreadyInitialized = poolState && (poolState.initialized || poolState[2]);
        } catch (e) {
          console.log("Could not check pool state via pools() — will attempt initialize", e.message);
          isAlreadyInitialized = false;
        }
      }

      let initTxHash = "";
      if (!isAlreadyInitialized) {
        addLog("Launchpad", "Initializing Uniswap V4 Pool on PoolManager...", "info");
        const initTx = await poolManagerContract.initialize(poolKey, sqrtPriceX96, { gasLimit: 3000000 });
        setPendingTxHash(initTx.hash);
        addLog("Launchpad", `Transaction submitted: ${initTx.hash}. Waiting for confirmation...`, "info");
        await initTx.wait();
        initTxHash = initTx.hash;
        setIsTxSuccess(true);
        setPendingTxHash(null);
      } else {
        addLog("Launchpad", "Pool already initialized onchain. Skipping initialize step.", "info");
      }

      // Configure the launch parameters on the Hook contract
      try {
        addLog("Launchpad", "Initializing launch configurations on Hook contract...", "info");
        const hookContract = new ethers.Contract(
          CONTRACTS.hatchHook,
          ["function initializeLaunchPool((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration) external"],
          signer
        );
        const configTx = await hookContract.initializeLaunchPool(
          poolKey,
          decayDuration,
          startFee,
          endFee,
          maxSwapAmount,
          cooldownDuration,
          { gasLimit: 500000 }
        );
        setPendingTxHash(configTx.hash);
        addLog("Launchpad", `Configuration transaction submitted: ${configTx.hash}. Waiting...`, "info");
        await configTx.wait();
        setPendingTxHash(null);
        addLog("Launchpad", "Hook launch configurations successfully saved!", "success");
      } catch (configErr) {
        console.warn("Failed to set hook configuration (might be already configured):", configErr);
        addLog("Launchpad", "Hook launch config checked/already configured.", "info");
        setPendingTxHash(null);
      }

      // ── Optional Initial Liquidity Seeding ─────────────────────────────────
      const pAmt = parseFloat(seedProjectAmount || "0");
      const wAmt = parseFloat(seedWethAmount || "0");
      if (pAmt > 0 && wAmt > 0) {
        if (targetChainId === 196) {
          // Mainnet: seed liquidity via official Uniswap V4 PositionManager
          const positionManagerAddress = CONTRACTS.positionManager || "0xcf1eafc6928dc385a342e7c6491d371d2871458b";
          addLog("Launchpad", "Seeding initial liquidity via PositionManager...", "info");

          try {
            const seedProjectWei = ethers.parseEther(seedProjectAmount);
            const seedWethWei = ethers.parseEther(seedWethAmount);

            const projectERC20 = new ethers.Contract(projectToken, ERC20_ABI, signer);
            const wethERC20 = new ethers.Contract(baseToken, ERC20_ABI, signer);

            // V4 PositionManager uses Permit2 for token transfers
            const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
            const permit2Contract = new ethers.Contract(
              PERMIT2_ADDRESS,
              ["function approve(address token, address spender, uint160 amount, uint48 expiration) external"],
              signer
            );
            const MAX_UINT160 = (2n ** 160n) - 1n;
            const MAX_UINT48 = (2n ** 48n) - 1n;

            // 1. Approve project token → Permit2 → PositionManager
            addLog("Launchpad", `Approving ${seedProjectAmount} Project Tokens via Permit2...`, "info");
            const appTx0 = await projectERC20.approve(PERMIT2_ADDRESS, ethers.MaxUint256, { gasLimit: 150000 });
            await appTx0.wait();
            const p2App0 = await permit2Contract.approve(projectToken, positionManagerAddress, MAX_UINT160, MAX_UINT48, { gasLimit: 100000 });
            await p2App0.wait();

            // 2. Approve WETH → Permit2 → PositionManager
            addLog("Launchpad", `Approving ${seedWethAmount} WETH via Permit2...`, "info");
            const appTx1 = await wethERC20.approve(PERMIT2_ADDRESS, ethers.MaxUint256, { gasLimit: 150000 });
            await appTx1.wait();
            const p2App1 = await permit2Contract.approve(baseToken, positionManagerAddress, MAX_UINT160, MAX_UINT48, { gasLimit: 100000 });
            await p2App1.wait();

            // 3. Build modifyLiquidities calldata
            // Full-range position: tickLower = -887220, tickUpper = 887220 (nearest multiples of tickSpacing=60)
            const tickLower = -887220;
            const tickUpper = 887220;

            const amount0Desired = isHatchCurrency0 ? seedProjectWei : seedWethWei;
            const amount1Desired = isHatchCurrency0 ? seedWethWei : seedProjectWei;

            // Calculate correct Uniswap liquidity L from token amounts and sqrtPriceX96
            // For full-range: L ≈ min(amount0 * sqrtPriceX96 / Q96, amount1 * Q96 / sqrtPriceX96)
            const Q96 = 2n ** 96n;
            const L0 = (amount0Desired * sqrtPriceX96) / Q96;
            const L1 = (amount1Desired * Q96) / sqrtPriceX96;
            // Use 95% of the smaller L to avoid rounding reverts
            const liquidityAmount = ((L0 < L1 ? L0 : L1) * 95n) / 100n;

            // Allow 5% extra on max amounts for slippage
            const amount0Max = (amount0Desired * 105n) / 100n;
            const amount1Max = (amount1Desired * 105n) / 100n;

            const recipient = await signer.getAddress();
            const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

            // Action codes for Uniswap V4 PositionManager
            const MINT_POSITION = 0x02;
            const SETTLE_PAIR = 0x0d; // 13 decimal

            // Encode actions: MINT_POSITION + SETTLE_PAIR
            const actions = ethers.solidityPacked(
              ["uint8", "uint8"],
              [MINT_POSITION, SETTLE_PAIR]
            );

            // Encode MINT_POSITION params: (poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, recipient, hookData)
            const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
              [
                "tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
                "int24",
                "int24",
                "uint256",
                "uint128",
                "uint128",
                "address",
                "bytes"
              ],
              [
                [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
                tickLower,
                tickUpper,
                liquidityAmount,
                amount0Max,
                amount1Max,
                recipient,
                "0x"
              ]
            );

            // Encode SETTLE_PAIR params: (currency0, currency1)
            const settleParams = ethers.AbiCoder.defaultAbiCoder().encode(
              ["address", "address"],
              [poolKey.currency0, poolKey.currency1]
            );

            // Encode final unlockData: abi.encode(actions, params[])
            const unlockData = ethers.AbiCoder.defaultAbiCoder().encode(
              ["bytes", "bytes[]"],
              [actions, [mintParams, settleParams]]
            );

            // 4. Call modifyLiquidities
            const positionManagerContract = new ethers.Contract(
              positionManagerAddress,
              ["function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable"],
              signer
            );

            addLog("Launchpad", "Submitting liquidity position to PositionManager...", "info");
            const liqTx = await positionManagerContract.modifyLiquidities(unlockData, deadline, { gasLimit: 5000000 });
            setPendingTxHash(liqTx.hash);
            addLog("Launchpad", `Liquidity tx submitted: ${liqTx.hash}. Waiting for confirmation...`, "info");
            await liqTx.wait();
            setPendingTxHash(null);
            addLog("Launchpad", `Liquidity seeded successfully via PositionManager! Tx: ${liqTx.hash}`, "success");
          } catch (liqErr) {
            console.error("Mainnet liquidity seeding error:", liqErr);
            addLog("Launchpad", `Liquidity seeding failed: ${liqErr.reason || liqErr.shortMessage || liqErr.message}. You can add liquidity manually via the PositionManager.`, "error");
            setPendingTxHash(null);
          }
        } else {
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
        startBlock: blockNumber || 0,
        chainId: targetChainId
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

      // Post to backend
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
        await fetch(`${backendUrl}/pools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPool)
        });
      } catch (e) {
        console.error("Failed to sync pool to backend", e);
      }

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


  const importPool = async (projectTokenAddress) => {
    if (!wallet.connected) {
      addLog("Import Error", "Connect your wallet first.", "error");
      return { success: false, reason: "Wallet not connected" };
    }
    if (!ethers.isAddress(projectTokenAddress)) {
      addLog("Import Error", "Invalid project token address.", "error");
      return { success: false, reason: "Invalid address" };
    }

    try {
      addLog("Import Pool", `Importing pool for token: ${projectTokenAddress}...`, "info");
      const baseToken = CONTRACTS.weth;
      const currency0 = projectTokenAddress.toLowerCase() < baseToken.toLowerCase() ? projectTokenAddress : baseToken;
      const currency1 = projectTokenAddress.toLowerCase() < baseToken.toLowerCase() ? baseToken : projectTokenAddress;
      const isHatchCurrency0 = projectTokenAddress.toLowerCase() === currency0.toLowerCase();

      const poolKey = {
        currency0,
        currency1,
        fee: targetChainId === 196 ? 8388608 : 3000,
        tickSpacing: 60,
        hooks: CONTRACTS.hatchHook
      };

      const newPoolId = computePoolId(poolKey);
      const rpcUrl = targetChainId === 196 ? "https://rpc.xlayer.tech" : "https://testrpc.xlayer.tech";
      const publicProvider = new ethers.JsonRpcProvider(rpcUrl);
      const hatchHookContract = new ethers.Contract(CONTRACTS.hatchHook, HATCH_HOOK_ABI, publicProvider);

      addLog("Import Pool", "Fetching config from HatchHook contract...", "info");
      const config = await hatchHookContract.poolConfigs(newPoolId);

      if (!config || config.creator === "0x0000000000000000000000000000000000000000") {
        addLog("Import Error", "This pool has not been initialized onchain yet.", "error");
        return { success: false, reason: "Pool not initialized onchain" };
      }

      // Query symbol of the project token
      const projectTokenContract = new ethers.Contract(projectTokenAddress, ERC20_ABI, publicProvider);
      const symbol = await projectTokenContract.symbol().catch(() => "CUSTOM");

      // Extract details
      const launchTime = Number(config.launchTime);
      const decayDuration = Number(config.decayDuration);
      const startFee = Number(config.startFee);
      const endFee = Number(config.endFee);
      const maxSwapAmount = config.maxSwapAmount;
      const cooldownDuration = Number(config.cooldownDuration);

      // Guess decayMode based on decayDuration. Typical time-based is e.g. 24 hours (86400s) or blocks (e.g. 48 blocks)
      const decayMode = decayDuration < 10000 ? "block" : "time";
      const decayDurationHours = decayMode === "block"
        ? (decayDuration / 2).toString()
        : (decayDuration / 3600).toString();

      const startFeePercent = (startFee / 10000).toString();
      const endFeePercent = (endFee / 10000).toString();
      const maxSwapAmountTokens = ethers.formatEther(maxSwapAmount);
      const cooldownSeconds = cooldownDuration.toString();

      // Get pool reserves
      let poolState;
      let seedProjectAmount = "0";
      let seedWethAmount = "0";

      if (targetChainId === 196) {
        // Query StateView for reserves on mainnet
        try {
          const stateViewContract = new ethers.Contract(
            "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
            [
              "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
              "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
            ],
            publicProvider
          );
          const slot0 = await stateViewContract.getSlot0(newPoolId);
          const liquidity = await stateViewContract.getLiquidity(newPoolId);

          const Q96 = 2n ** 96n;
          const sqrtPriceX96 = BigInt(slot0[0]);
          const L = BigInt(liquidity);

          if (sqrtPriceX96 > 0n && L > 0n) {
            const x = (L * Q96) / sqrtPriceX96;
            const y = (L * sqrtPriceX96) / Q96;

            const decimalsHatch = (symbol === "USDT" || symbol === "USDT0") ? 6 : 18;
            const r0 = Number(ethers.formatUnits(x, isHatchCurrency0 ? decimalsHatch : 18));
            const r1 = Number(ethers.formatUnits(y, isHatchCurrency0 ? 18 : decimalsHatch));

            seedProjectAmount = (isHatchCurrency0 ? r0 : r1).toString();
            seedWethAmount = (isHatchCurrency0 ? r1 : r0).toString();
          }
        } catch (e) {
          console.error("Failed to fetch mainnet pool state in importPool", e);
        }
      } else {
        const poolManagerContract = new ethers.Contract(CONTRACTS.poolManager, POOL_MANAGER_ABI, publicProvider);
        poolState = await poolManagerContract.pools(newPoolId);
        seedProjectAmount = poolState ? ethers.formatEther(isHatchCurrency0 ? poolState[0] : poolState[1]) : "0";
        seedWethAmount = poolState ? ethers.formatEther(isHatchCurrency0 ? poolState[1] : poolState[0]) : "0";
      }

      const priceRatio = parseFloat(seedWethAmount) > 0
        ? (parseFloat(seedProjectAmount) / parseFloat(seedWethAmount)).toString()
        : "10";

      const importedPool = {
        poolKey,
        poolId: newPoolId,
        symbol,
        isHatchCurrency0,
        projectTokenAddress,
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
        startBlock: 0,
        chainId: targetChainId
      };

      // Add to custom pools list if it's not already there
      setCustomPools((prev) => {
        const filtered = prev.filter(p => p.poolId !== newPoolId);
        const updated = [importedPool, ...filtered];
        try {
          localStorage.setItem("hatch_custom_pools", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save pool to local storage", e);
        }
        return updated;
      });

      // Post to backend
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
        await fetch(`${backendUrl}/pools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importedPool)
        });
      } catch (e) {
        console.error("Failed to sync pool to backend", e);
      }

      // Switch active pool context in UI
      setActivePoolKey(poolKey);
      setPoolIdHex(newPoolId);
      setIsCustomPoolActive(true);
      setCustomTokenDetails({
        symbol,
        isHatchCurrency0,
        projectTokenAddress
      });
      setActiveDecayMode(decayMode);
      setActiveStartBlock(0);

      addLog("IMPORT SUCCESSFUL", `Pool for ${symbol} successfully imported and loaded!`, "success");
      return { success: true, symbol };
    } catch (err) {
      console.error(err);
      addLog("Import Error", err.message || "Failed to import pool", "error");
      return { success: false, reason: err.message };
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

  // ── Add Liquidity to existing pool (mainnet via PositionManager) ──────────
  const addLiquidity = async (projectAmountStr, wethAmountStr, onStatus) => {
    const report = (step, status, msg, extra) => {
      if (onStatus) onStatus({ step, status, message: msg, ...extra });
      if (status === "error") addLog("Liquidity Error", msg, "error");
      else addLog("Liquidity", msg, "info");
    };

    if (!wallet.connected) {
      report("init", "error", "Connect your wallet first.");
      return { success: false, reason: "Wallet not connected" };
    }
    if (wallet.chainId !== targetChainId) {
      report("init", "error", "Switch to the correct network first.");
      return { success: false, reason: "Wrong network" };
    }
    if (targetChainId !== 196) {
      report("init", "error", "Add Liquidity via PositionManager is only supported on Mainnet.");
      return { success: false, reason: "Mainnet only" };
    }

    const signer = wallet.signer;
    const poolKey = activePoolKey;
    const isHatchCurrency0 = customTokenDetails.isHatchCurrency0;
    const projectToken = customTokenDetails.projectTokenAddress;
    const baseToken = CONTRACTS.weth;
    const positionManagerAddress = CONTRACTS.positionManager || "0xcf1eafc6928dc385a342e7c6491d371d2871458b";

    try {
      const seedProjectWei = ethers.parseEther(projectAmountStr);
      const seedWethWei = ethers.parseEther(wethAmountStr);

      const projectERC20 = new ethers.Contract(projectToken, ERC20_ABI, signer);
      const wethERC20 = new ethers.Contract(baseToken, ERC20_ABI, signer);

      // V4 PositionManager uses Permit2 for token transfers
      const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
      const permit2Contract = new ethers.Contract(
        PERMIT2_ADDRESS,
        [
          "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
          "function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)"
        ],
        signer
      );

      // Permit2 needs uint160 max for amount, uint48 max for expiration
      const MAX_UINT160 = (2n ** 160n) - 1n;
      const MAX_UINT48 = (2n ** 48n) - 1n;

      // Step 1: Approve project token → Permit2, then Permit2 → PositionManager
      report("approve_token", "pending", `Approving ${customTokenDetails.symbol} to Permit2...`);
      const appTx0 = await projectERC20.approve(PERMIT2_ADDRESS, ethers.MaxUint256, { gasLimit: 150000 });
      report("approve_token", "pending", `ERC-20 approval tx: ${appTx0.hash.slice(0,10)}... Confirming...`, { txHash: appTx0.hash });
      await appTx0.wait();
      // Now approve PositionManager on Permit2
      const p2AppTx0 = await permit2Contract.approve(projectToken, positionManagerAddress, MAX_UINT160, MAX_UINT48, { gasLimit: 100000 });
      report("approve_token", "pending", `Permit2 approval tx: ${p2AppTx0.hash.slice(0,10)}... Confirming...`, { txHash: p2AppTx0.hash });
      await p2AppTx0.wait();
      report("approve_token", "done", `${customTokenDetails.symbol} approved via Permit2 ✓`);

      // Step 2: Approve WETH → Permit2, then Permit2 → PositionManager
      report("approve_weth", "pending", `Approving WETH to Permit2...`);
      const appTx1 = await wethERC20.approve(PERMIT2_ADDRESS, ethers.MaxUint256, { gasLimit: 150000 });
      report("approve_weth", "pending", `ERC-20 approval tx: ${appTx1.hash.slice(0,10)}... Confirming...`, { txHash: appTx1.hash });
      await appTx1.wait();
      const p2AppTx1 = await permit2Contract.approve(baseToken, positionManagerAddress, MAX_UINT160, MAX_UINT48, { gasLimit: 100000 });
      report("approve_weth", "pending", `Permit2 approval tx: ${p2AppTx1.hash.slice(0,10)}... Confirming...`, { txHash: p2AppTx1.hash });
      await p2AppTx1.wait();
      report("approve_weth", "done", `WETH approved via Permit2 ✓`);

      // Step 3: Read sqrtPriceX96 from the pool
      report("read_price", "pending", "Reading pool price from onchain...");
      const publicProvider = publicProviderRef.current || new ethers.JsonRpcProvider("https://rpc.xlayer.tech", undefined, { batchMaxCount: 1 });
      const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";
      const stateView = new ethers.Contract(
        stateViewAddress,
        ["function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"],
        publicProvider
      );
      const slot0 = await stateView.getSlot0(poolIdHex);
      const sqrtPriceX96 = typeof slot0[0] === 'bigint' ? slot0[0] : BigInt(slot0[0]?.toString() || "0");

      if (!sqrtPriceX96 || sqrtPriceX96 === 0n) {
        report("read_price", "error", "Pool has no price set (sqrtPriceX96 = 0). Is the pool initialized?");
        return { success: false, reason: "Pool not initialized" };
      }
      report("read_price", "done", `Pool price read ✓`);

      // Step 4: Build & submit liquidity position
      report("add_liquidity", "pending", "Building liquidity transaction...");
      const tickLower = -887220;
      const tickUpper = 887220;
      const amount0Desired = isHatchCurrency0 ? seedProjectWei : seedWethWei;
      const amount1Desired = isHatchCurrency0 ? seedWethWei : seedProjectWei;

      const Q96 = 2n ** 96n;
      const L0 = (amount0Desired * sqrtPriceX96) / Q96;
      const L1 = (amount1Desired * Q96) / sqrtPriceX96;
      const liquidityAmount = ((L0 < L1 ? L0 : L1) * 95n) / 100n;

      const amount0Max = (amount0Desired * 105n) / 100n;
      const amount1Max = (amount1Desired * 105n) / 100n;

      const recipient = await signer.getAddress();
      const deadline = Math.floor(Date.now() / 1000) + 1800;

      const MINT_POSITION = 0x02;
      const SETTLE_PAIR = 0x0d;

      const actions = ethers.solidityPacked(["uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR]);
      const mintParams = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
        [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], tickLower, tickUpper, liquidityAmount, amount0Max, amount1Max, recipient, "0x"]
      );
      const settleParams = ethers.AbiCoder.defaultAbiCoder().encode(["address", "address"], [poolKey.currency0, poolKey.currency1]);
      const unlockData = ethers.AbiCoder.defaultAbiCoder().encode(["bytes", "bytes[]"], [actions, [mintParams, settleParams]]);

      const pm = new ethers.Contract(positionManagerAddress, ["function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable"], signer);

      report("add_liquidity", "pending", "Waiting for wallet confirmation...");
      const liqTx = await pm.modifyLiquidities(unlockData, deadline, { gasLimit: 5000000 });
      setPendingTxHash(liqTx.hash);
      report("add_liquidity", "pending", `Tx submitted: ${liqTx.hash.slice(0,10)}... Confirming onchain...`, { txHash: liqTx.hash });
      await liqTx.wait();
      setPendingTxHash(null);
      report("add_liquidity", "success", `Liquidity added successfully!`, { txHash: liqTx.hash });
      return { success: true, txHash: liqTx.hash };
    } catch (err) {
      console.error("Add liquidity error:", err);
      const reason = err.reason || err.shortMessage || err.message;
      report("error", "error", `Failed: ${reason}`, { errorReason: reason });
      setPendingTxHash(null);
      return { success: false, reason };
    }
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
        claimRoyaltiesMainnet,
        claimRoyaltiesAutonomously,
        initializePool,
        importPool,
        addLiquidity,
        deployToken,
        mintWeth,
        resetToDefaultPool,
        selectPool,
        customPools,
        isCustomPoolActive,
        projectTokenDetails: customTokenDetails,
        poolIdHex,

        logs,
        addLog,

        blockNumber,
        activeDecayMode,
        activeStartBlock,

        deployments,
        contracts: CONTRACTS,
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
