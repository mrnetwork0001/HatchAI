import { LaunchParameters } from '../types';

/**
 * Every launch parameter is OPTIONAL. This module turns an arbitrary (possibly empty
 * or partial) request body into a fully-populated, numerically-valid LaunchParameters
 * so the endpoint always has something safe to launch — and never crashes on a missing
 * or non-numeric field (the `BigInt(NaN)` class of 500s).
 */

export const LAUNCH_DEFAULTS = {
    tokenName: "HatchAI Token",
    tokenSymbol: "HATCH",
    totalSupply: "1000000",
    initialLiquidityWeth: "0",
    startFeePercent: 10,
    endFeePercent: 0.3,
    decayDurationHours: 24,
    cooldownSeconds: 30,
    maxSwapAmountTokens: "1000",
} as const;

/** Human-facing description of the request body, surfaced in the 402 challenge + 400 hints. */
export const LAUNCH_INPUT_SCHEMA = {
    description:
        "POST body for /api/v1/launch. ALL fields are optional — omitted fields use safe defaults, "
        + "so a minimal or empty body still deploys a protected token.",
    fields: {
        tokenName: `string — default "${LAUNCH_DEFAULTS.tokenName}"`,
        tokenSymbol: `string — default "${LAUNCH_DEFAULTS.tokenSymbol}"`,
        totalSupply: `integer string (whole tokens) — default "${LAUNCH_DEFAULTS.totalSupply}"`,
        startFeePercent: `number 5–20 — default ${LAUNCH_DEFAULTS.startFeePercent}`,
        endFeePercent: `number 0.01–1 — default ${LAUNCH_DEFAULTS.endFeePercent}`,
        decayDurationHours: `number 1–72 — default ${LAUNCH_DEFAULTS.decayDurationHours}`,
        cooldownSeconds: `number 0–300 — default ${LAUNCH_DEFAULTS.cooldownSeconds}`,
        maxSwapAmountTokens: `number string — default "${LAUNCH_DEFAULTS.maxSwapAmountTokens}"`,
    },
    example: {
        tokenName: "My Token",
        tokenSymbol: "MYT",
        totalSupply: "1000000",
        startFeePercent: 10,
        endFeePercent: 0.3,
        decayDurationHours: 24,
        cooldownSeconds: 30,
        maxSwapAmountTokens: "1000",
    },
} as const;

/** Coerce any value to a finite number, falling back to `def` on NaN/undefined/null/"". */
function num(v: unknown, def: number): number {
    if (v === undefined || v === null || v === "") return def;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : def;
}

/** Coerce to a trimmed non-empty string, else `def`. */
function str(v: unknown, def: string): string {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    return def;
}

/** Coerce to a positive-integer token-count string (strips decimals), else `def`. */
function intString(v: unknown, def: string): string {
    const s = str(v, "");
    const intPart = s.split(".")[0].replace(/[^0-9]/g, "");
    if (intPart === "" || intPart === "0") return def;
    return intPart;
}

/** Coerce to a non-negative decimal-number string, else `def`. */
function numString(v: unknown, def: string): string {
    const n = num(v, NaN);
    return Number.isFinite(n) && n >= 0 ? String(n) : def;
}

export function normalizeLaunchParameters(raw: any): LaunchParameters {
    const body = raw && typeof raw === "object" ? raw : {};
    const d = LAUNCH_DEFAULTS;

    const normalized: LaunchParameters = {
        tokenName: str(body.tokenName, d.tokenName),
        tokenSymbol: str(body.tokenSymbol, d.tokenSymbol),
        totalSupply: intString(body.totalSupply, d.totalSupply),
        initialLiquidityWeth: numString(body.initialLiquidityWeth, d.initialLiquidityWeth),
        startFeePercent: num(body.startFeePercent, d.startFeePercent),
        endFeePercent: num(body.endFeePercent, d.endFeePercent),
        decayDurationHours: num(body.decayDurationHours, d.decayDurationHours),
        cooldownSeconds: num(body.cooldownSeconds, d.cooldownSeconds),
        maxSwapAmountTokens: numString(body.maxSwapAmountTokens, d.maxSwapAmountTokens),
    };

    // Optional pass-through fields (only when explicitly provided and usable).
    if (typeof body.priceRatio === "string" || typeof body.priceRatio === "number") {
        const pr = numString(body.priceRatio, "");
        if (pr) normalized.priceRatio = pr;
    }
    if (typeof body.baseToken === "string" && body.baseToken.trim() !== "") {
        normalized.baseToken = body.baseToken.trim();
    }
    if (body.seedProjectAmount !== undefined) normalized.seedProjectAmount = numString(body.seedProjectAmount, "0");
    if (body.seedWethAmount !== undefined) normalized.seedWethAmount = numString(body.seedWethAmount, "0");

    return normalized;
}
