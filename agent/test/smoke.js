// Integration smoke test for /api/v1/launch input handling.
// Guards the exact failures OKX reported: HTTP 400 "Missing required token parameters"
// and HTTP 500 "NaN cannot be converted to a BigInt". Asserts that any body — empty,
// partial, or garbage — normalizes to valid params that flow through the orchestrator's
// numeric conversions without throwing.
//
// Run: npm test  (builds first, then executes this)

const { ethers } = require('ethers');
const { normalizeLaunchParameters, LAUNCH_DEFAULTS } = require('../dist/launch/params');
const { validateAntiSniperSettings } = require('../dist/protections/antiSniper');

let failures = 0;
function check(name, fn) {
    try { fn(); console.log(`  ✅ ${name}`); }
    catch (e) { failures++; console.error(`  ❌ ${name}: ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Reproduce the numeric conversions executeLaunch() performs, so we prove none of them
// throw (this is exactly where "BigInt(NaN)" used to crash).
function convertsWithoutThrowing(p) {
    const s = validateAntiSniperSettings(p);
    BigInt((s.totalSupply || "").trim().split('.')[0] || "0");
    BigInt(Math.floor(s.decayDurationHours * 3600));
    Math.floor(s.startFeePercent * 10000);
    Math.floor(s.endFeePercent * 10000);
    ethers.parseEther(s.maxSwapAmountTokens || "0");
    BigInt(s.cooldownSeconds);
    const ratio = parseFloat(s.priceRatio || "") || (parseFloat(s.totalSupply) / parseFloat(s.initialLiquidityWeth || "0")) || 1000;
    const price = 1 / ratio;
    BigInt(Math.floor(Math.sqrt(price) * 79228162514264337593543950336));
}

// Adversarial bodies — the classes OKX's client sent (and worse).
const cases = {
    "empty object {}": {},
    "undefined body": undefined,
    "null body": null,
    "only tokenName": { tokenName: "Solo" },
    "token params, no numerics": { tokenName: "T", tokenSymbol: "T", totalSupply: "1000000" },
    "numeric fields as junk strings": { startFeePercent: "abc", endFeePercent: "x", decayDurationHours: "NaN", cooldownSeconds: "-", totalSupply: "notanumber", maxSwapAmountTokens: "" },
    "nulls everywhere": { tokenName: null, tokenSymbol: null, totalSupply: null, startFeePercent: null, decayDurationHours: null, cooldownSeconds: null, maxSwapAmountTokens: null },
    "decimal supply": { totalSupply: "1000000.75" },
    "negative / out-of-range numerics": { startFeePercent: -5, endFeePercent: 99, decayDurationHours: 9999, cooldownSeconds: -10 },
    "fully valid body": { tokenName: "Good", tokenSymbol: "GD", totalSupply: "500000", startFeePercent: 12, endFeePercent: 0.5, decayDurationHours: 6, cooldownSeconds: 45, maxSwapAmountTokens: "2000" },
};

console.log("smoke: /api/v1/launch input normalization");
for (const [name, body] of Object.entries(cases)) {
    check(name, () => {
        const p = normalizeLaunchParameters(body);
        // Every numeric field must be finite (this is what prevents BigInt(NaN)).
        for (const f of ["startFeePercent", "endFeePercent", "decayDurationHours", "cooldownSeconds"]) {
            assert(Number.isFinite(p[f]), `${f} not finite: ${p[f]}`);
        }
        // String fields must be non-empty.
        for (const f of ["tokenName", "tokenSymbol", "totalSupply", "maxSwapAmountTokens", "initialLiquidityWeth"]) {
            assert(typeof p[f] === "string" && p[f] !== "", `${f} empty`);
        }
        // totalSupply must be a positive integer string.
        assert(/^[1-9][0-9]*$/.test(p.totalSupply), `totalSupply not a positive int: ${p.totalSupply}`);
        // And the full downstream numeric pipeline must not throw.
        convertsWithoutThrowing(p);
    });
}

// Defaults sanity.
check("empty body applies documented defaults", () => {
    const p = normalizeLaunchParameters({});
    assert(p.tokenName === LAUNCH_DEFAULTS.tokenName, "tokenName default");
    assert(p.tokenSymbol === LAUNCH_DEFAULTS.tokenSymbol, "tokenSymbol default");
    assert(p.totalSupply === LAUNCH_DEFAULTS.totalSupply, "totalSupply default");
});

if (failures) { console.error(`\nFAILED: ${failures} check(s)`); process.exit(1); }
console.log("\nAll smoke checks passed ✅");
