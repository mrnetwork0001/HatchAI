"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHookConfig = buildHookConfig;
/**
 * Translates raw launch parameters into the structured HookConfig required by HatchHook.
 */
function buildHookConfig(poolId, params) {
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
