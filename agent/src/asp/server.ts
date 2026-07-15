import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SafeLaunchOrchestrator } from '../launch/orchestrator';
import { LaunchParameters } from '../types';
import { normalizeLaunchParameters, LAUNCH_INPUT_SCHEMA } from '../launch/params';
import { ethers } from 'ethers';
import { executeOnChainSettlement } from '../launch/settler';
import { verifyPaymentAuthorization } from '../payment/verify';
import {
    LAUNCH_FEE_UNITS,
    NETWORK_NAME,
    PAY_TO_ADDRESS,
    RESOURCE_ID,
    USDT_ADDRESS,
    USDT_DECIMALS,
    USDT_EIP712_NAME,
    USDT_EIP712_VERSION,
    launchFeeHuman,
} from '../payment/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const orchestrator = new SafeLaunchOrchestrator();

// The fixed fee for the A2MCP service, derived from the canonical payment config.
const LAUNCH_FEE = launchFeeHuman();

// Opt-in escape hatch for local testing ONLY. When unset (the default, and always in
// production) a signed-but-unsettled voucher can NOT buy access.
const ALLOW_SIMULATED_PAYMENTS = process.env.ALLOW_SIMULATED_PAYMENTS === 'true';

function buildPaymentChallenge(): string {
    return JSON.stringify({
        x402Version: "2.0",
        resource: RESOURCE_ID,
        accepts: [
            {
                network: NETWORK_NAME,
                scheme: "exact",
                asset: USDT_ADDRESS.toLowerCase(),
                amount: LAUNCH_FEE_UNITS,
                decimals: USDT_DECIMALS,
                payTo: PAY_TO_ADDRESS,
                extra: {
                    name: USDT_EIP712_NAME,
                    version: USDT_EIP712_VERSION,
                },
            },
        ],
        // Accepted-fields hint so buyers know what to send (all optional; defaults applied).
        input: LAUNCH_INPUT_SCHEMA,
    });
}

// Payment Middleware (x402 protocol)
const requireAgentPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Check for the x402 payment header (v1 or v2). We deliberately do NOT read the
    // generic `authorization` header — a bearer token there is not an x402 voucher.
    const rawHeader = req.headers['ok-web3-openapi-pay']
        || req.headers['payment-signature']
        || req.headers['x-payment'];
    const paymentHeader = Array.isArray(rawHeader) ? rawHeader[0] : (rawHeader as string | undefined);

    if (!paymentHeader) {
        // Issue the HTTP 402 payment challenge.
        const paymentPayload = buildPaymentChallenge();
        const base64Payload = Buffer.from(paymentPayload).toString('base64');
        res.setHeader('PAYMENT-REQUIRED', base64Payload);
        res.setHeader('X-PAYMENT-REQUIRED', base64Payload); // Fallback for some clients
        res.status(402).json(JSON.parse(paymentPayload));
        return;
    }

    // 2. Parse the voucher.
    let payload: any;
    try {
        payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
    } catch (e: any) {
        console.error("[A2MCP] ❌ Malformed payment header:", e.message);
        res.status(400).json({ error: "Malformed payment header (expected base64-encoded JSON)" });
        return;
    }

    // 3. EIP-3009 "exact" scheme — verify terms, THEN settle on-chain.
    if (payload?.payload?.authorization && payload?.payload?.signature) {
        const auth = payload.payload.authorization;
        const sig = payload.payload.signature;

        // 3a. Verify the voucher pays the correct amount to the correct address and is
        // signed by `from` — BEFORE we broadcast anything. Rejects underpayment,
        // wrong-recipient, and expired/forged vouchers up front.
        try {
            verifyPaymentAuthorization(auth, sig, payload.payload.extra || payload.extra);
            console.log(`[A2MCP] 🔐 Verified x402 voucher: ${LAUNCH_FEE} from ${auth.from} → ${auth.to}`);
        } catch (err: any) {
            console.error("[A2MCP] ❌ Payment terms rejected:", err.message);
            res.status(402).json({ error: `Payment rejected: ${err.message}` });
            return;
        }

        // 3b. Settle on-chain and wait for confirmation. Only a confirmed transfer
        // grants access.
        try {
            const txHash = await executeOnChainSettlement(auth, sig);
            console.log(`[A2MCP] 💰 On-chain settlement confirmed! Tx: ${txHash}`);
            res.setHeader('X-PAYMENT-TX', txHash);
            (req as any).paymentTxHash = txHash;
            next();
        } catch (err: any) {
            console.error("[A2MCP] ❌ On-chain settlement failed:", err.message);
            res.status(402).json({ error: "On-chain settlement failed" });
        }
        return;
    }

    // 4. Simulation fallback (raw signed voucher, no on-chain settlement). Disabled unless
    // ALLOW_SIMULATED_PAYMENTS=true — never in production.
    if (payload?.voucher && payload?.signature) {
        if (!ALLOW_SIMULATED_PAYMENTS) {
            console.error("[A2MCP] ❌ Simulated voucher rejected (ALLOW_SIMULATED_PAYMENTS not set).");
            res.status(402).json({ error: "Simulated payments are not accepted on this server" });
            return;
        }
        try {
            const recoveredAddress = ethers.verifyMessage(payload.voucher, payload.signature);
            console.log(`[A2MCP] 🧪 (Simulated) Payment voucher verified from: ${recoveredAddress}`);
            next();
        } catch (e: any) {
            console.error("[A2MCP] ❌ Simulated voucher signature invalid:", e.message);
            res.status(403).json({ error: "Invalid payment signature" });
        }
        return;
    }

    console.error("[A2MCP] ❌ Unrecognized x402 payload structure.");
    res.status(400).json({ error: "Invalid x402 payload structure" });
};

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'HatchAI SafeLaunch ASP' });
});

