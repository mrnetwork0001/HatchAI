"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const orchestrator_1 = require("../launch/orchestrator");
const ethers_1 = require("ethers");
const settler_1 = require("../launch/settler");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
const orchestrator = new orchestrator_1.SafeLaunchOrchestrator();
// The fixed fee for the A2MCP service in stablecoins (e.g. USDT)
const LAUNCH_FEE = "50.00";
// Payment Middleware (x402 protocol)
const requireAgentPayment = async (req, res, next) => {
    // 1. Check for OKX Agent Payments protocol header (v1 or v2)
    const rawHeader = req.headers['ok-web3-openapi-pay'] || req.headers['payment-signature'] || req.headers['authorization'];
    const paymentHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!paymentHeader) {
        // Construct standard x402 payload
        const paymentPayload = JSON.stringify({
            x402Version: "2.0",
            resource: "hatchai-agent-launch",
            accepts: [
                {
                    network: "xlayer_mainnet",
                    scheme: "exact",
                    asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
                    amount: "500000", // 0.5 USDT
                    payTo: "0x66A4c73e7C02858B49F15fBC24589A76B97C0F5a", // Agentic Wallet Address
                    extra: {
                        name: "USD₮0",
                        version: "1"
                    }
                }
            ]
        });
        // The exact standard x402 formatting (base64 encoded)
        const base64Payload = Buffer.from(paymentPayload).toString('base64');
        // Return HTTP 402 with the correct WWW-Authenticate challenge header
        res.setHeader('WWW-Authenticate', `Payment ${base64Payload}`);
        res.setHeader('X-PAYMENT-REQUIRED', base64Payload); // Fallback for some clients
        res.status(402).json({
            error: "Payment Required",
            message: "Standard x402 Payment Challenge Issued via Headers"
        });
        return;
    }
    // 2. Cryptographically verify the payment voucher (Phase 2)
    try {
        // We expect the payment header to be a base64 encoded JSON string
        const payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
        // EIP-3009 Standard (exact scheme)
        if (payload.payload && payload.payload.authorization && payload.payload.signature) {
            const auth = payload.payload.authorization;
            const sig = payload.payload.signature;
            console.log(`[A2MCP] 🔐 EIP-3009 payment signature received from: ${auth.from}`);
            // Execute on-chain settlement
            try {
                const txHash = await (0, settler_1.executeOnChainSettlement)(auth, sig);
                console.log(`[A2MCP] 💰 On-chain settlement completed! Tx: ${txHash}`);
                next();
            }
            catch (err) {
                console.error("[A2MCP] ❌ On-chain settlement failed:", err.message);
                res.status(402).json({ error: "On-chain settlement failed" });
                return;
            }
        }
        // Fallback for our simulation script (raw signature)
        else if (payload.voucher && payload.signature) {
            const recoveredAddress = ethers_1.ethers.verifyMessage(payload.voucher, payload.signature);
            console.log(`[A2MCP] 🔐 (Simulated) Payment signature verified from: ${recoveredAddress}`);
            console.log("[A2MCP] 💰 Agent payment verified successfully (No on-chain settlement).");
            next();
        }
        else {
            throw new Error("Invalid x402 payload structure");
        }
    }
    catch (e) {
        console.error("[A2MCP] ❌ Payment verification failed:", e.message);
        res.status(403).json({ error: "Invalid payment signature" });
        return;
    }
};
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'HatchAI SafeLaunch ASP' });
});
// A2MCP Standard Launch Endpoint
app.post('/api/v1/launch', requireAgentPayment, async (req, res) => {
    try {
        const params = req.body;
        // Basic input validation
        if (!params.tokenName || !params.tokenSymbol || !params.totalSupply) {
            return res.status(400).json({ error: "Missing required token parameters" });
        }
        console.log(`[ASP] Received launch request for ${params.tokenName} (${params.tokenSymbol})`);
        // Execute the orchestration
        const result = await orchestrator.executeLaunch(params);
        if (result.status === 'success') {
            result.feePaid = `${LAUNCH_FEE} USDT`;
            return res.status(200).json(result);
        }
        else {
            return res.status(500).json(result);
        }
    }
    catch (error) {
        console.error(`[ASP] Server error:`, error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// Start the Agent Service Provider
app.listen(PORT, () => {
    console.log(`🤖 HatchAI SafeLaunch ASP running on port ${PORT}`);
    console.log(`🌐 A2MCP Endpoint active at POST http://localhost:${PORT}/api/v1/launch`);
});
