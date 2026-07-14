import { ethers } from "ethers";
import {
    LAUNCH_FEE_UNITS,
    PAY_TO_ADDRESS,
    USDT_ADDRESS,
    USDT_DECIMALS,
    USDT_EIP712_NAME,
    USDT_EIP712_VERSION,
    XLAYER_MAINNET_CHAIN_ID,
} from "./config";

export interface Eip3009Authorization {
    from: string;
    to: string;
    value: string | number | bigint;
    validAfter: string | number | bigint;
    validBefore: string | number | bigint;
    nonce: string;
}

export interface VerifiedPayment {
    authorization: Eip3009Authorization;
    signature: string;
    /** Address recovered from the EIP-712 signature (guaranteed === authorization.from). */
    signer: string;
}

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
export function verifyPaymentAuthorization(
    auth: Eip3009Authorization,
    signature: string,
    extra?: { name?: string; version?: string },
): VerifiedPayment {
    if (!auth || typeof auth !== "object") {
        throw new Error("Missing payment authorization");
    }
    if (!auth.from || !auth.to || auth.value === undefined || !signature) {
        throw new Error("Incomplete payment authorization");
    }

    // 1. Recipient must be our collection wallet — a signature paying anyone else is worthless to us.
    if (!addressEquals(auth.to, PAY_TO_ADDRESS)) {
        throw new Error(
            `Payment recipient mismatch: expected ${PAY_TO_ADDRESS}, got ${auth.to}`,
        );
    }

    // 2. Amount must cover the launch fee.
    let value: bigint;
    try {
        value = BigInt(auth.value as any);
    } catch {
        throw new Error(`Unparseable payment value: ${auth.value}`);
    }
    const required = BigInt(LAUNCH_FEE_UNITS);
    if (value < required) {
        throw new Error(
            `Insufficient payment: required ${formatUnits(required)} USDT, got ${formatUnits(value)} USDT`,
        );
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
        name: extra?.name || USDT_EIP712_NAME,
        version: extra?.version || USDT_EIP712_VERSION,
        chainId: XLAYER_MAINNET_CHAIN_ID,
        verifyingContract: USDT_ADDRESS,
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

    let recovered: string;
    try {
        recovered = ethers.verifyTypedData(domain, types, message, signature);
    } catch (e: any) {
        throw new Error(`Payment signature is not a valid EIP-712 signature: ${e.message}`);
    }

    if (!addressEquals(recovered, auth.from)) {
        throw new Error(
            `Payment signature does not match sender: signed by ${recovered}, claims ${auth.from}`,
        );
    }

    return { authorization: auth, signature, signer: recovered };
}

function addressEquals(a: string, b: string): boolean {
    try {
        return ethers.getAddress(a) === ethers.getAddress(b);
    } catch {
        return false;
    }
}

function safeBigInt(v: string | number | bigint, fallback: bigint): bigint {
    try {
        return BigInt(v as any);
    } catch {
        return fallback;
    }
}

function formatUnits(units: bigint): string {
    return ethers.formatUnits(units, USDT_DECIMALS);
}

// Isolated so it is the single place that reads wall-clock time.
function nowSeconds(): number {
    return Date.now() / 1000;
}