// Public schema discovery — the request-body contract for /api/v1/launch (no payment).
app.get('/api/v1/launch/schema', (req: Request, res: Response) => {
    res.json({ service: RESOURCE_ID, price: LAUNCH_FEE, input: LAUNCH_INPUT_SCHEMA });
});

// A2MCP Standard Launch Endpoint. Every body field is OPTIONAL — a minimal or empty
// body still deploys a protected token using safe defaults (see LAUNCH_INPUT_SCHEMA).
app.all('/api/v1/launch', requireAgentPayment, async (req: Request, res: Response) => {
    try {
        // Normalize the (possibly empty/partial/non-numeric) body into valid params.
        // This never throws and never yields NaN, so missing fields can't crash the handler.
        const params: LaunchParameters = normalizeLaunchParameters(req.body);
        console.log(`[ASP] Launch request → ${params.tokenName} (${params.tokenSymbol}), supply ${params.totalSupply}`);

        const result = await orchestrator.executeLaunch(params);

        if (result.status === 'success') {
            result.feePaid = LAUNCH_FEE;
            return res.status(200).json(result);
        }
        // Launch failed downstream (e.g. RPC/chain error) — surface it with the input hint.
        return res.status(502).json({ ...result, inputSchema: LAUNCH_INPUT_SCHEMA });

    } catch (error: any) {
        console.error(`[ASP] Server error:`, error.message);
        res.status(500).json({ error: "Internal Server Error", detail: error.message, inputSchema: LAUNCH_INPUT_SCHEMA });
    }
});

async function ensureWalletLoggedIn() {
    // When a direct signer key is configured, settlement + launch broadcast via ethers
    // and the onchainos CLI is not used — skip the login check entirely (avoids noisy
    // "command not found" errors on hosts without the binary, e.g. Railway).
    if (process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY) {
        console.log("[Startup] 🔑 Direct signer key configured — skipping onchainos login (ethers broadcast).");
        return;
    }
    console.log("[Startup] 🔍 Checking OKX wallet status...");
    try {
        const { stdout } = await execAsync("onchainos wallet status");
        let status;
        try {
            status = JSON.parse(stdout);
        } catch (err) {
            console.warn("[Startup] ⚠️ Failed to parse wallet status JSON response:", stdout);
            return;
        }
        
        const isProduction = process.env.NODE_ENV === 'production';
        const hasApiKeys = !!(process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE);
        
        // We log in if not logged in, OR if in production and not logged in via API Key (ak)
        const needsLogin = !status.data?.loggedIn || (isProduction && status.data?.loginType !== 'ak' && hasApiKeys);
        
        if (needsLogin) {
            if (hasApiKeys) {
                console.log("[Startup] 🔑 OKX API Keys detected. Logging in headlessly...");
                const loginCmd = `onchainos wallet login --force`;
                const { stdout: loginStdout } = await execAsync(loginCmd);
                console.log("[Startup] 🔑 Login response:", loginStdout);
                
                // Verify new login status
                const { stdout: verifyStdout } = await execAsync("onchainos wallet status");
                const verifyStatus = JSON.parse(verifyStdout);
                if (verifyStatus.data?.loggedIn && verifyStatus.data?.loginType === 'ak') {
                    console.log(`[Startup] 🎉 Headless API Key login successful! Active account: ${verifyStatus.data.currentAccountName}`);
                } else {
                    console.warn("[Startup] ⚠️ Headless API Key login completed but verification failed:", verifyStatus);
                }
            } else {
                console.warn("[Startup] ⚠️ Wallet not logged in and no OKX API Keys found in environment variables.");
            }
        } else {
            console.log(`[Startup] ✅ OKX Wallet is already logged in (Login Type: ${status.data?.loginType || 'unknown'}).`);
        }
    } catch (error: any) {
        console.error("[Startup] ❌ Error checking or executing headless login:", error.message);
    }
}

// Start the Agent Service Provider
app.listen(PORT, async () => {
    console.log(`🤖 HatchAI SafeLaunch ASP running on port ${PORT}`);
    console.log(`🌐 A2MCP Endpoint active at POST http://localhost:${PORT}/api/v1/launch`);
    
    // Perform headless OKX wallet login check
    await ensureWalletLoggedIn();
});
