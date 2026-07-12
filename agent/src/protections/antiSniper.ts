import { LaunchParameters } from '../types';

/**
 * Validates and refines the anti-sniper protection parameters provided by the user/agent.
 */
export function validateAntiSniperSettings(params: LaunchParameters) {
    console.log(`[AntiSniper] Validating launch parameters for ${params.tokenSymbol}...`);

    let startFee = params.startFeePercent;
    let endFee = params.endFeePercent;
    let decayDuration = params.decayDurationHours;
    let cooldown = params.cooldownSeconds;

    // Enforce reasonable bounds to prevent bricking the pool
    if (startFee < 5 || startFee > 20) {
        console.warn(`[AntiSniper] startFee of ${startFee}% is outside recommended bounds (5-20%). Adjusting to 10%.`);
        startFee = 10;
    }

    if (endFee < 0.01 || endFee > 1) {
        console.warn(`[AntiSniper] endFee of ${endFee}% is outside recommended bounds (0.01-1%). Adjusting to 0.3%.`);
        endFee = 0.3;
    }

    if (decayDuration < 1 || decayDuration > 72) {
        console.warn(`[AntiSniper] decayDuration of ${decayDuration}h is outside recommended bounds (1-72h). Adjusting to 12h.`);
        decayDuration = 12;
    }

    if (cooldown < 0 || cooldown > 300) {
        console.warn(`[AntiSniper] cooldown of ${cooldown}s is outside recommended bounds (0-300s). Adjusting to 10s.`);
        cooldown = 10;
    }

    return {
        ...params,
        startFeePercent: startFee,
        endFeePercent: endFee,
        decayDurationHours: decayDuration,
        cooldownSeconds: cooldown
    };
}
