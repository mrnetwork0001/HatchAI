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
    liquidityTxHash?: string;
    hookConfig?: HookConfig;
    monitoringLink?: string;
    feePaid?: string;
    summary?: string;
    error?: string;
}

export interface A2MCPPaymentHeader {
    'ok-web3-openapi-pay': string; // Standard x402 payment verification header
}
