export interface LaunchParameters {
    tokenName: string;
    tokenSymbol: string;
    totalSupply: string;
    initialLiquidityWeth: string;
    startFeePercent: number; // e.g. 10 for 10%
    endFeePercent: number; // e.g. 0.3 for 0.3%
    decayDurationHours: number; // e.g. 24
    cooldownSeconds: number; // e.g. 30
    maxSwapAmountTokens: string; // e.g. "1000"

    // Optional pool-pricing controls. If omitted, the orchestrator derives a starting
    // price from totalSupply / initialLiquidityWeth.
    priceRatio?: string;   // project tokens per 1 WETH, e.g. "1000"
    baseToken?: string;    // quote token address; defaults to X Layer WETH
    seedProjectAmount?: string; // optional initial liquidity (project side)
    seedWethAmount?: string;    // optional initial liquidity (WETH side)
}

export interface HookConfig {
    poolId: string;
    startFee: number;
    endFee: number;
    decayDuration: number;
    cooldown: number;
    maxSwapAmount: string;
}

export interface LaunchResult {
    status: 'success' | 'failed';
    tokenAddress?: string;
    poolId?: string;
    deployTxHash?: string;      // token deployment tx
    initTxHash?: string;        // PoolManager.initialize tx
    configTxHash?: string;      // HatchHook.initializeLaunchPool tx
    liquidityTxHash?: string;   // optional liquidity seeding tx
    hookConfig?: HookConfig;
    monitoringLink?: string;
    feePaid?: string;
    summary?: string;
    error?: string;
}

export interface A2MCPPaymentHeader {
    'ok-web3-openapi-pay': string; // Standard x402 payment verification header
}
