"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOnChainSettlement = executeOnChainSettlement;
const child_process_1 = require("child_process");
const util_1 = require("util");
const ethers_1 = require("ethers");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const USDT_CONTRACT_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
async function executeOnChainSettlement(authorization, signature) {
    console.log(`[Settler] 💸 Initiating on-chain settlement for ${ethers_1.ethers.formatUnits(authorization.value, 6)} USDT...`);
    // Extract v, r, s from the EIP-3009 signature
    const sig = ethers_1.ethers.Signature.from(signature);
    const v = sig.v;
    const r = sig.r;
    const s = sig.s;
    // We use the onchainos CLI to execute the smart contract call using the Agentic Wallet
    const iface = new ethers_1.ethers.Interface([
        "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)"
    ]);
    // Format the args array as a JSON string for the CLI
    const inputData = iface.encodeFunctionData("transferWithAuthorization", [
        authorization.from,
        authorization.to,
        authorization.value,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        v,
        r,
        s
    ]);
    const cmd = `onchainos wallet contract-call --chain 196 --to ${USDT_CONTRACT_ADDRESS} --input-data "${inputData}"`;
    try {
        console.log(`[Settler] 📡 Broadcasting settlement transaction to X Layer...`);
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) {
            console.error(`[Settler] CLI Warning/Error:`, stderr);
        }
        // Parse the CLI output. We look for a line starting with `Hash:` or a JSON output.
        // The onchainos CLI might just output the hash directly.
        const match = stdout.match(/0x[a-fA-F0-9]{64}/);
        if (match) {
            console.log(`[Settler] ✅ Settlement transaction broadcasted: ${match[0]}`);
            return match[0];
        }
        else {
            console.log(`[Settler] ⚠️ Could not extract hash from stdout:`, stdout);
            return stdout;
        }
    }
    catch (error) {
        console.error(`[Settler] ❌ Failed to execute settlement transaction:`, error.message);
        throw new Error("On-chain settlement failed.");
    }
}
