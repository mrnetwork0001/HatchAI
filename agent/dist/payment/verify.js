"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentAuthorization = verifyPaymentAuthorization;
const ethers_1 = require("ethers");
const config_1 = require("./config");
/**
 * Verifies an x402 "exact" (EIP-3009 transferWithAuthorization) payment voucher against
 * the launch fee terms BEFORE any on-chain settlement is attempted.
 *
 * Rejects the request unless every economic term matches:
 *   - recipient (`to`) is exactly our collection wallet
 *   - `value` covers the required fee
 *   - the authorization window is currently valid (not pre-dated / not expired)
 *   - the EIP-712 signature actually recovers to `from`
 *
 * Throwing here means the caller has NOT paid the correct amount to the correct address,
 * so access must be denied. Returns the verified payment on success.
 */
function verifyPaymentAuthorization(auth, signature, extra) {
    if (!auth || typeof auth !== "object") {
        throw new Error("Missing payment authorization");
    }
    if (!auth.from || !auth.to || auth.value === undefined || !signature) {
        throw new Error("Incomplete payment authorization");
    }
    // 1. Recipient must be our collection wallet — a signature paying anyone else is worthless to us.
    if (!addressEquals(auth.to, config_1.PAY_TO_ADDRESS)) {
        throw new Error(`Payment recipient mismatch: expected ${config_1.PAY_TO_ADDRESS}, got ${auth.to}`);
    }
    // 2. Amount must cover the launch fee.
    let value;
    try {
        value = BigInt(auth.value);
    }
    catch {
        throw new Error(`Unparseable payment value: ${auth.value}`);
    }
    const required = BigInt(config_1.LAUNCH_FEE_UNITS);
    if (value < required) {
        throw new Error(`Insufficient payment: required ${formatUnits(required)} USDT, got ${formatUnits(value)} USDT`);
    }
    // 3. Authorization window must currently be valid.
    const now = BigInt(Math.floor(nowSeconds()));
    const validAfter = safeBigInt(auth.validAfter, 0n);
    const validBefore = safeBigInt(auth.validBefore, 0n);
    if (validAfter > now) {
        throw new Error("Payment authorization is not yet valid (validAfter in the future)");
    }
    if (validBefore !== 0n && validBefore <= now) {
        throw new Error("Payment authorization has expired (validBefore in the past)");
    }
    // 4. Cryptographically recover the signer and confirm it matches `from`.
    const domain = {
        name: extra?.name || config_1.USDT_EIP712_NAME,
        version: extra?.version || config_1.USDT_EIP712_VERSION,
        chainId: config_1.XLAYER_MAINNET_CHAIN_ID,
        verifyingContract: config_1.USDT_ADDRESS,
    };
    const types = {
        TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    };
    const message = {
        from: auth.from,
        to: auth.to,
        value: value.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: auth.nonce,
    };
    let recovered;
    try {
        recovered = ethers_1.ethers.verifyTypedData(domain, types, message, signature);
    }
    catch (e) {
        throw new Error(`Payment signature is not a valid EIP-712 signature: ${e.message}`);
    }
    if (!addressEquals(recovered, auth.from)) {
        throw new Error(`Payment signature does not match sender: signed by ${recovered}, claims ${auth.from}`);
    }
    return { authorization: auth, signature, signer: recovered };
}
function addressEquals(a, b) {
    try {
        return ethers_1.ethers.getAddress(a) === ethers_1.ethers.getAddress(b);
    }
    catch {
        return false;
    }
}
function safeBigInt(v, fallback) {
    try {
        return BigInt(v);
    }
    catch {
        return fallback;
    }
}
function formatUnits(units) {
    return ethers_1.ethers.formatUnits(units, config_1.USDT_DECIMALS);
}
// Isolated so it is the single place that reads wall-clock time.
function nowSeconds() {
    return Date.now() / 1000;
}
