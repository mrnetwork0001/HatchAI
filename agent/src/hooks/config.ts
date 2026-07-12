import { LaunchParameters, HookConfig } from '../types';

/**
 * Translates raw launch parameters into the structured HookConfig required by HatchHook.
 */
export function buildHookConfig(poolId: string, params: LaunchParameters): HookConfig {
    console.log(`[HookConfig] Building configuration for Pool ID: ${poolId}`);

    // Assuming the HatchHook contract expects fee values represented in bips or scaled
    // We will just pass them through as raw for this MVP.
    return {
        poolId,
        startFee: params.startFeePercent,
        endFee: params.endFeePercent,
        decayDuration: params.decayDurationHours,
        cooldown: params.cooldownSeconds,
        maxSwapAmount: params.maxSwapAmountTokens
    };
}
