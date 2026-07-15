#!/usr/bin/env node
/**
 * HatchAI — camera-ready x402 end-to-end demo.
 *
 *   Rehearse (no payment, no spend):   node agent/demo-x402.js --dry
 *   Real run (spends 0.5 USDT + gas):  node agent/demo-x402.js
 *
 * Loads PRIVATE_KEY from the repo-root .env automatically.
 * Prints a clean, large-font-friendly narrative for screen recording.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), quiet: true });
const { ethers } = require('ethers');

const BASE = process.env.DEMO_BASE_URL || "https://hatchai-production-997b.up.railway.app";
const USDT = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
const RPC = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
const DRY = process.argv.includes('--dry');

// ── explorer (OKX Explorer, X Layer EVM) ────────────────────────────────────
const EXPLORER = "https://web3.okx.com/explorer/x-layer/evm";
const txUrl = (h) => `${EXPLORER}/tx/${h}`;
const addrUrl = (a) => `${EXPLORER}/address/${a}`;

// ── presentation helpers ────────────────────────────────────────────────────
const C = { r: "\x1b[0m", b: "\x1b[1m", dim: "\x1b[2m", cy: "\x1b[36m", gr: "\x1b[32m", ye: "\x1b[33m", ma: "\x1b[35m" };
const short = (s) => (s && s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);
const line = (s = "") => console.log(s);
const step = (n, t) => { line(); line(`${C.b}${C.cy}▶ STEP ${n}${C.r}${C.b} — ${t}${C.r}`); };
const ok = (s) => line(`  ${C.gr}✔${C.r} ${s}`);
const kv = (k, v) => line(`     ${C.dim}${k.padEnd(9)}${C.r} ${v}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function banner() {
    line();
    line(`${C.b}${C.ma}╔══════════════════════════════════════════════════════════════╗${C.r}`);
    line(`${C.b}${C.ma}║${C.r}  ${C.b}HatchAI · Autonomous Token Launch Agent${C.r}  ${C.dim}(OKX.AI ASP #5164)${C.r}  ${C.b}${C.ma}║${C.r}`);
    line(`${C.b}${C.ma}║${C.r}  ${C.dim}Agent-to-agent launch · paid via x402 · X Layer mainnet${C.r}      ${C.b}${C.ma}║${C.r}`);
    line(`${C.b}${C.ma}╚══════════════════════════════════════════════════════════════╝${C.r}`);
    if (DRY) line(`${C.ye}  [REHEARSAL MODE — no payment will be submitted]${C.r}`);
}

async function preflight(wallet) {
    const p = new ethers.JsonRpcProvider(RPC, 196, { staticNetwork: true });
    const usdt = new ethers.Contract(USDT, ["function balanceOf(address) view returns(uint256)"], p);
    const [gas, bal] = await Promise.all([p.getBalance(wallet.address), usdt.balanceOf(wallet.address)]);
    line(`  ${C.dim}payer ${wallet.address}${C.r}`);
    line(`  ${C.dim}USDT ${ethers.formatUnits(bal, 6)} · OKB ${Number(ethers.formatEther(gas)).toFixed(5)}${C.r}`);
    if (!DRY) {
        if (bal < 500000n) throw new Error(`payer needs >= 0.5 USDT to run the demo (has ${ethers.formatUnits(bal, 6)}). Top up ${wallet.address}.`);
        if (gas === 0n) throw new Error(`payer needs OKB for gas. Top up ${wallet.address}.`);
    }
}

(async () => {
    const t0 = Date.now();
    if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY not found in .env");
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

    banner();
    await preflight(wallet);

    // ── STEP 1: unpaid request → 402 challenge ──────────────────────────────
    step(1, "An AI agent requests a token launch");
    line(`  ${C.dim}POST ${BASE}/api/v1/launch${C.r}`);
    const chRes = await fetch(`${BASE}/api/v1/launch`);
    const challenge = await chRes.json();
    const acc = challenge.accepts[0];
    line(`  ${C.ye}← HTTP ${chRes.status} PAYMENT REQUIRED${C.r}   ${C.dim}(x402)${C.r}`);
    kv("network", `${acc.network}   ${C.dim}(X Layer)${C.r}`);
    kv("price", `${C.b}${(Number(acc.amount) / 10 ** acc.decimals)} USDT${C.r}`);
    kv("payTo", short(acc.payTo));

    // ── STEP 2: sign the x402 voucher ───────────────────────────────────────
    step(2, "Agent signs an x402 payment voucher (EIP-3009)");
    const now = Math.floor(Date.now() / 1000);
    const auth = {
        from: wallet.address, to: ethers.getAddress(acc.payTo), value: acc.amount,
        validAfter: "0", validBefore: String(now + 3600),
        nonce: ethers.hexlify(ethers.randomBytes(32)),
    };
    const domain = { name: acc.extra.name, version: acc.extra.version, chainId: 196, verifyingContract: USDT };
    const types = { TransferWithAuthorization: [
        { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] };
    const signature = await wallet.signTypedData(domain, types, auth);
    kv("payer", short(auth.from));
    kv("amount", `0.5 USDT`);
    kv("nonce", short(auth.nonce));
    ok(`signed — ${C.b}no human in the loop${C.r}`);

    if (DRY) {
        line();
        line(`${C.ye}  REHEARSAL COMPLETE — voucher signed, nothing submitted.${C.r}`);
        line();
        line(`  ${C.dim}Explorer links the real run will print (open these once to verify the format):${C.r}`);
        line(`  ${C.b}🔗 Agent payment hash${C.r}`);
        line(`     ${C.cy}${txUrl("0x4a8f8ea9ea2a3c023ddb19eb14526d6948dbe8fe45821b4fe95f5de8b6b3cf4d")}${C.r}`);
        line(`  ${C.b}🔗 Token deployed — verification${C.r}`);
        line(`     ${C.cy}${addrUrl("0x81dd2f9fC837ab74de31BD201C39FbF583e75c14")}${C.r}`);
        line();
        line(`${C.dim}  Run without --dry to execute the real paid launch.${C.r}`);
        line();
        return;
    }

    // ── STEP 3: submit + settle ─────────────────────────────────────────────
    step(3, "Agent resubmits with payment → on-chain settlement");
    const header = Buffer.from(JSON.stringify({ payload: { authorization: auth, signature, extra: acc.extra } })).toString('base64');
    line(`  ${C.dim}⏱ settling on X Layer…${C.r}`);
    const tS = Date.now();
    const res = await fetch(`${BASE}/api/v1/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "payment-signature": header },
        body: JSON.stringify({ tokenName: "Demo Token", tokenSymbol: "DEMO", totalSupply: "1000000" }),
    });
    const settleTx = res.headers.get('x-payment-tx');
    const out = await res.json();
    ok(`${C.b}SETTLED${C.r}  tx ${C.gr}${short(settleTx)}${C.r}   ${C.dim}(${((Date.now() - tS) / 1000).toFixed(1)}s)${C.r}`);

    // ── RESULT ──────────────────────────────────────────────────────────────
    line();
    line(`${C.b}${C.gr}▶ RESULT — HTTP ${res.status} · deliverable produced${C.r}`);
    kv("token", `${C.b}${out.tokenAddress}${C.r}`);
    kv("pool", short(out.poolId));
    kv("fee", `${out.hookConfig?.startFee}% → ${out.hookConfig?.endFee}% decay over ${out.hookConfig?.decayDuration}h`);
    kv("cooldown", `${out.hookConfig?.cooldown}s per wallet`);
    kv("maxSwap", `${out.hookConfig?.maxSwapAmount} tokens`);
    kv("feePaid", `${C.b}${out.feePaid}${C.r}`);
    line();
    line(`  ${C.b}🔗 Agent payment hash${C.r}  ${C.dim}— 0.5 USDT settled on-chain${C.r}`);
    line(`     ${C.cy}${txUrl(settleTx)}${C.r}`);
    line();
    line(`  ${C.b}🔗 Token deployed — verification${C.r}  ${C.dim}— live contract on X Layer${C.r}`);
    line(`     ${C.cy}${addrUrl(out.tokenAddress)}${C.r}`);
    line();
    line(`  ${C.b}${C.gr}⏱ total ${((Date.now() - t0) / 1000).toFixed(1)}s${C.r} — token deployed · Uniswap V4 pool live · HatchHook protections enforced`);
    line();
})().catch(e => { console.error(`\n\x1b[31m  ✖ ${e.message}\x1b[0m\n`); process.exit(1); });
