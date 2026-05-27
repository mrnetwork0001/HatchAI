import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import deployments from "./deployments.json";

// ── Custom SVG Theme Icons ──────────────────────────────────────────────────
const RocketIcon = ({ size = 16, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    {/* Egg rocket body */}
    <path d="M12 3c-4 0-6.5 5-6.5 11 0 2 2.5 3 6.5 3s6.5-1 6.5-3c0-6-2.5-11-6.5-11Z" />
    {/* Fins */}
    <path d="M5.5 14L2 19h4.5" />
    <path d="M18.5 14l3.5 5h-4.5" />
    {/* Exhaust flame */}
    <path d="M9.5 17c0 2 2.5 3.5 2.5 3.5s2.5-1.5 2.5-3.5" />
    {/* Round window */}
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const InfoIcon = ({ size = 14, color = "var(--ink)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SearchIcon = ({ size = 14, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const StatusDot = ({ color = "var(--success)", size = 8, animate = true }) => (
  <span 
    style={{
      display: "inline-block",
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      backgroundColor: color,
      boxShadow: `0 0 8px ${color}`,
      marginRight: "8px",
      animation: animate ? "pulse 1.5s ease infinite" : "none",
      verticalAlign: "middle"
    }}
  />
);

const ClockIcon = ({ size = 14, color = "var(--muted)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const LockIcon = ({ size = 14, color = "var(--muted)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <path d="M12 11C8.5 11 6 13.5 6 17c0 2.8 2.5 4.5 6 4.5s6-1.7 6-4.5c0-3.5-2.5-6-6-6Z" />
    <circle cx="12" cy="15" r="1" fill={color} />
    <path d="M12 16v2.5" strokeWidth="1.8" />
  </svg>
);

const ShieldIcon = ({ size = 28, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M12 7c-2 0-3.5 2-3.5 4.5c0 2.2 1.5 3.5 3.5 3.5s3.5-1.3 3.5-3.5C15.5 9 14 7 12 7Z" strokeWidth="1.6" />
  </svg>
);

const TimerIcon = ({ size = 28, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <line x1="10" y1="2" x2="14" y2="2" />
    <line x1="12" y1="14" x2="15" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </svg>
);

const ChartIcon = ({ size = 28, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const LoopIcon = ({ size = 28, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const LinkIcon = ({ size = 32, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const HourglassIcon = ({ size = 14, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M5 2h14M5 22h14M19 2v4c0 1.38-1.13 2.5-2.5 4.1L12 14l-4.5-3.9C6.13 8.5 5 7.38 5 6V2M12 14v8" />
  </svg>
);

const EggIcon = ({ size = 20, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M12 2C7.5 2 4 7 4 12c0 4.5 3.5 10 8 10s8-5.5 8-10C20 7 16.5 2 12 2Z" />
  </svg>
);

const AlertIcon = ({ size = 16, color = "var(--error)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    {/* Small cracked egg inside the warning sign */}
    <path d="M12 9.5c-1.2 0-2 1.5-2 3.5s.8 2.5 2 2.5s2-1 2-2.5s-.8-3.5-2-3.5Z" strokeWidth="1.6" />
    <path d="M12 10.5l-0.8 1.5l1.6 1l-1.2 1.5" strokeWidth="1.2" />
  </svg>
);

const GearIcon = ({ size = 16, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ChickHatchingIcon = ({ size = 48, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: "inline-block", ...style }}>
    <circle cx="32" cy="38" r="14" fill="#FFF4D0" stroke="var(--ink)" strokeWidth="2.5" />
    <circle cx="28" cy="35" r="2" fill="var(--ink)" />
    <circle cx="36" cy="35" r="2" fill="var(--ink)" />
    <polygon points="32,38 30,41 34,41" fill="var(--coral)" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M22,28 C23,23 27,21 32,21 C37,21 41,23 42,28 L38,30 L32,26 L26,30 Z" fill="#FFFDFC" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M17,38 C15,38 14,40 15,42 C16,43 18,41 18,38" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M47,38 C49,38 50,40 49,42 C48,43 46,41 46,38" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const BotIcon = ({ size = 16, color = "var(--error)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    {/* Egg body */}
    <path d="M12 5C7.5 5 4 9.5 4 14.5c0 4.5 3.5 7.5 8 7.5s8-3 8-7.5C20 9.5 16.5 5 12 5Z" />
    {/* Robot antenna */}
    <path d="M12 5V2" />
    <circle cx="12" cy="2" r="0.5" fill={color} />
    {/* Robot eyes */}
    <line x1="8" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="16" y2="12" />
    {/* Robot mouth */}
    <path d="M9 16h6" />
    <path d="M9 14.5v3M12 14.5v3M15 14.5v3" strokeWidth="1.2" />
  </svg>
);

const UserIcon = ({ size = 16, color = "var(--coral)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    {/* Chick head */}
    <path d="M6 12C6 8.5 8.5 6 12 6s6 2.5 6 6" />
    {/* Beak */}
    <polygon points="12,10 10,12 14,12" fill={color} stroke={color} strokeWidth="1" />
    {/* Eyes */}
    <circle cx="9.5" cy="9.5" r="0.8" fill={color} />
    <circle cx="14.5" cy="9.5" r="0.8" fill={color} />
    {/* Bottom egg shell */}
    <path d="M4 12c0 4.5 3.5 7.5 8 7.5s8-3 8-7.5" />
    {/* Crack lines */}
    <path d="M4 12l3.5 1.5l4-1.5l4.5 1.5l4-1.5" />
  </svg>
);

const SkullIcon = ({ size = 16, color = "var(--error)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    {/* Left broken piece */}
    <path d="M10.5 4.5C7 5.5 5 9 5 13.5c0 4 3 7 7 7.5l-2-3.5l2.5-2l-2.5-2.5l2-3" />
    {/* Right broken piece */}
    <path d="M13.5 4.5C17 5.5 19 9 19 13.5c0 4-3 7-7 7.5l2-3.5l-2.5-2l2.5-2.5l-2-3" />
  </svg>
);

const CheckIcon = ({ size = 16, color = "var(--success)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", display: "inline-block", ...style }}>
    {/* Happy Chick in shell */}
    <path d="M7 13c0-3.5 2.2-6 5-6s5 2.5 5 6" />
    <path d="M4 13c0 4 3.5 6.5 8 6.5s8-2.5 8-6.5" />
    <path d="M4 13l3.5 1l4.5-1.5l4 1.5l4-1" />
    <polygon points="12,10 11,11.5 13,11.5" fill={color} stroke={color} strokeWidth="0.8" />
    {/* Large check mark overlaid on the right */}
    <path d="M15 11l2 2.2L21.5 8.5" stroke="var(--success)" strokeWidth="2.8" />
  </svg>
);

const renderSimIcon = (type) => {
  switch (type) {
    case "bot":
      return <BotIcon size={14} color="var(--error)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "user":
      return <UserIcon size={14} color="var(--coral)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "alert":
      return <AlertIcon size={14} color="var(--error)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "ruin":
      return <SkullIcon size={14} color="var(--error)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "shield":
      return <ShieldIcon size={14} color="var(--success)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "lock":
      return <LockIcon size={14} color="var(--success)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    case "success":
      return <CheckIcon size={14} color="var(--success)" style={{ marginRight: "6px", flexShrink: 0, marginTop: "2px" }} />;
    default:
      return null;
  }
};

const Tooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span 
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span style={{
        display: "inline-flex",
        background: "rgba(50,52,58,0.08)",
        borderRadius: "50%",
        width: "14px",
        height: "14px",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "9px",
        fontWeight: "800",
        color: "var(--ink-soft)",
        border: "1px solid var(--line)",
        marginLeft: "4px",
        transition: "all 0.2s ease"
      }}>
        !
      </span>
      {visible && (
        <span style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(28, 29, 33, 0.96)",
          color: "var(--sand)",
          padding: "8px 12px",
          borderRadius: "8px",
          fontSize: "0.74rem",
          fontWeight: "500",
          lineHeight: "1.35",
          width: "250px",
          textAlign: "center",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(6px)",
          zIndex: 1000,
          pointerEvents: "none"
        }}>
          {text}
          <span style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            borderWidth: "5px",
            borderStyle: "solid",
            borderColor: "rgba(28, 29, 33, 0.96) transparent transparent transparent"
          }} />
        </span>
      )}
    </span>
  );
};

export default function App() {
  const {
    address,
    isConnected,
    isOnCorrectChain,
    switchChain,
    okbBalance,
    wethBalance,
    hatchBalance,
    poolReserves,
    accumulatedFees,
    totalCreatorFeesClaimed,
    totalTokensBurned,
    decayDuration,
    startFee,
    endFee,
    maxSwapAmount,
    cooldownDuration,
    logs,
    isProtectionActive,
    currentFeeRate,
    timeElapsed,
    executeSwap,
    claimRoyalties,
    claimRoyaltiesMainnet,
    claimRoyaltiesAutonomously,
    pendingTxHash,
    isTxPending,
    contracts,
    isDeployed,
    explorerUrl,
    connect,
    disconnect,
    initializePool,
    importPool,
    addLiquidity,
    deployToken,
    mintWeth,
    resetToDefaultPool,
    selectPool,
    isCustomPoolActive,
    projectTokenDetails,
    customPools,
    poolIdHex,
    addLog,
    blockNumber,
    activeDecayMode,
    activeStartBlock,
    targetChainId,
    setTargetChainId,
  } = useWallet();

  const [view, setView] = useState("landing"); // 'landing' | 'console'
  const [consoleTab, setConsoleTab] = useState("portal"); // 'portal' | 'swap' | 'launchpad'
  const [swapAmount, setSwapAmount] = useState("0.1");
  const [lpNftTokenId, setLpNftTokenId] = useState("");
  const [statusMsg, setStatusMsg] = useState(null); // { text, type }
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [agentThreshold, setAgentThreshold] = useState("0.02");
  const [agentLog, setAgentLog] = useState("Standing by...");
  const terminalRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add Liquidity state
  const [liqProjectAmount, setLiqProjectAmount] = useState("");
  const [liqWethAmount, setLiqWethAmount] = useState("");
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [liqSteps, setLiqSteps] = useState(null); // { step, status, message, txHash, errorReason }

  // Reset seed liquidity state when switching pools
  useEffect(() => {
    setLiqSteps(null);
    setLiqProjectAmount("");
    setLiqWethAmount("");
    setIsAddingLiquidity(false);
  }, [poolIdHex]);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Protocol-wide stats from mainnet (real on-chain data)
  const [protocolStats, setProtocolStats] = useState({
    poolsActive: 0,
    totalRoyaltiesWeth: 0,
    totalBurned: 0,
    totalLiquidityWeth: 0
  });

  useEffect(() => {
    const fetchProtocolStats = async () => {
      try {
        const mainnetConfig = deployments["196"];
        if (!mainnetConfig) return;

        const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech", undefined, { batchMaxCount: 1 });
        const hookAddress = mainnetConfig.contracts.hatchHook;
        const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";

        // Get all pools from localStorage
        let allPools = [];
        try {
          const saved = localStorage.getItem("hatch_custom_pools");
          if (saved) allPools = JSON.parse(saved).filter(p => p.chainId === 196);
        } catch {}

        const poolCount = allPools.length;

        // For each pool, read totalCreatorFeesClaimed and totalTokensBurned
        const hookContract = new ethers.Contract(hookAddress, [
          "function totalCreatorFeesClaimed(bytes32) external view returns (uint256)",
          "function totalTokensBurned(bytes32) external view returns (uint256)"
        ], provider);

        const stateView = new ethers.Contract(stateViewAddress, [
          "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
          "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
        ], provider);

        let totalRoyalties = 0n;
        let totalBurned = 0n;
        let totalWethReserve = 0;

        const Q96 = 2n ** 96n;
        const wethAddr = (mainnetConfig.contracts.weth || "").toLowerCase();

        const promises = allPools.map(async (pool) => {
          const poolId = pool.poolId;
          if (!poolId) return;
          try {
            const [claimed, burned, slot0, liq] = await Promise.all([
              hookContract.totalCreatorFeesClaimed(poolId).catch(() => 0n),
              hookContract.totalTokensBurned(poolId).catch(() => 0n),
              stateView.getSlot0(poolId).catch(() => null),
              stateView.getLiquidity(poolId).catch(() => 0n)
            ]);
            totalRoyalties += BigInt(claimed);
            totalBurned += BigInt(burned);

            // Calculate actual WETH reserves from sqrtPriceX96 + L
            if (slot0 && liq) {
              const sqrtPriceX96 = typeof slot0[0] === 'bigint' ? slot0[0] : BigInt(slot0[0]?.toString() || "0");
              const L = typeof liq === 'bigint' ? liq : BigInt(liq?.toString() || "0");
              if (sqrtPriceX96 > 0n && L > 0n) {
                const x = (L * Q96) / sqrtPriceX96; // currency0 amount
                const y = (L * sqrtPriceX96) / Q96; // currency1 amount
                // Determine which side is WETH by comparing addresses
                const c0 = (pool.poolKey?.currency0 || "").toLowerCase();
                const isWethCurrency0 = c0 === wethAddr;
                const wethAmount = isWethCurrency0 ? x : y;
                totalWethReserve += parseFloat(ethers.formatEther(wethAmount));
              }
            }
          } catch {}
        });

        await Promise.all(promises);

        setProtocolStats({
          poolsActive: poolCount,
          totalRoyaltiesWeth: parseFloat(ethers.formatEther(totalRoyalties)),
          totalBurned: parseFloat(ethers.formatEther(totalBurned)),
          totalLiquidityWeth: totalWethReserve
        });
      } catch (err) {
        console.error("Protocol stats fetch error:", err);
      }
    };

    fetchProtocolStats();
    const interval = setInterval(fetchProtocolStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cyclic hero flow state
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Autonomous Yield Harvester Agent Effect
  useEffect(() => {
    if (!isAgentActive || !isConnected) return;
    addLog("Agent AI", `Autonomous Yield Agent activated. Target Pool: ${projectTokenDetails.symbol}/WETH. Threshold: ${agentThreshold} WETH`, "info");
  }, [isAgentActive, isConnected, addLog, projectTokenDetails.symbol, agentThreshold]);

  useEffect(() => {
    if (!isAgentActive || !isConnected || accumulatedFees <= 0) return;
    
    const threshold = parseFloat(agentThreshold) || 0.02;
    if (accumulatedFees >= threshold && !isTxPending) {
      setAgentLog("Agent: Profit threshold reached! Executing harvest...");
      
      const triggerAutonomousClaim = async () => {
        addLog("Agent AI", `Accumulated hook fees (${accumulatedFees.toFixed(4)} WETH) crossed threshold (${threshold} WETH). Profitability: POSITIVE. Initiating autonomous yield harvest & buyback-burn...`, "info");
        try {
          const res = await claimRoyaltiesAutonomously();
          if (res.success) {
            setAgentLog(`Agent: Harvest success! Tx: ${res.txHash?.slice(0, 10)}…`);
            addLog("Agent AI", `Autonomous execution success! Tx: ${res.txHash}`, "success");
          } else {
            setAgentLog(`Agent: Harvest failed or rejected.`);
            addLog("Agent AI", `Autonomous execution failed: ${res.reason || "Execution failed"}`, "error");
          }
        } catch (err) {
          setAgentLog(`Agent: Execution error.`);
          addLog("Agent AI", `Autonomous execution error: ${err.message}`, "error");
        }
      };
      
      triggerAutonomousClaim();
    } else {
      setAgentLog(`Monitoring... (${accumulatedFees.toFixed(4)} / ${threshold} WETH)`);
    }
  }, [isAgentActive, accumulatedFees, agentThreshold, isConnected, isTxPending, addLog, claimRoyaltiesAutonomously]);

  // Typewriter effect state
  const words = ["safe", "secure", "proven"];
  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(150);

  useEffect(() => {
    let timer;
    const handleType = () => {
      const fullWord = words[wordIndex];
      if (!isDeleting) {
        setCurrentText(fullWord.substring(0, currentText.length + 1));
        setTypingSpeed(120);

        if (currentText === fullWord) {
          timer = setTimeout(() => {
            setIsDeleting(true);
            setTypingSpeed(60);
          }, 2000);
          return;
        }
      } else {
        setCurrentText(fullWord.substring(0, currentText.length - 1));
        setTypingSpeed(60);

        if (currentText === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
          setTypingSpeed(150);
        }
      }
    };

    timer = setTimeout(handleType, typingSpeed);
    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex, typingSpeed]);

  // Developer Launchpad Form State
  const [launchTokenAddress, setLaunchTokenAddress] = useState("");
  const [importAddress, setImportAddress] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [launchBaseAddress, setLaunchBaseAddress] = useState(contracts?.weth || "");

  useEffect(() => {
    if (contracts && contracts.weth) {
      setLaunchBaseAddress(contracts.weth);
    } else {
      setLaunchBaseAddress("");
    }
  }, [contracts]);
  const [launchPriceRatio, setLaunchPriceRatio] = useState("10");
  const [launchDecayHours, setLaunchDecayHours] = useState("24");
  const [launchStartFee, setLaunchStartFee] = useState("10");
  const [launchEndFee, setLaunchEndFee] = useState("0.3");
  const [launchMaxSwap, setLaunchMaxSwap] = useState("1000");
  const [launchCooldown, setLaunchCooldown] = useState("60");
  const [launchStatus, setLaunchStatus] = useState(null); // { text, type }
  const [launchDecayMode, setLaunchDecayMode] = useState("time"); // 'time' | 'block'

  // Deploy Token Form State
  const [tokenDeployName, setTokenDeployName] = useState("Mock Project Token");
  const [tokenDeploySymbol, setTokenDeploySymbol] = useState("MPT");
  const [tokenDeploySupply, setTokenDeploySupply] = useState("10000000"); // 10 Million
  const [tokenDeployStatus, setTokenDeployStatus] = useState(null); // { text, type }

  // Seeding state for pool launch
  const [launchSeedProject, setLaunchSeedProject] = useState("5000000"); // 5 Million
  const [launchSeedWeth, setLaunchSeedWeth] = useState("0.5"); // 0.5 WETH

  // Bot Simulation State
  const [simState, setSimState] = useState("idle"); // 'idle' | 'running' | 'completed'
  const [simStep, setSimStep] = useState(0);
  const [unprotectedLogs, setUnprotectedLogs] = useState([]);
  const [protectedLogs, setProtectedLogs] = useState([]);
  const simIntervalRef = useRef(null);

  // Clear simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
    };
  }, []);

  const runSniperSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    setSimState("running");
    setSimStep(0);
    setUnprotectedLogs([]);
    setProtectedLogs([]);

    const steps = [
      {
        unprotected: {
          icon: "bot",
          text: "MEV Sniper Bot spots launch in mempool. Snipe execution in Block 1. Buys 50,000 NAI. Fee: 0.3% ($1.50). Price: $0.10 → $0.45 (+350%)"
        },
        protected: {
          icon: "shield",
          text: "Bot Sniper spots launch. Tries to buy 50,000 NAI in Block 1. TRANSACTION REVERTED: Exceeds Anti-Whale Limit (Cap: 5,000 NAI)."
        }
      },
      {
        unprotected: {
          icon: "bot",
          text: "Sniper Bot B snipes in Block 2. Buys 30,000 NAI. Fee: 0.3% ($0.90). Price: $0.45 → $0.85 (+750%)"
        },
        protected: {
          icon: "shield",
          text: "Bot B tries to buy 4,500 NAI (under cap) in Block 2. TRANSACTION REVERTED: Wallet swap cooldown active (wait 60s)."
        }
      },
      {
        unprotected: {
          icon: "user",
          text: "Real user buys 500 NAI at peak price ($0.85). Suffers heavy price impact and slippage."
        },
        protected: {
          icon: "user",
          text: "Real user buys 500 NAI at low initial price ($0.10). Swap fee (10%) applied. 50% split triggers automatic Buyback & Burn!"
        }
      },
      {
        unprotected: {
          icon: "alert",
          text: "Bot A dumps 50,000 NAI at $0.80, draining pool WETH reserves. Profit: +$35,000. Price crashes: $0.80 → $0.15"
        },
        protected: {
          icon: "lock",
          text: "No bot liquidity. Price remains stable. Safe-launch fee decay continues."
        }
      },
      {
        unprotected: {
          icon: "ruin",
          text: "Bot B dumps 30,000 NAI at $0.15. WETH reserves depleted. Launch RUINED."
        },
        protected: {
          icon: "success",
          text: "Launch successful. 100% liquidity preserved. 500 NAI burned. Community is safe."
        }
      }
    ];

    let current = 0;
    simIntervalRef.current = setInterval(() => {
      if (current < steps.length) {
        const nextUnprotected = steps[current].unprotected;
        const nextProtected = steps[current].protected;
        setUnprotectedLogs((prev) => [...prev, nextUnprotected]);
        setProtectedLogs((prev) => [...prev, nextProtected]);
        setSimStep(current + 1);
        current++;
      } else {
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        setSimState("completed");
      }
    }, 1800);
  };

  const [isFaucetPending, setIsFaucetPending] = useState(false);
  const [txModal, setTxModal] = useState({
    isOpen: false,
    title: "",
    status: "", // 'pending' | 'success' | 'error'
    txHash: "",
    message: "",
    errorReason: ""
  });

  useEffect(() => {
    if (tokenDeployStatus) {
      const timer = setTimeout(() => setTokenDeployStatus(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [tokenDeployStatus]);

  const handleMintWeth = async () => {
    setIsFaucetPending(true);
    setTxModal({
      isOpen: true,
      title: "Claim Mock WETH",
      status: "pending",
      txHash: "",
      message: "Submitting transaction to mint 10 Mock WETH to your wallet... Please confirm in your wallet.",
      errorReason: ""
    });
    const res = await mintWeth("10");
    if (res.success) {
      setTxModal({
        isOpen: true,
        title: "Claim Mock WETH",
        status: "success",
        txHash: res.txHash || "",
        message: "Successfully claimed 10 Mock WETH! They are now available in your wallet.",
        errorReason: ""
      });
    } else {
      setTxModal({
        isOpen: true,
        title: "Claim Mock WETH",
        status: "error",
        txHash: "",
        message: "Failed to claim Mock WETH.",
        errorReason: res.reason
      });
    }
    setIsFaucetPending(false);
  };

  // Auto-scroll terminal (with overflow protection and user scroll lock)
  useEffect(() => {
    const el = terminalRef.current;
    if (el) {
      // If the user has scrolled up to inspect history, don't drag them to the bottom
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      if (isNearBottom || logs.length <= 1) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [logs]);

  // Clear status messages
  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    if (launchStatus) {
      const timer = setTimeout(() => setLaunchStatus(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [launchStatus]);

  const getEstimatedOutput = () => {
    const amountIn = parseFloat(swapAmount);
    if (isNaN(amountIn) || amountIn <= 0) return "0.00";
    const reserveIn = poolReserves.weth;
    const reserveOut = poolReserves.hatch;
    if (reserveIn <= 0 || reserveOut <= 0) return "0.00";

    const netInput = amountIn * (1 - currentFeeRate);
    const amountOut = (reserveOut * netInput) / (reserveIn + netInput);
    return amountOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSwap = async (e) => {
    e.preventDefault();
    setStatusMsg({ text: "Submitting swap transaction…", type: "pending" });
    setTxModal({
      isOpen: true,
      title: "Swap Tokens",
      status: "pending",
      txHash: "",
      message: `Executing token swap on the protected pool... Please confirm the transaction in your wallet.`,
      errorReason: ""
    });
    const res = await executeSwap(swapAmount);
    if (res.success) {
      setStatusMsg({
        text: `Swap submitted! Tx: ${res.txHash?.slice(0, 10)}…`,
        type: "success",
      });
      setTxModal({
        isOpen: true,
        title: "Swap Tokens",
        status: "success",
        txHash: res.txHash || "",
        message: "Swap executed successfully! Balances have been updated.",
        errorReason: ""
      });
    } else {
      setStatusMsg({ text: res.reason || "Swap failed.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Swap Tokens",
        status: "error",
        txHash: "",
        message: "Failed to execute swap.",
        errorReason: res.reason
      });
    }
  };

  const handleClaim = async () => {
    setStatusMsg({ text: "Submitting claimFees transaction…", type: "pending" });
    setTxModal({
      isOpen: true,
      title: "Harvest Royalties & Fees",
      status: "pending",
      txHash: "",
      message: `Submitting claimFees to retrieve creator royalties and LP fees... Please confirm in your wallet.`,
      errorReason: ""
    });
    const res = await claimRoyalties();
    if (res.success) {
      setStatusMsg({
        text: `Claim submitted! Tx: ${res.txHash?.slice(0, 10)}…`,
        type: "success",
      });
      setTxModal({
        isOpen: true,
        title: "Harvest Royalties & Fees",
        status: "success",
        txHash: res.txHash || "",
        message: "Royalties and creator fees successfully harvested to your wallet!",
        errorReason: ""
      });
    } else {
      setStatusMsg({ text: res.reason || "Claim failed.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Harvest Royalties & Fees",
        status: "error",
        txHash: "",
        message: "Failed to harvest royalties.",
        errorReason: res.reason
      });
    }
  };

  const handleClaimMainnet = async () => {
    setStatusMsg({ text: "Submitting claimFeesMainnet transaction…", type: "pending" });
    setTxModal({
      isOpen: true,
      title: "Harvest LP Fees & Swap-Burn",
      status: "pending",
      txHash: "",
      message: `Harvesting LP fees from Uniswap V4 Position Manager for NFT #${lpNftTokenId}... Please confirm the transaction in your wallet.`,
      errorReason: ""
    });
    const res = await claimRoyaltiesMainnet(lpNftTokenId);
    if (res.success) {
      setStatusMsg({
        text: `Claim submitted! Tx: ${res.txHash?.slice(0, 10)}…`,
        type: "success",
      });
      setTxModal({
        isOpen: true,
        title: "Harvest LP Fees & Swap-Burn",
        status: "success",
        txHash: res.txHash || "",
        message: "Fees successfully harvested, split 50/50, and project tokens bought back and burned!",
        errorReason: ""
      });
    } else {
      setStatusMsg({ text: res.reason || "Claim failed.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Harvest LP Fees & Swap-Burn",
        status: "error",
        txHash: "",
        message: "Failed to harvest royalties and execute swap-burn.",
        errorReason: res.reason
      });
    }
  };

  const handleDeployToken = async (e) => {
    e.preventDefault();
    if (!tokenDeployName || !tokenDeploySymbol || !tokenDeploySupply) {
      setTokenDeployStatus({ text: "Please fill in all token details.", type: "error" });
      return;
    }
    setTokenDeployStatus({ text: "Submitting deployToken transaction...", type: "pending" });
    setTxModal({
      isOpen: true,
      title: "Deploying Test ERC20 Token",
      status: "pending",
      txHash: "",
      message: `Deploying custom ERC20 contract for ${tokenDeployName} (${tokenDeploySymbol}) on ${targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}...`,
      errorReason: ""
    });
    
    try {
      const res = await deployToken(tokenDeployName, tokenDeploySymbol, tokenDeploySupply);
      if (res.success) {
        setTokenDeployStatus({
          text: `Token Deployed! Address: ${res.address}`,
          type: "success"
        });
        setLaunchTokenAddress(res.address);
        setTxModal({
          isOpen: true,
          title: "Deploying Test ERC20 Token",
          status: "success",
          txHash: res.txHash || "",
          message: `Successfully deployed your custom token contract at: ${res.address}. Initial supply minted to your wallet.`,
          errorReason: ""
        });
      } else {
        setTokenDeployStatus({ text: res.reason || "Deployment failed.", type: "error" });
        setTxModal({
          isOpen: true,
          title: "Deploying Test ERC20 Token",
          status: "error",
          txHash: "",
          message: "Failed to deploy custom token contract.",
          errorReason: res.reason
        });
      }
    } catch (err) {
      setTokenDeployStatus({ text: err.message || "Deployment failed.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Deploying Test ERC20 Token",
        status: "error",
        txHash: "",
        message: "Failed to deploy custom token contract.",
        errorReason: err.message
      });
    }
  };

  const handleLaunchPool = async (e) => {
    e.preventDefault();
    if (!launchTokenAddress.startsWith("0x") || launchTokenAddress.length !== 42) {
      setLaunchStatus({ text: "Please enter a valid Project Token Address.", type: "error" });
      return;
    }
    setLaunchStatus({ text: "Submitting initializePool transaction...", type: "pending" });
    setTxModal({
      isOpen: true,
      title: "Launching Protected Pool",
      status: "pending",
      txHash: "",
      message: "Configuring Uniswap v4 pool parameters, executing initialize call, granting token approvals, and seeding initial reserves... Please confirm transactions in your wallet.",
      errorReason: ""
    });
    
    const res = await initializePool({
      projectToken: launchTokenAddress,
      baseToken: launchBaseAddress,
      priceRatio: launchPriceRatio,
      decayDurationHours: launchDecayHours,
      startFeePercent: launchStartFee,
      endFeePercent: launchEndFee,
      maxSwapAmountTokens: launchMaxSwap,
      cooldownSeconds: launchCooldown,
      seedProjectAmount: launchSeedProject,
      seedWethAmount: launchSeedWeth,
      decayMode: launchDecayMode
    });

    if (res.success) {
      setLaunchStatus({
        text: `Pool Initialized! Custom pool ID: ${res.poolId.slice(0, 14)}...`,
        type: "success"
      });
      setTxModal({
        isOpen: true,
        title: "Launching Protected Pool",
        status: "success",
        txHash: res.txHash || "",
        message: `Pool successfully initialized and seeded with custom liquidity! Pool ID: ${res.poolId}`,
        errorReason: ""
      });
      setTimeout(() => {
        setConsoleTab("swap");
      }, 2500);
    } else {
      setLaunchStatus({ text: res.reason || "Launch failed.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Launching Protected Pool",
        status: "error",
        txHash: "",
        message: "Failed to launch protected pool.",
        errorReason: res.reason
      });
    }
  };
 
  const handleImport = async (e) => {
    e.preventDefault();
    if (!importAddress || !importAddress.startsWith("0x") || importAddress.length !== 42) {
      setLaunchStatus({ text: "Please enter a valid token contract address.", type: "error" });
      return;
    }
 
    setIsImporting(true);
    setTxModal({
      isOpen: true,
      title: "Importing Custom Pool",
      status: "pending",
      txHash: "",
      message: `Fetching pool key, parameters, and reserve data for token ${importAddress} from the X Layer contracts...`,
      errorReason: ""
    });
 
    try {
      const res = await importPool(importAddress);
      if (res.success) {
        setImportAddress("");
        setLaunchStatus({ text: `Pool for ${res.symbol} successfully imported!`, type: "success" });
        setTxModal({
          isOpen: true,
          title: "Importing Custom Pool",
          status: "success",
          txHash: "",
          message: `Successfully loaded pool for ${res.symbol} (${importAddress}) into your local terminal!`,
          errorReason: ""
        });
        setTimeout(() => {
          setConsoleTab("portal");
        }, 2000);
      } else {
        setLaunchStatus({ text: res.reason || "Failed to import pool.", type: "error" });
        setTxModal({
          isOpen: true,
          title: "Importing Custom Pool",
          status: "error",
          txHash: "",
          message: "Failed to import custom pool config.",
          errorReason: res.reason
        });
      }
    } catch (err) {
      setLaunchStatus({ text: err.message || "Failed to import pool.", type: "error" });
      setTxModal({
        isOpen: true,
        title: "Importing Custom Pool",
        status: "error",
        txHash: "",
        message: "Failed to import custom pool config.",
        errorReason: err.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Decay chart math
  const blocksElapsed = (blockNumber > activeStartBlock && activeStartBlock > 0) ? (blockNumber - activeStartBlock) : 0;
  const totalBlocks = Math.max(1, Math.floor(decayDuration / 2));

  const progressRatio = activeDecayMode === "block"
    ? Math.min(blocksElapsed / totalBlocks, 1)
    : Math.min(timeElapsed / (decayDuration * 1000), 1);

  const remainingHours = Math.max(decayDuration / 3600 - timeElapsed / (3600 * 1000), 0);
  const remainingBlocks = Math.max(totalBlocks - blocksElapsed, 0);

  const chartWidth = 500;
  const chartHeight = 150;
  const padding = 20;

  const maxChartFee = activeDecayMode === "block" ? 0.90 : Math.max(startFee / 1_000_000, 0.10);
  const mapY = (fee) => {
    const minVal = padding;
    const maxVal = chartHeight - padding;
    const denominator = maxChartFee > 0 ? maxChartFee : 1;
    return maxVal - ((fee / denominator) * (maxVal - minVal));
  };

  const startFeeDecimal = startFee / 1_000_000;
  const endFeeDecimal = endFee / 1_000_000;

  const startX = padding;
  const endX = chartWidth - padding;
  const startY = isNaN(mapY(startFeeDecimal)) ? padding : mapY(startFeeDecimal);
  const endY = isNaN(mapY(endFeeDecimal)) ? (chartHeight - padding) : mapY(endFeeDecimal);
  const currentX = isNaN(progressRatio) ? startX : startX + progressRatio * (endX - startX);
  const currentY = isNaN(mapY(currentFeeRate)) ? endY : mapY(currentFeeRate);

  const getBlockDecayPath = () => {
    const x0 = startX;
    const x1 = startX + 0.1 * (endX - startX);
    const x2 = startX + 0.5 * (endX - startX);
    const x3 = endX;
    
    const y1 = mapY(0.90);
    const y2 = mapY(0.50);
    const y3 = mapY(0.10);
    const y4 = mapY(endFeeDecimal);
    
    return `M ${x0} ${y1} L ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2} L ${x2} ${y3} L ${x3} ${y3} L ${x3} ${y4}`;
  };

  const getActiveBlockDecayPath = () => {
    const x0 = startX;
    const x1 = startX + 0.1 * (endX - startX);
    const x2 = startX + 0.5 * (endX - startX);
    
    const y1 = mapY(0.90);
    const y2 = mapY(0.50);
    const y3 = mapY(0.10);
    const y4 = mapY(endFeeDecimal);
    
    let path = `M ${x0} ${y1}`;
    
    if (currentX <= x1) {
      path += ` L ${currentX} ${y1}`;
    } else if (currentX <= x2) {
      path += ` L ${x1} ${y1} L ${x1} ${y2} L ${currentX} ${y2}`;
    } else if (currentX <= endX) {
      path += ` L ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2} L ${x2} ${y3} L ${currentX} ${y3}`;
    } else {
      path += ` L ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2} L ${x2} ${y3} L ${endX} ${y3} L ${endX} ${y4}`;
    }
    return path;
  };
  // Combine custom user pools from context
  const userPools = (customPools || [])
    .filter((p) => {
      const poolChainId = p.chainId || 1952;
      return poolChainId === targetChainId;
    })
    .map((p) => ({
    symbol: p.symbol,
    name: `${p.symbol} Token`,
    projectTokenAddress: p.projectTokenAddress,
    poolId: p.poolId,
    status: "live",
    reservesWeth: 1.0,
    reservesToken: parseFloat(p.priceRatio),
    taxRate: `${parseFloat(p.startFeePercent).toFixed(1)}% (decaying)`,
    maxCap: `${Number(p.maxSwapAmountTokens).toLocaleString()} ${p.symbol}`,
    cooldown: `${p.cooldownSeconds}s`,
    priceRatio: p.priceRatio,
    poolKey: p.poolKey,
    isHatchCurrency0: p.isHatchCurrency0
  }));

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 32px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div style={{ cursor: "pointer" }} onClick={() => { setView("landing"); setMobileMenuOpen(false); }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img 
              src="/logo.png" 
              alt="HatchAI logo" 
              style={{ 
                height: "56px", 
                width: "auto", 
                objectFit: "contain",
              }} 
            />
          </div>
        </div>

        {/* Desktop nav items */}
        <div className="header-nav-desktop">
          {view === "landing" ? (
            <button
              onClick={() => {
                setView("console");
                setConsoleTab("portal");
              }}
              className="btn-neon"
              style={{ padding: "10px 24px", fontSize: "14px" }}
            >
              Launch App →
            </button>
          ) : (
            <>
              <button
                onClick={() => setView("landing")}
                className="btn-outline"
                style={{ padding: "10px 24px", fontSize: "14px" }}
              >
                Landing Page
              </button>
              {/* Network badge */}
              <div className="network-badge">
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: isConnected && isOnCorrectChain ? "var(--success)" : "var(--error)",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                <select
                  value={targetChainId}
                  onChange={(e) => setTargetChainId(Number(e.target.value))}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontWeight: "700",
                    fontSize: "11px",
                    fontFamily: "Geist Mono, monospace",
                    cursor: "pointer",
                    outline: "none",
                    paddingRight: "4px"
                  }}
                >
                  <option value={196} style={{ background: "var(--sand)", color: "var(--ink)" }}>X Layer Mainnet</option>
                  <option value={1952} style={{ background: "var(--sand)", color: "var(--ink)" }}>X Layer Testnet</option>
                </select>
              </div>

              {/* Connect Button */}
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="btn-outline"
                  style={{
                    fontSize: "14px",
                    padding: "10px 20px",
                    borderColor: "rgba(194, 91, 91, 0.4)",
                    color: "var(--error)",
                  }}
                >
                  Disconnect ({address?.slice(0, 6)}...{address?.slice(-4)})
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="btn-neon"
                  style={{
                    fontSize: "14px",
                    padding: "10px 24px",
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </>
          )}
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger-line ${mobileMenuOpen ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? "open" : ""}`} />
          <span className={`hamburger-line ${mobileMenuOpen ? "open" : ""}`} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          {view === "landing" ? (
            <button
              onClick={() => { setView("console"); setConsoleTab("portal"); setMobileMenuOpen(false); }}
              className="btn-neon"
              style={{ width: "100%", padding: "14px", fontSize: "15px" }}
            >
              Launch App →
            </button>
          ) : (
            <>
              <button
                onClick={() => { setView("landing"); setMobileMenuOpen(false); }}
                className="btn-outline"
                style={{ width: "100%", padding: "14px", fontSize: "15px" }}
              >
                Landing Page
              </button>

              <div className="network-badge" style={{ width: "100%", justifyContent: "center" }}>
                <span
                  style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: isConnected && isOnCorrectChain ? "var(--success)" : "var(--error)",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                <select
                  value={targetChainId}
                  onChange={(e) => setTargetChainId(Number(e.target.value))}
                  style={{
                    border: "none", background: "transparent", color: "var(--ink)",
                    fontWeight: "700", fontSize: "13px", fontFamily: "Geist Mono, monospace",
                    cursor: "pointer", outline: "none",
                  }}
                >
                  <option value={196}>X Layer Mainnet</option>
                  <option value={1952}>X Layer Testnet</option>
                </select>
              </div>

              {isConnected ? (
                <button
                  onClick={() => { disconnect(); setMobileMenuOpen(false); }}
                  className="btn-outline"
                  style={{ width: "100%", padding: "14px", fontSize: "15px", borderColor: "rgba(194,91,91,0.4)", color: "var(--error)" }}
                >
                  Disconnect ({address?.slice(0, 6)}...{address?.slice(-4)})
                </button>
              ) : (
                <button
                  onClick={() => { connect(); setMobileMenuOpen(false); }}
                  className="btn-neon"
                  style={{ width: "100%", padding: "14px", fontSize: "15px" }}
                >
                  Connect Wallet
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Wrong Network Banner ────────────────────────────────────────────── */}
      {view === "console" && isConnected && !isOnCorrectChain && (
        <div
          style={{
            marginBottom: "24px",
            padding: "12px 20px",
            borderRadius: "100px",
            background: "rgba(194, 91, 91, 0.08)",
            border: "1px solid rgba(194, 91, 91, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: "var(--error)", fontWeight: "600", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <AlertIcon size={16} color="var(--error)" />
            Wrong network! Please switch to {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"} (Chain ID: {targetChainId})
          </span>
          <button
            onClick={switchChain}
            className="btn-neon"
            style={{ padding: "8px 20px", fontSize: "12px" }}
          >
            Switch Network
          </button>
        </div>
      )}

      {/* ── Not Deployed Banner ─────────────────────────────────────────────── */}
      {view === "console" && !isDeployed && (
        <div
          style={{
            marginBottom: "24px",
            padding: "14px 20px",
            borderRadius: "12px",
            background: "rgba(210, 130, 90, 0.08)",
            border: "1px solid rgba(210, 130, 90, 0.18)",
            fontSize: "14px",
            color: "var(--coral-deep)",
          }}
        >
          <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <GearIcon size={16} color="var(--coral)" />
            Contracts not yet deployed.
          </strong>{" "}
          Run{" "}
          <code
            style={{
              background: "rgba(0,0,0,0.05)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "Geist Mono, monospace",
            }}
          >
            npx hardhat run scripts/deploy.js --network xlayer_testnet
          </code>{" "}
          then reload.
        </div>
      )}

      {/* ===================================================================== */}
      {/* ── VIEW 1: LANDING PAGE ────────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {view === "landing" && (
        <div style={{ animation: "fadeIn 0.5s ease", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          
          {/* Main Hero grid layout */}
          <div className="hero-grid-2col" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "80px", alignItems: "center", padding: "40px 0 60px 0" }}>
            
            {/* Left Column */}
            <div>
              <div className="status-badge">
                <span className="dot"></span>
                <span>Live on X Layer Mainnet</span>
              </div>

              <h1 style={{ fontWeight: "800", fontSize: "clamp(42px, 7vw, 76px)", lineHeight: "1.05", letterSpacing: "-0.035em", marginBottom: "28px", color: "var(--ink)" }}>
                Launch pools <br />
                the <span className="serif" style={{ minWidth: "150px", display: "inline-block" }}>{currentText}</span>
                <span className="typewriter-cursor">|</span> way
              </h1>

              <p style={{ fontSize: "17px", lineHeight: "1.6", color: "var(--ink-soft)", maxWidth: "520px", marginBottom: "36px" }}>
                HatchAI is the premier Uniswap V4 Hook-powered Safe-Launch &amp; Deflationary Buyback Suite on X Layer. Protect your token launches in seconds with dynamic decay taxes, anti-whale caps, and wallet cooldowns, while feeding swap fees directly back into an onchain buyback-and-burn engine.
              </p>

              <div className="flow" style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", marginBottom: "36px" }}>
                <div 
                  className={`flow-item ${activeStep === 0 ? "active" : ""}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <EggIcon size={14} color={activeStep === 0 ? "#ffffff" : "var(--coral)"} />
                  <span>your token</span>
                </div>
                <span className={`flow-arrow ${activeStep === 1 ? "active" : ""}`}>→</span>
                <div 
                  className={`flow-item ${activeStep === 1 ? "active" : ""}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <ShieldIcon size={14} color={activeStep === 1 ? "#ffffff" : "var(--coral)"} />
                  <span>hook protection</span>
                </div>
                <span className={`flow-arrow ${activeStep === 2 ? "active" : ""}`}>→</span>
                <div 
                  className={`flow-item ${activeStep === 2 ? "active" : ""}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <RocketIcon size={14} color={activeStep === 2 ? "#ffffff" : "var(--coral)"} />
                  <span>live trading</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <button
                  onClick={() => {
                    setView("console");
                    setConsoleTab("portal");
                  }}
                  className="btn-neon"
                  style={{ padding: "15px 32px", fontSize: "14px", borderRadius: "100px" }}
                >
                  Launch App Console →
                </button>
                <button
                  onClick={() => {
                    setView("console");
                    setConsoleTab("launchpad");
                  }}
                  className="btn-outline"
                  style={{ padding: "15px 32px", fontSize: "14px", borderRadius: "100px" }}
                >
                  Create Custom Sale
                </button>
              </div>
            </div>

            {/* Right Column with Animated Hero Image */}
            <div style={{ position: "relative", maxWidth: "480px", width: "100%", marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img 
                src="/hero-egg.png" 
                alt="HatchAI Incubation Egg" 
                className="hero-levitate-image"
                style={{ 
                  width: "100%", 
                  height: "auto", 
                  borderRadius: "24px",
                  objectFit: "contain"
                }} 
              />
            </div>
            
          </div>

          {/* Stats Ribbon — Real On-Chain Data */}
          <div className="stats-ribbon">
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">
                {(() => {
                  const val = protocolStats.totalLiquidityWeth;
                  if (val === 0) return "0 WETH";
                  if (val < 0.0001) return `${val.toFixed(8)} WETH`;
                  if (val < 0.01) return `${val.toFixed(6)} WETH`;
                  if (val < 1) return `${val.toFixed(4)} WETH`;
                  return `${val.toLocaleString(undefined, { maximumFractionDigits: 2 })} WETH`;
                })()}
              </div>
              <div className="stat-ribbon-label">Total Liquidity</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">{protocolStats.poolsActive}</div>
              <div className="stat-ribbon-label">Safe Pools Active</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">
                {(() => {
                  const val = protocolStats.totalRoyaltiesWeth;
                  if (val === 0) return "0 WETH";
                  if (val < 0.0001) return `${val.toFixed(8)} WETH`;
                  if (val < 0.01) return `${val.toFixed(6)} WETH`;
                  if (val < 1) return `${val.toFixed(4)} WETH`;
                  return `${val.toLocaleString(undefined, { maximumFractionDigits: 4 })} WETH`;
                })()}
              </div>
              <div className="stat-ribbon-label">Creator Royalties</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">
                {(() => {
                  const val = protocolStats.totalBurned;
                  if (val === 0) return "0 Tokens";
                  if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M Tokens`;
                  if (val >= 1000) return `${(val / 1000).toFixed(1)}K Tokens`;
                  return `${val.toLocaleString(undefined, { maximumFractionDigits: 0 })} Tokens`;
                })()}
              </div>
              <div className="stat-ribbon-label">Tokens Burned</div>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: "-8px", marginBottom: "24px" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontStyle: "italic", letterSpacing: "0.5px" }}>
              ● Live on-chain data from X Layer Mainnet — refreshes every 30s
            </span>
          </div>

          {/* Timeline Section */}
          <section style={{ marginBottom: "60px" }}>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "32px", textAlign: "center", color: "var(--ink)" }}>
              How it works
            </h3>
            <div className="timeline-grid">
              <div className="timeline-card">
                <div className="timeline-step">01 / Setup</div>
                <h4 className="timeline-title">Create Pool</h4>
                <p className="timeline-desc">
                  Developers register their project token and specify price ratios, whale caps, trade cooldowns, and tax decay duration.
                </p>
              </div>
              <div className="timeline-card">
                <div className="timeline-step">02 / Secure</div>
                <h4 className="timeline-title">Launch Phase</h4>
                <p className="timeline-desc">
                  Trading opens under protection. Auto-taxes block bot snipers, and transaction caps stop whale dumpers.
                </p>
              </div>
              <div className="timeline-card">
                <div className="timeline-step">03 / Decay</div>
                <h4 className="timeline-title">Decay Period</h4>
                <p className="timeline-desc">
                  Over the configured window (e.g. 24 hours), the swap taxes decay linearly from the start rate down to the baseline.
                </p>
              </div>
              <div className="timeline-card">
                <div className="timeline-step">04 / Mature</div>
                <h4 className="timeline-title">Open Trading</h4>
                <p className="timeline-desc">
                  Protection limits automatically expire, while the contract continues collecting standard fees for the yield loop.
                </p>
              </div>
            </div>
          </section>

          {/* Security Features Grid */}
          <section style={{ marginBottom: "60px" }}>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "32px", textAlign: "center", color: "var(--ink)" }}>
              Core Security Features
            </h3>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon"><ShieldIcon size={28} color="var(--coral)" /></div>
                <div className="feature-info">
                  <h4 className="feature-title">Anti-Whale Swap Caps</h4>
                  <p className="feature-desc">
                    Limits individual swap sizes during the launch phase, preventing any single entity from buying up and monopolizing the token supply.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><TimerIcon size={28} color="var(--coral)" /></div>
                <div className="feature-info">
                  <h4 className="feature-title">Wallet Cooldown Timers</h4>
                  <p className="feature-desc">
                    Blocks rapid-fire transactions from the same wallet in consecutive blocks, effectively disabling high-speed arbitrage and sniper bots.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><ChartIcon size={28} color="var(--coral)" /></div>
                <div className="feature-info">
                  <h4 className="feature-title">Time &amp; Block Decay Modes</h4>
                  <p className="feature-desc">
                    Uniswap V4 hook dynamically decays swap fees based on either smooth time-based linear decay or step-wise block height milestones.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon"><LoopIcon size={28} color="var(--coral)" /></div>
                <div className="feature-info">
                  <h4 className="feature-title">Native V4 Hooks</h4>
                  <p className="feature-desc">
                    Zero wrapper overhead. Native Hook integration intercepts Uniswap V4 pool callbacks directly, guaranteeing secure transaction bounds.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Deflationary Yield Loop Card */}
          <section className="glass-card" style={{ padding: "40px", marginBottom: "60px", textAlign: "center" }}>
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "16px", color: "var(--coral-deep)" }}>
              The Deflationary Yield Loop
            </h3>
            <p style={{ color: "var(--ink-soft)", fontSize: "1.05rem", maxWidth: "800px", margin: "0 auto 32px auto", lineHeight: "1.6" }}>
              Instead of fees disappearing into LP pockets, the `HatchHook` intercepts pool fees, holding them in the contract. Once harvested, fees are automatically split onchain to fuel the project ecosystem.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", maxWidth: "900px", margin: "0 auto" }}>
              <div style={{ background: "rgba(95, 155, 108, 0.04)", border: "1px solid rgba(95, 155, 108, 0.18)", padding: "24px", borderRadius: "12px", textAlign: "left" }}>
                <h4 style={{ color: "var(--success)", fontSize: "1.2rem", fontWeight: "700", marginBottom: "8px" }}>50% Creator Yield</h4>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                  Sent directly to the project creator's address. Earn passive royalties from trading activity to sustainably fund ongoing development.
                </p>
              </div>
              <div style={{ background: "rgba(194, 91, 91, 0.04)", border: "1px solid rgba(194, 91, 91, 0.18)", padding: "24px", borderRadius: "12px", textAlign: "left" }}>
                <h4 style={{ color: "var(--error)", fontSize: "1.2rem", fontWeight: "700", marginBottom: "8px" }}>50% Buyback &amp; Burn</h4>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", lineHeight: "1.5" }}>
                  Used to buy back project tokens directly from the Uniswap pool and burn them instantly, applying constant buy pressure and reducing the token supply.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="faq-section">
            <h3 style={{ fontSize: "1.8rem", fontWeight: "700", marginBottom: "32px", textAlign: "center", color: "var(--ink)" }}>
              Frequently Asked Questions
            </h3>
            
            <div className="faq-item">
              <div className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}>
                <span>What is HatchAI?</span>
                <span className={`faq-toggle ${openFaqIndex === 0 ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === 0 ? 'open' : ''}`}>
                <p style={{ paddingBottom: "10px" }}>
                  HatchAI is a secure launchpad and swap terminal built with Uniswap V4 Hooks on {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}. It helps project developers launch liquidity pools containing automated defenses such as swap size caps, trade cooldowns, and dynamically decaying launch taxes.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}>
                <span>How does the decaying tax protect token launches?</span>
                <span className={`faq-toggle ${openFaqIndex === 1 ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === 1 ? 'open' : ''}`}>
                <p style={{ paddingBottom: "10px" }}>
                  During the initial launch period, the fee is set high (e.g., 10%) to make automated frontrunning and sniper-bot scripts financially non-viable. Over the decay duration (e.g., 24 hours), the fee decays linearly onchain down to the project's standard baseline rate.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}>
                <span>What is the onchain fee splitting mechanism?</span>
                <span className={`faq-toggle ${openFaqIndex === 2 ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === 2 ? 'open' : ''}`}>
                <p style={{ paddingBottom: "10px" }}>
                  HatchHook intercepts trading fees directly inside the pool contract. When creator yield is claimed, the collected base tokens (e.g., WETH) are split 50/50: 50% is transferred to the developer's address as passive yield, and 50% is used to buy back project tokens from the pool and burn them, causing a deflationary supply shock.
                </p>
              </div>
            </div>

            <div className="faq-item">
              <div className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}>
                <span>How can I test the platform?</span>
                <span className={`faq-toggle ${openFaqIndex === 3 ? 'open' : ''}`}>+</span>
              </div>
              <div className={`faq-answer ${openFaqIndex === 3 ? 'open' : ''}`}>
                <p style={{ paddingBottom: "10px" }}>
                  Simply connect your MetaMask or other Web3 wallet to {targetChainId === 196 ? "X Layer Mainnet (Chain ID 196)" : "X Layer Testnet (Chain ID 1952)"} using our top bar. You can swap WETH for project tokens in the Swap Terminal, monitor the decaying fees in real-time, or launch your own token sale under the Token Launchpad tab.
                </p>
              </div>
            </div>
          </section>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ── VIEW 2: APP CONSOLE ─────────────────────────────────────────────── */}
      {/* ===================================================================== */}
      {view === "console" && (
        <div style={{ animation: "fadeIn 0.5s ease" }}>

          {/* Tab Selection */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
            <button
              onClick={() => setConsoleTab("portal")}
              className={consoleTab === "portal" ? "btn-neon" : "btn-outline"}
              style={{ padding: "8px 24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <RocketIcon size={16} color={consoleTab === "portal" ? "var(--sand)" : "var(--coral)"} />
              Launch Portal
            </button>
            <button
              onClick={() => setConsoleTab("swap")}
              className={consoleTab === "swap" ? "btn-neon" : "btn-outline"}
              style={{ padding: "8px 24px" }}
            >
              Swap Terminal
            </button>
            <button
              onClick={() => setConsoleTab("launchpad")}
              className={consoleTab === "launchpad" ? "btn-neon" : "btn-outline"}
              style={{ padding: "8px 24px" }}
            >
              Token Launchpad
            </button>
          </div>




          {/* ── Wallet Info Row (when connected) ────────────────────────────────── */}
          {isConnected && (
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginBottom: "20px",
                padding: "12px 20px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid var(--line)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                <strong style={{ color: "var(--coral-deep)" }}>Wallet:</strong>{" "}
                <code style={{ fontFamily: "Geist Mono, monospace" }}>
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </code>
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                <strong>OKB:</strong> {okbBalance}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                <strong>WETH:</strong> {wethBalance}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                <strong>{projectTokenDetails.symbol}:</strong> {hatchBalance}
              </span>
              {isDeployed && contracts?.hatchHook && (
                <a
                  href={`${explorerUrl}/address/${contracts.hatchHook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.85rem", color: "var(--coral)", marginLeft: "auto", textDecoration: "none", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <SearchIcon size={14} color="var(--coral)" />
                  HatchHook on OKLink →
                </a>
              )}
            </div>
          )}

          {/* TAB 3: POOL PORTAL */}
          {consoleTab === "portal" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fadeIn 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--ink)", marginBottom: "6px", display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <RocketIcon size={24} color="var(--coral)" />
                    Hatch Pool Portal
                  </h2>
                  <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>
                    Join live token launches protected by HatchHook, or explore upcoming launches on X Layer.
                  </p>
                </div>
                <button 
                  onClick={() => setConsoleTab("launchpad")}
                  className="btn-neon" 
                  style={{ fontSize: "0.85rem", padding: "10px 20px" }}
                >
                  + Create Your Token Sale
                </button>
              </div>

              {/* Section 1: Live Launches */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--coral-deep)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px", display: "inline-flex", alignItems: "center" }}>
                  <StatusDot color="var(--success)" size={10} />
                  Live Protection Pools ({(contracts?.hatchToken ? 2 : 0) + userPools.length})
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" }}>
                  
                  {/* Real Default HATCH Pool */}
                  {contracts?.hatchToken && (
                    <div className="glass-card" style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "280px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>HATCH</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Hatch Token</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: isProtectionActive ? "rgba(210, 130, 90, 0.08)" : "rgba(95, 155, 108, 0.08)", color: isProtectionActive ? "var(--coral-deep)" : "var(--success)", border: `1px solid ${isProtectionActive ? "rgba(210, 130, 90, 0.18)" : "rgba(95,155,108,0.18)"}`, fontWeight: "600" }}>
                            {isProtectionActive ? "ACTIVE PROTECTION" : "MATURE TRADING"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "0.82rem", margin: "20px 0" }}>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Dynamic Tax:</span>
                            <strong style={{ color: "var(--ink)" }}>{(currentFeeRate * 100).toFixed(2)}%</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Anti-Whale Cap:</span>
                            <strong style={{ color: "var(--ink)" }}>{isProtectionActive ? `${Number(maxSwapAmount).toLocaleString()} HATCH` : "Disabled"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>WETH Reserve:</span>
                            <strong style={{ color: "var(--ink)" }}>{poolReserves.weth.toFixed(3)} WETH</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Cooldown:</span>
                            <strong style={{ color: "var(--ink)" }}>{isProtectionActive ? `${cooldownDuration}s` : "Disabled"}</strong>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          resetToDefaultPool();
                          setConsoleTab("swap");
                        }}
                        className="btn-neon" 
                        style={{ width: "100%", fontSize: "0.85rem", padding: "10px" }}
                      >
                        Enter Swap Terminal →
                      </button>
                    </div>
                  )}

                  {/* Custom User Pools (Real Onchain) */}
                  {userPools.map((pool, idx) => (
                    <div className="glass-card" key={idx} style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "280px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>{pool.symbol}</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Custom Token Sale</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(210, 130, 90, 0.08)", color: "var(--coral-deep)", border: "1px solid rgba(210,130,90,0.18)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <StatusDot color="var(--success)" size={6} animate={true} />
                            LIVE PROTECTION
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "0.82rem", margin: "20px 0" }}>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Dynamic Tax:</span>
                            <strong style={{ color: "var(--ink)" }}>{pool.taxRate}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Anti-Whale Cap:</span>
                            <strong style={{ color: "var(--ink)" }}>{pool.maxCap}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Token Ratio:</span>
                            <strong style={{ color: "var(--ink)" }}>{pool.priceRatio} {pool.symbol}/WETH</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Cooldown:</span>
                            <strong style={{ color: "var(--ink)" }}>{pool.cooldown}</strong>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          selectPool(pool);
                          setConsoleTab("swap");
                        }}
                        className="btn-neon" 
                        style={{ width: "100%", fontSize: "0.85rem", padding: "10px" }}
                      >
                        Enter Swap Terminal →
                      </button>
                    </div>
                  ))}

                  {/* Mock Live: OKXAI */}
                  {contracts?.hatchToken && (
                    <div className="glass-card" style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "280px", opacity: 0.9 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>OKXAI</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>OKX Artificial Intelligence</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(95, 155, 108, 0.08)", color: "var(--success)", border: "1px solid rgba(95,155,108,0.18)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <StatusDot color="var(--success)" size={6} animate={false} />
                            FEATURED DEMO
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "0.82rem", margin: "20px 0" }}>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Dynamic Tax:</span>
                            <strong style={{ color: "var(--ink)" }}>6.40%</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Anti-Whale Cap:</span>
                            <strong style={{ color: "var(--ink)" }}>2,000 OKXAI</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Liquidity:</span>
                            <strong style={{ color: "var(--ink)" }}>15.5 WETH</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Cooldown:</span>
                            <strong style={{ color: "var(--ink)" }}>30s</strong>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setStatusMsg({ text: "This is a demo project pool. Switch to standard HATCH or deploy your own real custom pool!", type: "info" });
                        }}
                        className="btn-outline" 
                        style={{ width: "100%", fontSize: "0.85rem", padding: "10px" }}
                      >
                        Featured Demo (Protected)
                      </button>
                    </div>
                  )}

                  {/* Empty State */}
                  {(!contracts?.hatchToken && userPools.length === 0) && (
                    <div className="glass-card" style={{ gridColumn: "1 / -1", padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", minHeight: "200px" }}>
                      <RocketIcon size={32} color="var(--muted)" />
                      <div style={{ fontWeight: "700", color: "var(--ink)" }}>No Active Pools Deployed</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", maxWidth: "400px" }}>
                        There are no active launch protection pools on this network. Go to the <strong>Token Launchpad</strong> tab to launch your custom pool!
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Section 2: Upcoming Launches */}
              {contracts?.hatchToken && (
                <div style={{ marginTop: "12px" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <ClockIcon size={16} color="var(--muted)" />
                    Upcoming Protected Launches (2)
                  </h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" }}>
                    
                    {/* Mock SAFE */}
                    <div className="glass-card" style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "260px", background: "rgba(50, 52, 58, 0.02)", borderColor: "rgba(50, 52, 58, 0.05)" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--muted)" }}>SAFE</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>SafeLaunch Protocol</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(50, 52, 58, 0.05)", color: "var(--muted)", fontWeight: "600" }}>
                            STARTS IN 2H
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "0.82rem", margin: "20px 0", opacity: 0.6 }}>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Dynamic Tax:</span>
                            <strong style={{ color: "var(--ink)" }}>12.00% (starts)</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Anti-Whale Cap:</span>
                            <strong style={{ color: "var(--ink)" }}>5,000 SAFE</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Price Ratio:</span>
                            <strong style={{ color: "var(--ink)" }}>500 SAFE/WETH</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Cooldown:</span>
                            <strong style={{ color: "var(--ink)" }}>90s</strong>
                          </div>
                        </div>
                      </div>

                      <button 
                        disabled
                        className="btn-outline" 
                        style={{ width: "100%", fontSize: "0.85rem", padding: "10px", cursor: "not-allowed", opacity: 0.5 }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          Locked <LockIcon size={12} color="var(--muted)" />
                        </span>
                      </button>
                    </div>

                    {/* Mock MEME */}
                    <div className="glass-card" style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "260px", background: "rgba(50, 52, 58, 0.02)", borderColor: "rgba(50, 52, 58, 0.05)" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--muted)" }}>MEME</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>PepeHatch Coin</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(50, 52, 58, 0.05)", color: "var(--muted)", fontWeight: "600" }}>
                            STARTS IN 1D
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "0.82rem", margin: "20px 0", opacity: 0.6 }}>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Dynamic Tax:</span>
                            <strong style={{ color: "var(--ink)" }}>20.00% (starts)</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Anti-Whale Cap:</span>
                            <strong style={{ color: "var(--ink)" }}>1,000,000 MEME</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Price Ratio:</span>
                            <strong style={{ color: "var(--ink)" }}>1M MEME/WETH</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--muted)", display: "block" }}>Cooldown:</span>
                            <strong style={{ color: "var(--ink)" }}>45s</strong>
                          </div>
                        </div>
                      </div>

                      <button 
                        disabled
                        className="btn-outline" 
                        style={{ width: "100%", fontSize: "0.85rem", padding: "10px", cursor: "not-allowed", opacity: 0.5 }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "center" }}>
                          Locked <LockIcon size={12} color="var(--muted)" />
                        </span>
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SWAP CONSOLE */}
          {consoleTab === "swap" && (
            <div>
              {(!poolIdHex || poolIdHex === ethers.ZeroHash || poolIdHex === "0x0000000000000000000000000000000000000000000000000000000000000000") ? (
                <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", minHeight: "250px", animation: "fadeIn 0.4s ease" }}>
                  <RocketIcon size={32} color="var(--muted)" />
                  <div style={{ fontWeight: "700", color: "var(--ink)", fontSize: "1.25rem" }}>No Launch pools selected</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", maxWidth: "450px", lineHeight: "1.5" }}>
                    There are no active launch pools selected. Go to the <strong style={{ cursor: "pointer", color: "var(--coral)", textDecoration: "underline" }} onClick={() => setConsoleTab("portal")}>Token Launchpad/Launch Portal</strong> tab to select a pool!
                  </div>
                  <button onClick={() => setConsoleTab("portal")} className="btn-neon" style={{ marginTop: "12px", padding: "10px 24px" }}>
                    Go to Launch Portal
                  </button>
                </div>
              ) : (
                <div>
                  {/* Stats Grid */}
                  <div className="stats-grid">
                <div
                  className="stat-box"
                  style={{
                    borderLeft: `3px solid ${isProtectionActive ? "var(--coral)" : "var(--success)"}`,
                  }}
                >
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "600" }}>
                    Protection Status
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isProtectionActive ? "var(--coral)" : "var(--success)",
                        animation: "pulse 1.5s ease infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: "700",
                        color: isProtectionActive ? "var(--coral-deep)" : "var(--success)",
                      }}
                    >
                      {isProtectionActive ? "LAUNCH PHASE ACTIVE" : "STANDARD MODE"}
                    </span>
                  </div>
                </div>

                <div className="stat-box">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "600" }}>
                    Dynamic Swap Fee
                  </div>
                  <div className="stat-value">{(currentFeeRate * 100).toFixed(2)}%</div>
                </div>

                <div className="stat-box">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "600" }}>
                    WETH Pool Reserve
                  </div>
                  <div className="stat-value">
                    {poolReserves.weth === 0 && poolReserves.hatch === 0 && targetChainId === 196
                      ? <span style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>No Liquidity</span>
                      : <>{poolReserves.weth < 0.01 ? poolReserves.weth.toFixed(6) : poolReserves.weth.toLocaleString(undefined, { maximumFractionDigits: 4 })} WETH</>
                    }
                  </div>
                </div>

                <div className="stat-box">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "600" }}>
                    {projectTokenDetails.symbol} Pool Reserve
                  </div>
                  <div className="stat-value">
                    {poolReserves.weth === 0 && poolReserves.hatch === 0 && targetChainId === 196
                      ? <span style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>No Liquidity</span>
                      : <>{poolReserves.hatch.toLocaleString(undefined, { maximumFractionDigits: 0 })} {projectTokenDetails.symbol}</>
                    }
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px", marginBottom: "24px" }}>
                
                {/* Left Card: Swap Terminal */}
                <div className="glass-card" style={{ gridColumn: "span 4", padding: "24px" }}>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "16px", color: "var(--ink)" }}>
                    1. Swap Terminal
                  </h2>

                  {!isConnected ? (
                    <div style={{ textAlign: "center", padding: "32px 16px", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                      <div style={{ marginBottom: "12px" }}>
                        <LinkIcon size={36} color="var(--coral)" />
                      </div>
                      <p style={{ color: "var(--color-text-secondary)", marginBottom: "16px", fontSize: "0.9rem" }}>
                        Connect your wallet to start swapping on {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}
                      </p>
                      <button onClick={connect} className="btn-neon" style={{ width: "100%" }}>
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Add Liquidity panel — shown when pool has no liquidity on mainnet */}
                      {poolReserves.weth === 0 && poolReserves.hatch === 0 && targetChainId === 196 && (
                        <div style={{
                          marginBottom: "16px",
                          padding: "16px",
                          borderRadius: "12px",
                          border: "1px dashed var(--coral)",
                          background: "rgba(210, 130, 90, 0.04)",
                          overflow: "hidden"
                        }}>
                          <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--coral-deep)", marginBottom: "8px" }}>
                            🔧 Seed Liquidity (One-Time Setup)
                          </div>
                          <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginBottom: "12px" }}>
                            This pool was initialized before auto-seeding was available. Enter the amounts you want to deposit to enable trading. New pools will auto-seed during launch.
                          </p>

                          {/* Transaction Progress Card */}
                          {liqSteps && (
                            <div style={{
                              marginBottom: "12px",
                              padding: "12px",
                              borderRadius: "10px",
                              background: "rgba(255,255,255,0.5)",
                              border: "1px solid var(--line)",
                              fontSize: "0.82rem"
                            }}>
                              {[
                                { key: "approve_token", label: `Approve ${projectTokenDetails.symbol}` },
                                { key: "approve_weth", label: "Approve WETH" },
                                { key: "read_price", label: "Read pool price" },
                                { key: "add_liquidity", label: "Add liquidity" }
                              ].map((s, i) => {
                                const stepOrder = ["approve_token", "approve_weth", "read_price", "add_liquidity"];
                                const currentIdx = stepOrder.indexOf(liqSteps.step);
                                const thisIdx = stepOrder.indexOf(s.key);
                                let icon = "○";
                                let color = "var(--muted)";
                                if (liqSteps.step === s.key && liqSteps.status === "pending") {
                                  icon = "◎"; color = "var(--coral)";
                                } else if (liqSteps.step === s.key && liqSteps.status === "done") {
                                  icon = "✓"; color = "var(--success)";
                                } else if (liqSteps.step === s.key && liqSteps.status === "success") {
                                  icon = "✓"; color = "var(--success)";
                                } else if (thisIdx < currentIdx || (liqSteps.status === "success" && thisIdx <= currentIdx)) {
                                  icon = "✓"; color = "var(--success)";
                                } else if (liqSteps.status === "error" && liqSteps.step === s.key) {
                                  icon = "✕"; color = "var(--error)";
                                } else if (liqSteps.status === "error" && s.key === "error") {
                                  icon = "✕"; color = "var(--error)";
                                }
                                return (
                                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", color }}>
                                    <span style={{ fontWeight: "700", fontSize: "0.9rem", width: "18px", textAlign: "center" }}>{icon}</span>
                                    <span>{s.label}</span>
                                    {liqSteps.step === s.key && liqSteps.status === "pending" && (
                                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--coral)", fontStyle: "italic" }}>processing...</span>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Status message */}
                              {liqSteps.message && (
                                <div style={{
                                  marginTop: "8px",
                                  padding: "8px 10px",
                                  borderRadius: "6px",
                                  background: liqSteps.status === "error" ? "rgba(194,91,91,0.06)" : liqSteps.status === "success" ? "rgba(95,155,108,0.06)" : "rgba(210,130,90,0.06)",
                                  border: `1px solid ${liqSteps.status === "error" ? "rgba(194,91,91,0.15)" : liqSteps.status === "success" ? "rgba(95,155,108,0.15)" : "rgba(210,130,90,0.15)"}`,
                                  fontSize: "0.78rem",
                                  color: liqSteps.status === "error" ? "var(--error)" : liqSteps.status === "success" ? "var(--success)" : "var(--ink-soft)",
                                  wordBreak: "break-word"
                                }}>
                                  {liqSteps.message}
                                </div>
                              )}

                              {/* Explorer link */}
                              {liqSteps.txHash && (
                                <a
                                  href={`${explorerUrl}/tx/${liqSteps.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: "block", marginTop: "6px", fontSize: "0.78rem", color: "var(--coral-deep)", fontWeight: "600", textDecoration: "underline" }}
                                >
                                  View on Explorer →
                                </a>
                              )}
                            </div>
                          )}

                          {/* Price ratio hint */}
                          {poolReserves.weth > 0 && poolReserves.hatch > 0 && (
                            <div style={{ fontSize: "0.75rem", color: "var(--coral-deep)", marginBottom: "8px", fontWeight: "600" }}>
                              Pool Price: 1 WETH = {(poolReserves.hatch / poolReserves.weth).toLocaleString(undefined, { maximumFractionDigits: 0 })} {projectTokenDetails.symbol}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--ink-soft)", display: "block", marginBottom: "4px" }}>{projectTokenDetails.symbol} Amount</label>
                              <input
                                type="number"
                                placeholder={`${projectTokenDetails.symbol}`}
                                value={liqProjectAmount}
                                onChange={(e) => {
                                  setLiqProjectAmount(e.target.value);
                                  // Auto-calculate WETH from pool price
                                  if (poolReserves.weth > 0 && poolReserves.hatch > 0 && e.target.value) {
                                    const ratio = poolReserves.hatch / poolReserves.weth;
                                    const pairedWeth = parseFloat(e.target.value) / ratio;
                                    setLiqWethAmount(pairedWeth > 0 ? pairedWeth.toFixed(8) : "");
                                  } else if (!e.target.value) {
                                    setLiqWethAmount("");
                                  }
                                }}
                                disabled={isAddingLiquidity}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.85rem", background: isAddingLiquidity ? "var(--bg-secondary)" : "var(--sand-light)", boxSizing: "border-box" }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--ink-soft)", display: "block", marginBottom: "4px" }}>WETH Amount</label>
                              <input
                                type="number"
                                placeholder="WETH"
                                value={liqWethAmount}
                                onChange={(e) => {
                                  setLiqWethAmount(e.target.value);
                                  // Auto-calculate token from pool price
                                  if (poolReserves.weth > 0 && poolReserves.hatch > 0 && e.target.value) {
                                    const ratio = poolReserves.hatch / poolReserves.weth;
                                    const pairedToken = parseFloat(e.target.value) * ratio;
                                    setLiqProjectAmount(pairedToken > 0 ? Math.round(pairedToken).toString() : "");
                                  } else if (!e.target.value) {
                                    setLiqProjectAmount("");
                                  }
                                }}
                                disabled={isAddingLiquidity}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "0.85rem", background: isAddingLiquidity ? "var(--bg-secondary)" : "var(--sand-light)", boxSizing: "border-box" }}
                              />
                            </div>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "8px", fontStyle: "italic" }}>
                            ⚠ Both amounts must be proportional to the pool price. Editing one auto-fills the other.
                          </div>
                          <button
                            type="button"
                            className="btn-neon"
                            disabled={isAddingLiquidity || !liqProjectAmount || !liqWethAmount}
                            style={{ width: "100%", fontSize: "0.85rem", padding: "10px" }}
                            onClick={async () => {
                              setIsAddingLiquidity(true);
                              setLiqSteps({ step: "approve_token", status: "pending", message: "Starting..." });
                              try {
                                const result = await addLiquidity(liqProjectAmount, liqWethAmount, (update) => {
                                  setLiqSteps(update);
                                });
                                if (!result.success) {
                                  setLiqSteps(prev => ({ ...prev, status: "error", message: result.reason || "Transaction failed" }));
                                }
                              } catch (e) {
                                setLiqSteps({ step: "error", status: "error", message: e.message || "Unexpected error" });
                              } finally {
                                setIsAddingLiquidity(false);
                              }
                            }}
                          >
                            {isAddingLiquidity ? "Adding Liquidity..." : `Add Liquidity →`}
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSwap}>
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "8px", fontWeight: "600" }}>
                            You Pay (WETH)
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              id="swap-amount-input"
                              type="number"
                              value={swapAmount}
                              onChange={(e) => setSwapAmount(e.target.value)}
                              className="glass-input"
                              style={{ paddingRight: "70px" }}
                              placeholder="0.0"
                              step="any"
                              min="0.000001"
                            />
                            <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", fontWeight: "600", color: "var(--color-text-secondary)" }}>
                              WETH
                            </span>
                          </div>
                          <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                            Balance: {wethBalance} WETH
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "center", margin: "4px 0" }}>
                          <span style={{ fontSize: "1.2rem", color: "var(--coral)", fontWeight: "bold" }}>↓</span>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "8px", fontWeight: "600" }}>
                            You Receive ({projectTokenDetails.symbol})
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              type="text"
                              value={getEstimatedOutput()}
                              className="glass-input"
                              style={{ paddingRight: "70px", background: "rgba(255, 255, 255, 0.25)", cursor: "not-allowed" }}
                              disabled
                              readOnly
                            />
                            <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", fontWeight: "600", color: "var(--color-text-secondary)" }}>
                              {projectTokenDetails.symbol}
                            </span>
                          </div>
                          <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                            Balance: {hatchBalance} {projectTokenDetails.symbol}
                          </div>
                        </div>

                        {/* Quote Details */}
                        {parseFloat(swapAmount) > 0 && poolReserves.weth > 0 && (
                          <div style={{ 
                            background: "rgba(50, 52, 58, 0.02)", 
                            border: "1px dashed var(--line)", 
                            borderRadius: "8px", 
                            padding: "10px 12px", 
                            marginBottom: "16px", 
                            fontSize: "0.78rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--color-text-muted)" }}>Price:</span>
                              <span style={{ fontWeight: "600" }}>
                                1 WETH ≈ {((poolReserves.hatch) / poolReserves.weth).toLocaleString(undefined, { maximumFractionDigits: 2 })} {projectTokenDetails.symbol}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--color-text-muted)" }}>Swap Fee ({(currentFeeRate * 100).toFixed(2)}%):</span>
                              <span style={{ fontWeight: "600", color: "var(--coral-deep)" }}>
                                -{(parseFloat(swapAmount) * currentFeeRate).toFixed(4)} WETH
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          id="swap-submit-btn"
                          type="submit"
                          className="btn-neon"
                          style={{ width: "100%" }}
                          disabled={isTxPending || !isOnCorrectChain}
                        >
                          {isTxPending ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                              <HourglassIcon size={14} color="var(--sand)" /> Confirming…
                            </span>
                          ) : `Swap WETH → ${projectTokenDetails.symbol}`}
                        </button>
                      </form>

                      {pendingTxHash && (
                        <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.3)", border: "1px solid var(--line)", fontSize: "0.8rem" }}>
                          <a href={`${explorerUrl}/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--coral)", fontWeight: "600", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <SearchIcon size={12} color="var(--coral)" />
                            View tx on OKLink →
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {statusMsg && (
                    <div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "6px", fontSize: "0.85rem", background: statusMsg.type === "error" ? "rgba(194, 91, 91, 0.08)" : statusMsg.type === "success" ? "rgba(95, 155, 108, 0.08)" : "rgba(50, 52, 58, 0.03)", border: `1px solid ${statusMsg.type === "error" ? "rgba(194, 91, 91, 0.2)" : statusMsg.type === "success" ? "rgba(95, 155, 108, 0.2)" : "var(--line)"}`, color: statusMsg.type === "error" ? "var(--error)" : statusMsg.type === "success" ? "var(--success)" : "var(--ink)" }}>
                      {statusMsg.text}
                    </div>
                  )}
                </div>

                {/* Center Card: Decay Monitor */}
                <div className="glass-card" style={{ gridColumn: "span 8", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div>
                      <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--ink)" }}>
                        2. Safe-Launch Decay Monitor
                      </h2>
                      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                        {activeDecayMode === "block"
                          ? `Fee decays in 4 step-wise block phases over ${totalBlocks} blocks. Anti-whale & cooldown active during launch phase.`
                          : `Fee declines from ${(startFeeDecimal * 100).toFixed(0)}% to ${(endFeeDecimal * 100).toFixed(1)}% over ${decayDuration / 3600}h. Anti-whale & cooldown active during launch phase.`}
                      </p>
                    </div>
                    <div style={{ padding: "6px 12px", borderRadius: "20px", background: "rgba(95,155,108,0.08)", border: "1px solid rgba(95,155,108,0.18)", fontSize: "0.75rem", color: "var(--success)", fontWeight: "600", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <StatusDot color="var(--success)" size={6} animate={true} />
                      LIVE ONCHAIN
                    </div>
                  </div>

                  {/* SVG Decay Chart */}
                  <div style={{ textAlign: "center", position: "relative" }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto" }}>
                      <line x1={startX} y1={mapY(activeDecayMode === "block" ? 0.90 : startFeeDecimal)} x2={endX} y2={mapY(activeDecayMode === "block" ? 0.90 : startFeeDecimal)} stroke="rgba(0,0,0,0.03)" strokeDasharray="3" />
                      <line x1={startX} y1={endY} x2={endX} y2={endY} stroke="rgba(0,0,0,0.03)" strokeDasharray="3" />
                      
                      {activeDecayMode === "block" ? (
                        <>
                          <path
                            d={getBlockDecayPath()}
                            fill="none"
                            stroke="rgba(50, 52, 58, 0.12)"
                            strokeWidth="3.5"
                            strokeDasharray="4 2"
                          />
                          <path
                            d={getActiveBlockDecayPath()}
                            fill="none"
                            stroke="var(--coral)"
                            strokeWidth="4.5"
                          />
                        </>
                      ) : (
                        <>
                          <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="url(#decayGrad)" strokeWidth="3" />
                          <line x1={startX} y1={startY} x2={currentX} y2={currentY} stroke="var(--coral)" strokeWidth="4" />
                        </>
                      )}
                      
                      <circle cx={currentX} cy={currentY} r="8" fill="var(--coral)" filter="url(#glow)" />
                      <defs>
                        <linearGradient id="decayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--coral)" />
                          <stop offset="100%" stopColor="var(--ink)" />
                        </linearGradient>
                        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                    </svg>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: `0 ${padding}px`, fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                      {activeDecayMode === "block" ? (
                        <>
                          <span>Block 0 (90%)</span>
                          <span>Block 10 (50%)</span>
                          <span>Block 50 (10%)</span>
                          <span>Block 100+ ({(endFeeDecimal * 100).toFixed(1)}%)</span>
                        </>
                      ) : (
                        <>
                          <span>Launch ({(startFeeDecimal * 100).toFixed(0)}% Fee)</span>
                          <span>12h (~{((startFeeDecimal + endFeeDecimal)/2 * 100).toFixed(1)}% Fee)</span>
                          <span>24h ({(endFeeDecimal * 100).toFixed(1)}% Fee)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rule Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginTop: "16px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px" }}>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        {activeDecayMode === "block" ? "Blocks Remaining" : "Time Remaining"}
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isProtectionActive ? "var(--ink)" : "var(--success)" }}>
                        {activeDecayMode === "block"
                          ? (isProtectionActive ? `${remainingBlocks} blocks` : "Completed")
                          : (isProtectionActive ? `${remainingHours.toFixed(1)}h` : "Completed")}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        Current Block
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--ink)" }}>
                        #{blockNumber || "Fetching..."}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        Anti-Whale Cap
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isProtectionActive ? "var(--coral-deep)" : "var(--color-text-secondary)" }}>
                        {isProtectionActive ? `${Number(maxSwapAmount).toLocaleString()} ${projectTokenDetails.symbol}` : "Disabled"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        Wallet Cooldown
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isProtectionActive ? "var(--coral-deep)" : "var(--color-text-secondary)" }}>
                        {isProtectionActive ? `${cooldownDuration}s` : "Disabled"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "24px" }}>
                
                {/* Simulation Panel */}
                {targetChainId !== 196 && (
                  <div className="glass-card" style={{ gridColumn: "span 12", padding: "28px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <ShieldIcon size={20} color="var(--coral)" /> Interactive Launch Protection Simulator
                        </h2>
                        <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginTop: "4px" }}>
                          Compare a sniper bot attack on a standard pool vs HatchAI's protected Uniswap V4 pool.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={runSniperSimulation}
                        disabled={simState === "running"}
                        className="btn-neon"
                        style={{ padding: "10px 24px", minWidth: "200px" }}
                      >
                        {simState === "running" ? "Running Attack..." : "Simulate Sniper Attack"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {/* Left Column: Standard Pool */}
                      <div style={{ background: "rgba(194, 91, 91, 0.02)", border: "1px solid rgba(194, 91, 91, 0.15)", borderRadius: "12px", padding: "20px" }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--error)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                          <AlertIcon size={16} color="var(--error)" /> Standard Unprotected DEX Pool
                        </h3>

                        {unprotectedLogs.length === 0 ? (
                          <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                            Click the button to launch a mock sniper attack.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {unprotectedLogs.map((log, i) => (
                              <div key={i} style={{ fontSize: "0.82rem", lineHeight: "1.4", padding: "10px 12px", borderRadius: "8px", background: "rgba(194, 91, 91, 0.05)", borderLeft: "3px solid var(--error)", color: "var(--ink)", display: "flex", alignItems: "flex-start" }}>
                                {renderSimIcon(log.icon)}
                                <span>{log.text}</span>
                              </div>
                            ))}
                            {simState === "completed" && (
                              <div style={{ borderTop: "1px dashed rgba(194,91,91,0.2)", paddingTop: "12px", marginTop: "8px", color: "var(--error)", fontWeight: "700", fontSize: "0.9rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                <SkullIcon size={15} color="var(--error)" />
                                Result: Pool rugged. Community capital lost.
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Protected Pool */}
                      <div style={{ background: "rgba(95, 155, 108, 0.02)", border: "1px solid rgba(95, 155, 108, 0.15)", borderRadius: "12px", padding: "20px" }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--success)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
                          <ShieldIcon size={16} color="var(--success)" /> HatchAI Protected Hook Pool
                        </h3>

                        {protectedLogs.length === 0 ? (
                          <p style={{ color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
                            Click the button to launch a mock sniper attack.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {protectedLogs.map((log, i) => (
                              <div key={i} style={{ fontSize: "0.82rem", lineHeight: "1.4", padding: "10px 12px", borderRadius: "8px", background: "rgba(95, 155, 108, 0.05)", borderLeft: "3px solid var(--success)", color: "var(--ink)", display: "flex", alignItems: "flex-start" }}>
                                {renderSimIcon(log.icon)}
                                <span>{log.text}</span>
                              </div>
                            ))}
                            {simState === "completed" && (
                              <div style={{ borderTop: "1px dashed rgba(95,155,108,0.2)", paddingTop: "12px", marginTop: "8px", color: "var(--success)", fontWeight: "700", fontSize: "0.9rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                <RocketIcon size={15} color="var(--success)" />
                                Result: 100% Safe Launch. Token value protected!
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Payout & Buyback Card */}
                <div className="glass-card" style={{ gridColumn: "span 6", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--ink)", marginBottom: "4px" }}>
                      3. Payout &amp; Deflationary Buyback
                    </h2>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "16px" }}>
                      Harvest accumulated WETH swap fees. Splitting is executed onchain by HatchHook. (Global Active Pool Stats)
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                      <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Pool Creator Yield</span>
                        <div style={{ fontSize: "1.3rem", fontWeight: "700", marginTop: "4px", color: "var(--success)" }}>
                          {totalCreatorFeesClaimed} WETH
                        </div>
                      </div>

                      <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Pool Tokens Burned</span>
                        <div style={{ fontSize: "1.3rem", fontWeight: "700", marginTop: "4px", color: "var(--error)" }}>
                          {Number(totalTokensBurned).toLocaleString(undefined, { maximumFractionDigits: 1 })} {projectTokenDetails.symbol}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(255,255,255,0.15)", border: "1px solid var(--line)", marginBottom: "20px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ color: "var(--ink)", fontWeight: "600" }}>Hook Fees (100%):</span>
                        <span style={{ fontFamily: "Geist Mono, monospace" }}>{accumulatedFees.toFixed(4)} WETH</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", padding: "10px 0", borderTop: "1px dashed var(--line)" }}>
                        <div style={{ flex: 1, borderRight: "1px solid var(--line)", paddingRight: "10px" }}>
                          <div style={{ color: "var(--success)", fontWeight: "500" }}>50% Creator:</div>
                          <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "0.8rem", marginTop: "2px" }}>
                            {(accumulatedFees / 2).toFixed(4)} WETH
                          </div>
                        </div>
                        <div style={{ flex: 1, paddingLeft: "10px" }}>
                          <div style={{ color: "var(--error)", fontWeight: "500" }}>50% Buyback &amp; Burn:</div>
                          <div style={{ fontFamily: "Geist Mono, monospace", fontSize: "0.8rem", marginTop: "2px" }}>
                            {(accumulatedFees / 2).toFixed(4)} WETH
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {targetChainId === 196 ? (
                      <div style={{ 
                        background: "rgba(95, 155, 108, 0.05)", 
                        border: "1px solid rgba(95, 155, 108, 0.15)", 
                        borderRadius: "8px", 
                        padding: "14px", 
                        fontSize: "0.85rem", 
                        lineHeight: "1.5",
                        color: "var(--ink-soft)" 
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontWeight: "700", marginBottom: "8px" }}>
                          <ShieldIcon size={16} color="var(--success)" /> Official V4 Fee Harvest
                        </div>
                        <p style={{ margin: "0 0 10px 0" }}>
                          To automate fee splitting & buyback-burn on-chain, transfer your Uniswap V4 LP NFT to the 
                          <strong> HatchHook</strong> address:
                        </p>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between", 
                          background: "var(--bg-soft)", 
                          padding: "6px 10px", 
                          borderRadius: "4px", 
                          marginBottom: "12px",
                          fontFamily: "monospace",
                          border: "1px solid var(--line)"
                        }}>
                          <span style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{contracts.hatchHook}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(contracts.hatchHook);
                              addLog("System", "HatchHook address copied to clipboard", "success");
                            }}
                            style={{ 
                              background: "none", 
                              border: "none", 
                              color: "var(--coral)", 
                              cursor: "pointer", 
                              fontSize: "11px",
                              fontWeight: "700",
                              marginLeft: "8px"
                            }}
                          >
                            Copy
                          </button>
                        </div>
                        
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", fontWeight: "700", marginBottom: "4px", fontSize: "0.8rem", color: "var(--ink)" }}>
                            Uniswap V4 LP NFT Token ID:
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. 4819" 
                            value={lpNftTokenId}
                            onChange={(e) => setLpNftTokenId(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: "4px",
                              border: "1px solid var(--line)",
                              background: "var(--bg)",
                              color: "var(--ink)",
                              boxSizing: "border-box"
                            }}
                          />
                        </div>

                        <button
                          onClick={handleClaimMainnet}
                          disabled={!lpNftTokenId || isTxPending || !isConnected || !isOnCorrectChain}
                          className="btn-neon"
                          style={{ width: "100%" }}
                        >
                          {isTxPending ? "Confirming..." : "Harvest LP Fees & Swap-Burn"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          id="claim-fees-btn"
                          onClick={handleClaim}
                          disabled={accumulatedFees <= 0 || !isConnected || isTxPending || !isOnCorrectChain || isAgentActive}
                          className="btn-neon"
                          style={{ width: "100%", marginBottom: "20px" }}
                        >
                          {isTxPending ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                              <HourglassIcon size={14} color="var(--sand)" /> Confirming…
                            </span>
                          ) : isAgentActive ? "Agent Auto-Harvest Mode Enabled" : "Manual Creator Claim & Buyback-Burn"}
                        </button>

                        {/* AI Agent Section */}
                        <div style={{ borderTop: "1.5px dashed var(--line)", paddingTop: "16px", marginTop: "4px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <BotIcon size={18} color="var(--coral)" />
                              <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--ink)" }}>HatchAI Yield Agent</span>
                            </div>
                            
                            {/* Toggle switch styled cleanly */}
                            <div style={{ display: "flex", background: "rgba(50,52,58,0.05)", borderRadius: "100px", padding: "3px", border: "1px solid var(--line)" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAgentActive(false);
                                  addLog("Agent AI", "Autonomous Yield Agent deactivated. Switched to manual mode.", "info");
                                }}
                                style={{
                                  border: "none",
                                  borderRadius: "100px",
                                  padding: "4px 12px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  background: !isAgentActive ? "var(--ink)" : "transparent",
                                  color: !isAgentActive ? "var(--sand)" : "var(--ink-soft)",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                              >
                                MANUAL
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAgentActive(true);
                                }}
                                style={{
                                  border: "none",
                                  borderRadius: "100px",
                                  padding: "4px 12px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  background: isAgentActive ? "var(--coral)" : "transparent",
                                  color: isAgentActive ? "var(--sand)" : "var(--ink-soft)",
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                              >
                                AGENT ACTIVE
                              </button>
                            </div>
                          </div>

                          {/* Agent status log panel */}
                          <div style={{ background: "rgba(50,52,58,0.02)", border: "1px solid var(--line)", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                              <span style={{ color: "var(--muted)" }}>Agent Status:</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "700", color: isAgentActive ? "var(--success)" : "var(--muted)" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isAgentActive ? "var(--success)" : "var(--muted)", animation: isAgentActive ? "pulse 1.5s ease infinite" : "none" }}></span>
                                {isAgentActive ? "AUTONOMOUS MONITORING" : "STANDBY"}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem" }}>
                              <span style={{ color: "var(--muted)" }}>Auto-Harvest Threshold:</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <input 
                                  type="number"
                                  value={agentThreshold}
                                  onChange={(e) => {
                                    setAgentThreshold(e.target.value);
                                    if (isAgentActive) {
                                      addLog("Agent AI", `Auto-harvest threshold updated to ${e.target.value} WETH`, "info");
                                    }
                                  }}
                                  disabled={isAgentActive}
                                  style={{
                                    width: "60px",
                                    background: "rgba(255,255,255,0.7)",
                                    border: "1px solid var(--line)",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    textAlign: "right"
                                  }}
                                  step="0.005"
                                  min="0.001"
                                />
                                <span style={{ fontWeight: "600" }}>WETH</span>
                              </div>
                            </div>

                            <div style={{ borderTop: "1px dashed var(--line)", paddingTop: "8px", marginTop: "2px", fontSize: "0.75rem", fontFamily: "Geist Mono, monospace", color: "var(--ink-soft)" }}>
                              <span style={{ color: "var(--muted)" }}>Agent Log:</span>{" "}
                              <span style={{ color: isAgentActive ? "var(--coral-deep)" : "var(--ink)" }}>{agentLog}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Blockchain Console */}
                <div style={{ gridColumn: "span 6" }}>
                  <div ref={terminalRef} className="terminal-panel">
                    <div className="terminal-header">
                      <div className="terminal-dots">
                        <span className="terminal-dot dot-red" />
                        <span className="terminal-dot dot-yellow" />
                        <span className="terminal-dot dot-green" />
                      </div>
                      <span style={{ color: "#fff" }}>X Layer Node Console</span>
                      {isConnected && (
                        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--success)" }}>
                          ● LIVE
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {logs.length === 0 && (
                        <div className="log-entry log-system">
                          <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                          <span className="log-tag">[System]</span>
                          <span style={{ color: "#fff" }}>Connect wallet to {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"} to start interacting.</span>
                        </div>
                      )}
                      {logs.map((log, index) => (
                        <div key={index} className={`log-entry log-${log.type}`}>
                          <span className="log-time">[{log.timestamp}]</span>
                          <span className="log-tag">[{log.tag}]</span>
                          <span style={{ color: log.type === "error" ? "var(--error)" : log.type === "success" ? "var(--success)" : "#fff", wordBreak: "break-all" }}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
            </div>
          )}

          {/* TAB 2: DEVELOPER LAUNCHPAD */}
          {consoleTab === "launchpad" && (
            <div className="glass-card" style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--ink)", marginBottom: "8px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <EggIcon size={24} color="var(--coral)" />
                Developer Token &amp; Pool Launchpad
              </h2>
              <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem", marginBottom: "32px", lineHeight: "1.5" }}>
                Step-by-step developer console to deploy a test ERC20 token and initialize a protected Uniswap v4 sale pool on {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}.
              </p>

              {!isConnected ? (
                <div style={{ textAlign: "center", padding: "40px", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <LinkIcon size={36} color="var(--coral)" />
                  </div>
                  <p style={{ color: "var(--ink-soft)", marginBottom: "16px" }}>
                    Connect your wallet to deploy tokens and launch pools on {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}
                  </p>
                  <button onClick={connect} className="btn-neon" style={{ padding: "10px 24px" }}>
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                  
                  {parseFloat(okbBalance) < 0.05 && (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        background: "rgba(194, 91, 91, 0.08)",
                        border: "1px solid rgba(194, 91, 91, 0.18)",
                        fontSize: "0.88rem",
                        color: "var(--error)",
                        lineHeight: "1.5"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "6px" }}>
                        <AlertIcon size={18} color="var(--error)" />
                        Low OKB Balance Detected ({okbBalance} OKB)
                      </div>
                      <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                        Deploying contracts and seeding pools on {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"} requires native OKB tokens to cover gas fees. If your balance is insufficient, gas estimation will fail and transactions will revert.
                      </p>
                      {targetChainId !== 196 && (
                        <div style={{ marginTop: "12px" }}>
                          <a
                            href="https://www.okx.com/web3/faucet"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline"
                            style={{
                              padding: "6px 14px",
                              fontSize: "0.78rem",
                              textDecoration: "none",
                              display: "inline-block",
                              border: "1px solid var(--error)",
                              color: "var(--error)",
                              borderRadius: "100px",
                              fontWeight: "600"
                            }}
                          >
                            Request Testnet OKB from OKX Faucet →
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {targetChainId !== 196 && parseFloat(wethBalance) < (parseFloat(launchSeedWeth) || 0.5) && (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        background: "rgba(224, 134, 0, 0.08)",
                        border: "1px solid rgba(224, 134, 0, 0.18)",
                        fontSize: "0.88rem",
                        color: "#c28019",
                        lineHeight: "1.5"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "6px" }}>
                        <AlertIcon size={18} color="#c28019" />
                        Insufficient WETH Balance ({wethBalance} / {launchSeedWeth || "0.5"} WETH)
                      </div>
                      <p style={{ margin: 0, color: "var(--ink-soft)" }}>
                        Seeding this pool requires WETH (Wrapped Ether). Uniswap v4's PoolManager contract will prompt you to approve WETH spend so that it can retrieve the seeded reserves from your wallet. Mint mock WETH below to continue.
                      </p>
                      <div style={{ marginTop: "12px" }}>
                        <button
                          onClick={handleMintWeth}
                          className="btn-neon"
                          disabled={isFaucetPending || isTxPending}
                          style={{
                            padding: "8px 18px",
                            fontSize: "0.82rem",
                            fontWeight: "600",
                            borderRadius: "100px"
                          }}
                        >
                          {isFaucetPending ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <HourglassIcon size={14} color="var(--sand)" /> Minting WETH...
                            </span>
                          ) : "Claim 10 Mock WETH (Faucet)"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Import Existing Pool Box */}
                  <div className="glass-card" style={{ padding: "20px", background: "rgba(210, 130, 90, 0.04)", border: "1px solid rgba(210, 130, 90, 0.15)", borderRadius: "12px" }}>
                    <h3 style={{ fontSize: "1.0rem", fontWeight: "700", color: "var(--ink)", marginBottom: "6px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <RocketIcon size={18} color="var(--coral)" />
                      Import Existing Pool
                    </h3>
                    <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "16px" }}>
                      Already launched a pool yesterday or on another browser? Enter the token address below to import the configuration and trading logs directly from the X Layer network.
                    </p>
                    <form onSubmit={handleImport} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <input
                        type="text"
                        className="glass-input"
                        style={{ borderRadius: "8px", flex: 1, padding: "10px 16px" }}
                        placeholder="Project Token Address (0x...)"
                        value={importAddress}
                        onChange={(e) => setImportAddress(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        className="btn-outline"
                        style={{ padding: "10px 24px", whiteSpace: "nowrap", border: "1px solid var(--ink)", color: "var(--ink)", fontWeight: "600", fontSize: "13px" }}
                        disabled={isTxPending || isImporting}
                      >
                        {isImporting ? "Importing..." : "Import Pool"}
                      </button>
                    </form>
                  </div>

                  {/* Phase 1: Deploy a Test ERC20 Token */}
                  <div style={{ borderBottom: "1.5px dashed var(--line)", paddingBottom: "32px" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--coral-deep)", marginBottom: "16px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", background: "var(--coral)", color: "var(--sand)", width: "24px", height: "24px", borderRadius: "50%", textAlign: "center", lineHeight: "24px", fontSize: "12px", fontWeight: "800" }}>1</span>
                      Phase 1: Deploy a Test ERC20 Token
                    </h3>
                    <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: "1.4" }}>
                      Need a token to test the launchpad? Quick-deploy a Mock ERC20 contract directly onto {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}. The deployed address will automatically populate Phase 2.
                    </p>

                    <form onSubmit={handleDeployToken} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Token Name
                        </label>
                        <input
                          type="text"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={tokenDeployName}
                          onChange={(e) => setTokenDeployName(e.target.value)}
                          placeholder="e.g. Mock Project Token"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Token Symbol
                        </label>
                        <input
                          type="text"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={tokenDeploySymbol}
                          onChange={(e) => setTokenDeploySymbol(e.target.value)}
                          placeholder="e.g. MPT"
                          required
                        />
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Total Supply (Tokens)
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={tokenDeploySupply}
                          onChange={(e) => setTokenDeploySupply(e.target.value)}
                          placeholder="e.g. 10000000"
                          min="1"
                          required
                        />
                      </div>
                      <div style={{ gridColumn: "span 2", marginTop: "4px" }}>
                        <button
                          type="submit"
                          className="btn-outline"
                          style={{ width: "100%", padding: "12px", border: "1px solid var(--coral)", color: "var(--coral-deep)", fontWeight: "700" }}
                          disabled={isTxPending || !isOnCorrectChain}
                        >
                          {isTxPending ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                              <HourglassIcon size={14} color="var(--coral)" /> Deploying contract...
                            </span>
                          ) : "Deploy Token"}
                        </button>
                      </div>
                    </form>

                    {tokenDeployStatus && (
                      <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "8px", fontSize: "0.88rem", background: tokenDeployStatus.type === "error" ? "rgba(194, 91, 91, 0.08)" : tokenDeployStatus.type === "success" ? "rgba(95, 155, 108, 0.08)" : "rgba(50, 52, 58, 0.03)", border: `1px solid ${tokenDeployStatus.type === "error" ? "rgba(194, 91, 91, 0.2)" : tokenDeployStatus.type === "success" ? "rgba(95, 155, 108, 0.2)" : "var(--line)"}`, color: tokenDeployStatus.type === "error" ? "var(--error)" : tokenDeployStatus.type === "success" ? "var(--success)" : "var(--ink)" }}>
                        {tokenDeployStatus.text}
                      </div>
                    )}
                  </div>

                  {/* Phase 2: Launch a Protected Token Sale */}
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--coral-deep)", marginBottom: "16px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ display: "inline-block", background: "var(--coral)", color: "var(--sand)", width: "24px", height: "24px", borderRadius: "50%", textAlign: "center", lineHeight: "24px", fontSize: "12px", fontWeight: "800" }}>2</span>
                      Phase 2: Launch a Protected Token Sale
                    </h3>
                    <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: "1.4" }}>
                      Configure and initialize the Uniswap v4 pool. Define your pricing, bot-protection parameters, and explicitly state how much of your token supply is put up for sale (seeded) alongside initial WETH reserves.
                    </p>

                    <form onSubmit={handleLaunchPool} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      {/* Token Address */}
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Project Token Contract Address (ERC20)
                        </label>
                        <input
                          id="launch-token-address-input"
                          type="text"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          placeholder="0x..."
                          value={launchTokenAddress}
                          onChange={(e) => setLaunchTokenAddress(e.target.value)}
                          required
                        />
                      </div>

                      {/* Base Token Address */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Base Token Address (default WETH)
                        </label>
                        <input
                          type="text"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchBaseAddress}
                          onChange={(e) => setLaunchBaseAddress(e.target.value)}
                          required
                        />
                      </div>

                      {/* Initial Price Ratio */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Price Ratio (Project Tokens per 1 Base)
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchPriceRatio}
                          onChange={(e) => setLaunchPriceRatio(e.target.value)}
                          min="0.00001"
                          step="any"
                          required
                        />
                      </div>

                      {/* Project Tokens for Sale */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          Project Tokens up for Sale (Seeded)
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>(e.g. 5,000,000)</span>
                        </label>
                        <input
                          id="launch-seed-project-input"
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchSeedProject}
                          onChange={(e) => setLaunchSeedProject(e.target.value)}
                          min="0"
                          step="any"
                          required
                        />
                      </div>

                      {/* WETH for Sale */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          WETH up for Sale (Seeded)
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>(e.g. 0.5 WETH)</span>
                        </label>
                        <input
                          id="launch-seed-weth-input"
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchSeedWeth}
                          onChange={(e) => setLaunchSeedWeth(e.target.value)}
                          min="0"
                          step="any"
                          required
                        />
                      </div>

                      {/* Start Fee */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Start Launch Tax (%)
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchStartFee}
                          onChange={(e) => setLaunchStartFee(e.target.value)}
                          min="0.3"
                          max="30"
                          step="0.1"
                          required
                        />
                      </div>

                      {/* End Fee */}
                      <div>
                        <label style={{ display: "block", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          End Baseline Fee (%)
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchEndFee}
                          onChange={(e) => setLaunchEndFee(e.target.value)}
                          min="0.01"
                          max="5"
                          step="0.01"
                          required
                        />
                      </div>

                      {/* Decay Mode Selection */}
                      <div style={{ gridColumn: "span 2", marginBottom: "4px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "8px", fontWeight: "600" }}>
                          Decay Mode (Protection Period Calculation)
                          <Tooltip text="Decides how the anti-sniper protection period decays. Time-Based decays linearly over hours. Block-Based decays in discrete steps over block height milestones (Blocks 1-30 face higher step rates) to defend against automated smart contract bots." />
                        </label>
                        <div style={{ display: "flex", background: "rgba(50,52,58,0.05)", borderRadius: "100px", padding: "3px", border: "1px solid var(--line)", width: "fit-content" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setLaunchDecayMode("time");
                              setLaunchDecayHours("24");
                            }}
                            style={{
                              border: "none",
                              borderRadius: "100px",
                              padding: "6px 16px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: launchDecayMode === "time" ? "var(--ink)" : "transparent",
                              color: launchDecayMode === "time" ? "var(--sand)" : "var(--ink-soft)",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            TIME-BASED (HOURS)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLaunchDecayMode("block");
                              setLaunchDecayHours("100");
                            }}
                            style={{
                              border: "none",
                              borderRadius: "100px",
                              padding: "6px 16px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: launchDecayMode === "block" ? "var(--coral)" : "transparent",
                              color: launchDecayMode === "block" ? "var(--sand)" : "var(--ink-soft)",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            BLOCK-BASED (BLOCKS)
                          </button>
                        </div>
                      </div>

                      {/* Decay Duration */}
                      <div>
                        <label style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          {launchDecayMode === "block" ? "Tax Decay Duration (Blocks)" : "Tax Decay Duration (Hours)"}
                          <Tooltip text={launchDecayMode === "block" ? "The total number of blocks (approx. 2 seconds per block on X Layer) until the anti-sniper tax decays completely to the 0.3% baseline rate." : "The total number of hours until the anti-sniper tax decays completely to the 0.3% baseline rate."} />
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchDecayHours}
                          onChange={(e) => setLaunchDecayHours(e.target.value)}
                          min="1"
                          max={launchDecayMode === "block" ? "10000" : "168"}
                          required
                        />
                      </div>

                      {/* Cooldown */}
                      <div>
                        <label style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Wallet Trade Cooldown (Seconds)
                          <Tooltip text="Prevents a single wallet from executing multiple swap transactions within the specified cooldown window (e.g. 60 seconds) to slow down bot snipers." />
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchCooldown}
                          onChange={(e) => setLaunchCooldown(e.target.value)}
                          min="0"
                          max="3600"
                          required
                        />
                      </div>

                      {/* Anti-Whale Limit */}
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "2px", color: "var(--ink-soft)", fontSize: "0.82rem", marginBottom: "6px", fontWeight: "600" }}>
                          Anti-Whale Max Swap Cap (Tokens)
                          <Tooltip text="The maximum amount of tokens a single wallet can purchase in a single transaction/block during the protection decay period." />
                        </label>
                        <input
                          type="number"
                          className="glass-input"
                          style={{ borderRadius: "8px" }}
                          value={launchMaxSwap}
                          onChange={(e) => setLaunchMaxSwap(e.target.value)}
                          min="1"
                          required
                        />
                      </div>

                      {/* Submit Button */}
                      <div style={{ gridColumn: "span 2", marginTop: "12px" }}>
                        <button
                          type="submit"
                          className="btn-neon"
                          style={{ width: "100%", padding: "14px" }}
                          disabled={isTxPending || !isOnCorrectChain}
                        >
                          {isTxPending ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                              <HourglassIcon size={14} color="var(--sand)" /> Initializing pool and seeding liquidity...
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                              <RocketIcon size={14} color="var(--sand)" /> Initialize Launch Pool
                            </span>
                          )}
                        </button>
                      </div>
                    </form>

                    {launchStatus && (
                      <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "8px", fontSize: "0.88rem", background: launchStatus.type === "error" ? "rgba(194, 91, 91, 0.08)" : launchStatus.type === "success" ? "rgba(95, 155, 108, 0.08)" : "rgba(50, 52, 58, 0.03)", border: `1px solid ${launchStatus.type === "error" ? "rgba(194, 91, 91, 0.2)" : launchStatus.type === "success" ? "rgba(95, 155, 108, 0.2)" : "var(--line)"}`, color: launchStatus.type === "error" ? "var(--error)" : launchStatus.type === "success" ? "var(--success)" : "var(--ink)" }}>
                        {launchStatus.text}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: "80px",
          borderTop: "1px solid var(--line)",
          paddingTop: "48px",
          paddingBottom: "24px",
          color: "var(--ink-soft)",
          fontSize: "0.85rem",
        }}
      >
        <div className="app-footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "40px", marginBottom: "40px", textAlign: "left" }}>
          
          {/* Column 1: Branding & Info */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <img 
                src="/logo.png" 
                alt="HatchAI logo" 
                style={{ 
                  height: "60px", 
                  width: "auto", 
                  objectFit: "contain"
                }} 
              />
            </div>
            <p style={{ color: "var(--ink-soft)", lineHeight: "1.5", fontSize: "0.82rem", marginBottom: "16px" }}>
              Next-generation token launchpad and swap terminal built on X Layer Network, powered by Uniswap V4 Hooks.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "Geist Mono, monospace", background: "rgba(95, 155, 108, 0.08)", color: "var(--success)", padding: "4px 10px", borderRadius: "100px", border: "1px solid rgba(95,155,108,0.18)" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--success)", animation: "pulse 1.5s ease infinite" }}></span>
              {targetChainId === 196 ? "X Layer Mainnet Live" : "X Layer Testnet Live"}
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div>
            <h4 style={{ fontWeight: "700", color: "var(--ink)", marginBottom: "16px", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
              Platform
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
              <li>
                <span style={{ cursor: "pointer", color: "var(--ink-soft)", transition: "color 0.2s" }} className="hover-coral" onClick={() => setView("landing")}>
                  Home Landing
                </span>
              </li>
              <li>
                <span style={{ cursor: "pointer", color: "var(--ink-soft)", transition: "color 0.2s" }} className="hover-coral" onClick={() => { setView("console"); setConsoleTab("portal"); }}>
                  Launch Portal
                </span>
              </li>
              <li>
                <span style={{ cursor: "pointer", color: "var(--ink-soft)", transition: "color 0.2s" }} className="hover-coral" onClick={() => { setView("console"); setConsoleTab("swap"); }}>
                  Swap Terminal
                </span>
              </li>
              <li>
                <span style={{ cursor: "pointer", color: "var(--ink-soft)", transition: "color 0.2s" }} className="hover-coral" onClick={() => { setView("console"); setConsoleTab("launchpad"); }}>
                  Token Launchpad
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Smart Contracts (OKLink) */}
          <div>
            <h4 style={{ fontWeight: "700", color: "var(--ink)", marginBottom: "16px", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
              Smart Contracts
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontFamily: "Geist Mono, monospace", fontSize: "0.78rem" }}>
              {contracts?.hatchHook && (
                <li>
                  <a href={`${explorerUrl}/address/${contracts.hatchHook}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--coral)", textDecoration: "none", fontWeight: "600" }}>
                    HatchHook ↗
                  </a>
                </li>
              )}
              {contracts?.poolManager && (
                <li>
                  <a href={`${explorerUrl}/address/${contracts.poolManager}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
                    PoolManager ↗
                  </a>
                </li>
              )}
              {contracts?.weth && (
                <li>
                  <a href={`${explorerUrl}/address/${contracts.weth}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
                    Mock WETH ↗
                  </a>
                </li>
              )}
              {contracts?.hatchToken && (
                <li>
                  <a href={`${explorerUrl}/address/${contracts.hatchToken}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
                    Mock HATCH ↗
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: System Specs */}
          <div>
            <h4 style={{ fontWeight: "700", color: "var(--ink)", marginBottom: "16px", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
              System Specs
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontFamily: "Geist Mono, monospace", fontSize: "0.78rem" }}>
              <div>
                <span style={{ color: "var(--muted)" }}>Chain ID:</span> 1952
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Tick Spacing:</span> 60
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Fee Decay:</span> Linear
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Uniswap V4:</span> Hook Active
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "20px", fontSize: "0.78rem", color: "var(--muted)", fontFamily: "Geist Mono, monospace", flexWrap: "wrap", gap: "12px" }}>
          <div>
            &copy; {new Date().getFullYear()} HatchAI. Built for Hook the Future Hackathon.
          </div>
          <div>
            Uniswap V4 x {targetChainId === 196 ? "X Layer Mainnet" : "X Layer Testnet"}
          </div>
        </div>
      </footer>

      {/* Transaction Status Modal */}
      {txModal.isOpen && (
        <div className="tx-modal-overlay">
          <div className="tx-modal-content">
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>
              {txModal.title}
            </h3>

            {txModal.status === "pending" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div className="tx-spinner"></div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "break-word" }}>
                  {txModal.message}
                </p>
              </div>
            )}

            {txModal.status === "success" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div className="tx-success-icon">✓</div>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--success)", fontWeight: "600" }}>
                  Transaction Successful!
                </p>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "break-word" }}>
                  {txModal.message}
                </p>
              </div>
            )}

            {txModal.status === "error" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
                <div className="tx-error-icon">✕</div>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--error)", fontWeight: "600" }}>
                  Transaction Failed
                </p>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "break-word" }}>
                  {txModal.message}
                </p>
                {txModal.errorReason && (
                  <div
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      background: "rgba(194, 91, 91, 0.05)",
                      border: "1px solid rgba(194, 91, 91, 0.15)",
                      fontFamily: "Geist Mono, monospace",
                      fontSize: "0.78rem",
                      color: "var(--error)",
                      textAlign: "left",
                      maxHeight: "120px",
                      overflowY: "auto",
                      wordBreak: "break-all"
                    }}
                  >
                    {txModal.errorReason}
                  </div>
                )}
              </div>
            )}

            {(txModal.txHash || pendingTxHash) && (
              <a
                href={`${explorerUrl}/tx/${txModal.txHash || pendingTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.85rem",
                  color: "var(--coral-deep)",
                  fontWeight: "600",
                  textDecoration: "underline",
                  marginTop: "8px"
                }}
              >
                View transaction on Explorer →
              </a>
            )}

            {txModal.status !== "pending" && (
              <button
                onClick={() => setTxModal(prev => ({ ...prev, isOpen: false }))}
                className="btn-neon"
                style={{
                  width: "100%",
                  marginTop: "12px",
                  padding: "10px 24px",
                  fontSize: "0.9rem"
                }}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
