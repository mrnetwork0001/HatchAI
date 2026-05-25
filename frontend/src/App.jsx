import React, { useState, useEffect, useRef } from "react";
import { useWallet } from "./WalletContext";
import deployments from "./deployments.json";

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
    pendingTxHash,
    isTxPending,
    isDeployed,
    explorerUrl,
    connect,
    disconnect,
    initializePool,
    resetToDefaultPool,
    selectPool,
    isCustomPoolActive,
    projectTokenDetails,
    customPools,
  } = useWallet();

  const [view, setView] = useState("landing"); // 'landing' | 'console'
  const [consoleTab, setConsoleTab] = useState("portal"); // 'portal' | 'swap' | 'launchpad'
  const [swapAmount, setSwapAmount] = useState("0.1");
  const [statusMsg, setStatusMsg] = useState(null); // { text, type }
  const terminalEndRef = useRef(null);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Cyclic hero flow state
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

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
  const [launchBaseAddress, setLaunchBaseAddress] = useState(deployments.contracts.weth || "");
  const [launchPriceRatio, setLaunchPriceRatio] = useState("10");
  const [launchDecayHours, setLaunchDecayHours] = useState("24");
  const [launchStartFee, setLaunchStartFee] = useState("10");
  const [launchEndFee, setLaunchEndFee] = useState("0.3");
  const [launchMaxSwap, setLaunchMaxSwap] = useState("1000");
  const [launchCooldown, setLaunchCooldown] = useState("60");
  const [launchStatus, setLaunchStatus] = useState(null); // { text, type }

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  const handleSwap = async (e) => {
    e.preventDefault();
    setStatusMsg({ text: "Submitting swap transaction…", type: "pending" });
    const res = await executeSwap(swapAmount);
    if (res.success) {
      setStatusMsg({
        text: `Swap submitted! Tx: ${res.txHash?.slice(0, 10)}…`,
        type: "success",
      });
    } else {
      setStatusMsg({ text: res.reason || "Swap failed.", type: "error" });
    }
  };

  const handleClaim = async () => {
    setStatusMsg({ text: "Submitting claimFees transaction…", type: "pending" });
    const res = await claimRoyalties();
    if (res.success) {
      setStatusMsg({
        text: `Claim submitted! Tx: ${res.txHash?.slice(0, 10)}…`,
        type: "success",
      });
    } else {
      setStatusMsg({ text: res.reason || "Claim failed.", type: "error" });
    }
  };

  const handleLaunchPool = async (e) => {
    e.preventDefault();
    if (!launchTokenAddress.startsWith("0x") || launchTokenAddress.length !== 42) {
      setLaunchStatus({ text: "Please enter a valid Project Token Address.", type: "error" });
      return;
    }
    setLaunchStatus({ text: "Submitting initializePool transaction...", type: "pending" });
    
    const res = await initializePool({
      projectToken: launchTokenAddress,
      baseToken: launchBaseAddress,
      priceRatio: launchPriceRatio,
      decayDurationHours: launchDecayHours,
      startFeePercent: launchStartFee,
      endFeePercent: launchEndFee,
      maxSwapAmountTokens: launchMaxSwap,
      cooldownSeconds: launchCooldown
    });

    if (res.success) {
      setLaunchStatus({
        text: `Pool Initialized! Custom pool ID: ${res.poolId.slice(0, 14)}...`,
        type: "success"
      });
      setTimeout(() => {
        setConsoleTab("swap");
      }, 2000);
    } else {
      setLaunchStatus({ text: res.reason || "Launch failed.", type: "error" });
    }
  };

  // Decay chart math
  const progressRatio = Math.min(timeElapsed / (decayDuration * 1000), 1);
  const remainingHours = Math.max(decayDuration / 3600 - timeElapsed / (3600 * 1000), 0);

  const chartWidth = 500;
  const chartHeight = 150;
  const padding = 20;

  const mapY = (fee) => {
    const minVal = padding;
    const maxVal = chartHeight - padding;
    return maxVal - ((fee / (startFee / 1_000_000)) * (maxVal - minVal));
  };

  const startFeeDecimal = startFee / 1_000_000;
  const endFeeDecimal = endFee / 1_000_000;

  const startX = padding;
  const endX = chartWidth - padding;
  const startY = mapY(startFeeDecimal);
  const endY = mapY(endFeeDecimal);
  const currentX = startX + progressRatio * (endX - startX);
  const currentY = mapY(currentFeeRate);
  // Combine custom user pools from context
  const userPools = (customPools || []).map((p) => ({
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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          borderBottom: "1px solid var(--line)",
          paddingBottom: "20px",
        }}
      >
        <div style={{ cursor: "pointer" }} onClick={() => setView("landing")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img 
              src="/logo.png" 
              alt="HatchAI logo" 
              style={{ 
                width: "36px", 
                height: "36px", 
                borderRadius: "50%", 
                objectFit: "cover", 
                border: "1.5px solid var(--ink)",
                boxShadow: "0 2px 8px rgba(210, 130, 90, 0.15)"
              }} 
            />
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: "800",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              <span>h<span style={{ color: "var(--coral)" }}>a</span>tchAI</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  verticalAlign: "middle",
                  padding: "3px 10px",
                  borderRadius: "100px",
                  background: "rgba(210, 130, 90, 0.08)",
                  color: "var(--coral-deep)",
                  fontWeight: "600",
                  border: "1px solid rgba(210, 130, 90, 0.18)",
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                v4 Hook
              </span>
            </h1>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(50, 52, 58, 0.03)",
                  border: "1px solid var(--line)",
                  padding: "6px 14px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: isConnected && isOnCorrectChain ? "var(--success)" : "var(--error)",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                <span>{isConnected && isOnCorrectChain ? "X Layer Testnet" : "X Layer Testnet (ID: 1952)"}</span>
              </div>

              {/* Custom Connect Button */}
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
      </header>

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
          <span style={{ color: "var(--error)", fontWeight: "600", fontSize: "14px" }}>
            ⚠️ Wrong network! Please switch to X Layer Testnet (Chain ID: 1952)
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
          <strong>⚙️ Contracts not yet deployed.</strong> Run{" "}
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
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "80px", alignItems: "center", padding: "40px 0 60px 0" }}>
            
            {/* Left Column */}
            <div>
              <div className="status-badge">
                <span className="dot"></span>
                <span>Live on testnet</span>
              </div>

              <h1 style={{ fontWeight: "800", fontSize: "clamp(42px, 7vw, 76px)", lineHeight: "1.05", letterSpacing: "-0.035em", marginBottom: "28px", color: "var(--ink)" }}>
                Launch pools <br />
                the <span className="serif" style={{ minWidth: "150px", display: "inline-block" }}>{currentText}</span>
                <span className="typewriter-cursor">|</span> way
              </h1>

              <p style={{ fontSize: "17px", lineHeight: "1.6", color: "var(--ink-soft)", maxWidth: "520px", marginBottom: "36px" }}>
                HatchAI is the first Uniswap v4 Hook-powered safe-launch pad on X Layer. Protect your token launches in seconds - dynamic taxes, whale caps, and instant onchain fee recycling.
              </p>

              <div className="flow">
                <div className={`flow-item ${activeStep === 0 ? "active" : ""}`}>your token</div>
                <span className={`flow-arrow ${activeStep === 1 ? "active" : ""}`}>→</span>
                <div className={`flow-item ${activeStep === 1 ? "active" : ""}`}>hook protection</div>
                <span className={`flow-arrow ${activeStep === 2 ? "active" : ""}`}>→</span>
                <div className={`flow-item ${activeStep === 2 ? "active" : ""}`}>live trading</div>
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

            {/* Right Column with Animated Hatching Egg */}
            <div style={{ position: "relative", aspectRatio: "1", maxWidth: "450px", width: "100%", marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Common SVG defs for shell gradients */}
              <svg style={{ position: "absolute", width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="eggGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFFDFC" />
                    <stop offset="100%" stopColor="#EFECE6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Outer Orbiting Rings */}
              <div className="ring"></div>
              <div className="ring" style={{ transform: "rotate(45deg)", animationDuration: "30s", borderStyle: "solid", opacity: 0.05 }}></div>
              <div className="ring" style={{ transform: "rotate(-45deg)", animationDuration: "60s", opacity: 0.08 }}></div>
              
              <div className="egg-container">
                <div className="egg-glow"></div>
                
                <div className="egg-interactive-wrapper">
                  {/* Glowing Seam Sealer when closed */}
                  <div className="egg-seam-glow">
                    <svg viewBox="0 0 100 140">
                      <path d="M 17,78 L 33,86 L 50,78 L 67,86 L 83,78" />
                    </svg>
                  </div>

                  {/* Inner AI Hatching Core */}
                  <div className="egg-core">
                    <div className="egg-core-glow"></div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 10 }}>
                      <span className="egg-emoji" style={{ fontSize: "2.8rem", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))" }}>🐣</span>
                      <div className="core-badge">
                        HATCH
                      </div>
                    </div>
                  </div>

                  {/* Top Shell */}
                  <div className="egg-shell shell-top">
                    <svg viewBox="0 0 100 140">
                      <path 
                        d="M 50,15 C 27,15 17,55 17,78 L 33,86 L 50,78 L 67,86 L 83,78 C 83,55 73,15 50,15 Z" 
                        fill="url(#eggGrad)" 
                        stroke="var(--ink)" 
                        strokeWidth="2.5" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Bottom Shell */}
                  <div className="egg-shell shell-bottom">
                    <svg viewBox="0 0 100 140">
                      <path 
                        d="M 17,78 C 17,105 30,125 50,125 C 70,125 83,105 83,78 L 67,86 L 50,78 L 33,86 Z" 
                        fill="url(#eggGrad)" 
                        stroke="var(--ink)" 
                        strokeWidth="2.5" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Floating Particles */}
                <div className="egg-particles">
                  <span className="particle p1"></span>
                  <span className="particle p2"></span>
                  <span className="particle p3"></span>
                  <span className="particle p4"></span>
                </div>
              </div>
            </div>
            
          </div>

          {/* Stats Ribbon */}
          <div className="stats-ribbon">
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">$1,420,500+</div>
              <div className="stat-ribbon-label">Volume Protected</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">18</div>
              <div className="stat-ribbon-label">Safe Pools Active</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">24.8 WETH</div>
              <div className="stat-ribbon-label">Creator Royalties</div>
            </div>
            <div className="stat-ribbon-item">
              <div className="stat-ribbon-value">1.25M+</div>
              <div className="stat-ribbon-label">Tokens Burned</div>
            </div>
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
                <div className="feature-icon">🛡️</div>
                <div className="feature-info">
                  <h4 className="feature-title">Anti-Whale Swap Caps</h4>
                  <p className="feature-desc">
                    Limits individual swap sizes during the launch phase, preventing any single entity from buying up and monopolizing the token supply.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⏱️</div>
                <div className="feature-info">
                  <h4 className="feature-title">Wallet Cooldown Timers</h4>
                  <p className="feature-desc">
                    Blocks rapid-fire transactions from the same wallet in consecutive blocks, effectively disabling high-speed arbitrage and sniper bots.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📈</div>
                <div className="feature-info">
                  <h4 className="feature-title">Dynamic Onchain Decay</h4>
                  <p className="feature-desc">
                    Uniswap V4 hook dynamically calculates swap fees based on the time elapsed since launch, decaying fees gracefully without manual intervention.
                  </p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
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
                  HatchAI is a secure launchpad and swap terminal built with Uniswap V4 Hooks on X Layer Testnet. It helps project developers launch liquidity pools containing automated defenses such as swap size caps, trade cooldowns, and dynamically decaying launch taxes.
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
                  Simply connect your MetaMask or other Web3 wallet to X Layer Testnet (Chain ID 1952) using our top bar. You can swap WETH for project tokens in the Swap Terminal, monitor the decaying fees in real-time, or launch your own token sale under the Token Launchpad tab.
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
              style={{ padding: "8px 24px" }}
            >
              🚀 Launch Portal
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

          {/* Active Pool Reset Info */}
          {isCustomPoolActive && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(210, 130, 90, 0.05)",
                border: "1px solid rgba(210, 130, 90, 0.2)",
                borderRadius: "100px",
                padding: "8px 20px",
                marginBottom: "24px",
                fontSize: "0.85rem",
                color: "var(--ink-soft)"
              }}
            >
              <span>
                ℹ️ Currently viewing custom pool for token: <strong>{projectTokenDetails.symbol}</strong> ({projectTokenDetails.projectTokenAddress.slice(0, 10)}...{projectTokenDetails.projectTokenAddress.slice(-6)})
              </span>
              <button
                onClick={resetToDefaultPool}
                className="btn-outline"
                style={{ padding: "4px 14px", fontSize: "0.75rem" }}
              >
                Reset to default HATCH
              </button>
            </div>
          )}

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
              {isDeployed && (
                <a
                  href={`${explorerUrl}/address/${deployments.contracts.hatchHook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.85rem", color: "var(--coral)", marginLeft: "auto", textDecoration: "none", fontWeight: "600" }}
                >
                  🔍 HatchHook on OKLink →
                </a>
              )}
            </div>
          )}

          {/* TAB 3: POOL PORTAL */}
          {consoleTab === "portal" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "fadeIn 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--ink)", marginBottom: "6px" }}>
                    🚀 Hatch Pool Portal
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
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--coral-deep)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  🟢 Live Protection Pools ({1 + userPools.length + 1})
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "24px" }}>
                  
                  {/* Real Default HATCH Pool */}
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

                  {/* Custom User Pools (Real Onchain) */}
                  {userPools.map((pool, idx) => (
                    <div className="glass-card" key={idx} style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "280px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <div>
                            <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>{pool.symbol}</h4>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Custom Token Sale</span>
                          </div>
                          <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(210, 130, 90, 0.08)", color: "var(--coral-deep)", border: "1px solid rgba(210,130,90,0.18)", fontWeight: "600" }}>
                            🟢 LIVE PROTECTION
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
                  <div className="glass-card" style={{ padding: "24px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "280px", opacity: 0.9 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <h4 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ink)" }}>OKXAI</h4>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>OKX Artificial Intelligence</span>
                        </div>
                        <span style={{ fontSize: "10px", padding: "4px 10px", borderRadius: "100px", background: "rgba(95, 155, 108, 0.08)", color: "var(--success)", border: "1px solid rgba(95,155,108,0.18)", fontWeight: "600" }}>
                          🟢 FEATURED DEMO
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

                </div>
              </div>

              {/* Section 2: Upcoming Launches */}
              <div style={{ marginTop: "12px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  🕒 Upcoming Protected Launches (2)
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
                      Locked 🔒
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
                      Locked 🔒
                    </button>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SWAP CONSOLE */}
          {consoleTab === "swap" && (
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
                    {poolReserves.weth.toLocaleString(undefined, { maximumFractionDigits: 2 })} WETH
                  </div>
                </div>

                <div className="stat-box">
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "600" }}>
                    {projectTokenDetails.symbol} Pool Reserve
                  </div>
                  <div className="stat-value">
                    {poolReserves.hatch.toLocaleString(undefined, { maximumFractionDigits: 0 })} {projectTokenDetails.symbol}
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
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔗</div>
                      <p style={{ color: "var(--color-text-secondary)", marginBottom: "16px", fontSize: "0.9rem" }}>
                        Connect your wallet to start swapping on X Layer Testnet
                      </p>
                      <button onClick={connect} className="btn-neon" style={{ width: "100%" }}>
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleSwap}>
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                            Swap WETH → {projectTokenDetails.symbol}
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
                              min="0.001"
                            />
                            <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", fontWeight: "600", color: "var(--color-text-secondary)" }}>
                              WETH
                            </span>
                          </div>
                          <div style={{ marginTop: "4px", fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                            Balance: {wethBalance} WETH
                          </div>
                        </div>

                        <button
                          id="swap-submit-btn"
                          type="submit"
                          className="btn-neon"
                          style={{ width: "100%" }}
                          disabled={isTxPending || !isOnCorrectChain}
                        >
                          {isTxPending ? "⏳ Confirming…" : `Swap WETH → ${projectTokenDetails.symbol}`}
                        </button>
                      </form>

                      {pendingTxHash && (
                        <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.3)", border: "1px solid var(--line)", fontSize: "0.8rem" }}>
                          <a href={`${explorerUrl}/tx/${pendingTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--coral)", fontWeight: "600", textDecoration: "none" }}>
                            🔍 View tx on OKLink →
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
                        Fee declines from {(startFeeDecimal * 100).toFixed(0)}% to {(endFeeDecimal * 100).toFixed(1)}% over {decayDuration / 3600}h. Anti-whale &amp; cooldown active during launch phase.
                      </p>
                    </div>
                    <div style={{ padding: "6px 12px", borderRadius: "20px", background: "rgba(95,155,108,0.08)", border: "1px solid rgba(95,155,108,0.18)", fontSize: "0.75rem", color: "var(--success)", fontWeight: "600", whiteSpace: "nowrap" }}>
                      🟢 LIVE ONCHAIN
                    </div>
                  </div>

                  {/* SVG Decay Chart */}
                  <div style={{ textAlign: "center", position: "relative" }}>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: "100%", height: "auto" }}>
                      <line x1={startX} y1={startY} x2={endX} y2={startY} stroke="rgba(0,0,0,0.03)" strokeDasharray="3" />
                      <line x1={startX} y1={endY} x2={endX} y2={endY} stroke="rgba(0,0,0,0.03)" strokeDasharray="3" />
                      <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="url(#decayGrad)" strokeWidth="3" />
                      <line x1={startX} y1={startY} x2={currentX} y2={currentY} stroke="var(--coral)" strokeWidth="4" />
                      <circle cx={currentX} cy={currentY} r="7" fill="var(--coral)" filter="url(#glow)" />
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
                      <span>Launch ({(startFeeDecimal * 100).toFixed(0)}% Fee)</span>
                      <span>12h (~{((startFeeDecimal + endFeeDecimal)/2 * 100).toFixed(1)}% Fee)</span>
                      <span>24h ({(endFeeDecimal * 100).toFixed(1)}% Fee)</span>
                    </div>
                  </div>

                  {/* Rule Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "16px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "10px", padding: "12px" }}>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                        Time Remaining
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: isProtectionActive ? "var(--ink)" : "var(--success)" }}>
                        {isProtectionActive ? `${remainingHours.toFixed(1)}h` : "Completed"}
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
                
                {/* Payout & Buyback Card */}
                <div className="glass-card" style={{ gridColumn: "span 6", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: "700", color: "var(--ink)", marginBottom: "4px" }}>
                      3. Payout &amp; Deflationary Buyback
                    </h2>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "16px" }}>
                      Harvest accumulated WETH swap fees. Splitting is executed onchain by HatchHook.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                      <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Total Creator Payout</span>
                        <div style={{ fontSize: "1.3rem", fontWeight: "700", marginTop: "4px", color: "var(--success)" }}>
                          {totalCreatorFeesClaimed} WETH
                        </div>
                      </div>

                      <div style={{ padding: "12px", background: "rgba(255,255,255,0.2)", border: "1px solid var(--line)", borderRadius: "8px" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Total {projectTokenDetails.symbol} Burned</span>
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

                  <button
                    id="claim-fees-btn"
                    onClick={handleClaim}
                    disabled={accumulatedFees <= 0 || !isConnected || isTxPending || !isOnCorrectChain}
                    className="btn-neon"
                    style={{ width: "100%" }}
                  >
                    {isTxPending ? "⏳ Confirming…" : "Claim Creator Yield & Trigger Buyback-Burn"}
                  </button>
                </div>

                {/* Blockchain Console */}
                <div style={{ gridColumn: "span 6" }}>
                  <div className="terminal-panel">
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
                          <span style={{ color: "#fff" }}>Connect wallet to X Layer Testnet to start interacting.</span>
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
                      <div ref={terminalEndRef} />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPER LAUNCHPAD */}
          {consoleTab === "launchpad" && (
            <div className="glass-card" style={{ padding: "32px", maxWidth: "800px", margin: "0 auto" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--ink)", marginBottom: "8px" }}>
                🥚 Launch a Protected Token Sale
              </h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem", marginBottom: "24px", lineHeight: "1.5" }}>
                Initialize a custom Uniswap v4 pool registered with HatchHook. Input your ERC20 project token and define your bot-protection and decay-tax parameters.
              </p>

              {!isConnected ? (
                <div style={{ textAlign: "center", padding: "40px", border: "1px dashed var(--line)", borderRadius: "12px" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔗</div>
                  <p style={{ color: "var(--color-text-secondary)", marginBottom: "16px" }}>
                    Connect your wallet to launch a pool on X Layer Testnet
                  </p>
                  <button onClick={connect} className="btn-neon" style={{ padding: "10px 24px" }}>
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLaunchPool} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  
                  {/* Token Address */}
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
                      Project Token Contract Address (ERC20)
                    </label>
                    <input
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
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
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
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
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

                  {/* Start Fee */}
                  <div>
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
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
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
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

                  {/* Decay Duration */}
                  <div>
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
                      Tax Decay Duration (Hours)
                    </label>
                    <input
                      type="number"
                      className="glass-input"
                      style={{ borderRadius: "8px" }}
                      value={launchDecayHours}
                      onChange={(e) => setLaunchDecayHours(e.target.value)}
                      min="1"
                      max="168"
                      required
                    />
                  </div>

                  {/* Cooldown */}
                  <div>
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
                      Wallet Trade Cooldown (Seconds)
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
                    <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: "0.85rem", marginBottom: "6px", fontWeight: "600" }}>
                      Anti-Whale Max Swap Cap (Tokens)
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
                      {isTxPending ? "⏳ Initializing pool onchain..." : "🚀 Initialize Launch Pool"}
                    </button>
                  </div>
                </form>
              )}

              {launchStatus && (
                <div style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "8px", fontSize: "0.88rem", background: launchStatus.type === "error" ? "rgba(194, 91, 91, 0.08)" : launchStatus.type === "success" ? "rgba(95, 155, 108, 0.08)" : "rgba(50, 52, 58, 0.03)", border: `1px solid ${launchStatus.type === "error" ? "rgba(194, 91, 91, 0.2)" : launchStatus.type === "success" ? "rgba(95, 155, 108, 0.2)" : "var(--line)"}`, color: launchStatus.type === "error" ? "var(--error)" : launchStatus.type === "success" ? "var(--success)" : "var(--ink)" }}>
                  {launchStatus.text}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--line)",
          paddingTop: "24px",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: "0.8rem",
          fontFamily: "Geist Mono, monospace",
        }}
      >
        <p>
          HatchAI - Hook the Future Hackathon Submission |{" "}
          <a
            href={`${explorerUrl}/address/${deployments.contracts.hatchHook}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--coral)", textDecoration: "none", fontWeight: "600" }}
          >
            HatchHook on OKLink
          </a>{" "}
          | Uniswap V4 Hook on X Layer Testnet
        </p>
      </footer>
    </div>
  );
}
