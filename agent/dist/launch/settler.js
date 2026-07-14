"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeOnChainSettlement = executeOnChainSettlement;
const child_process_1 = require("child_process");
const util_1 = require("util");
const ethers_1 = require("ethers");
const config_1 = require("../payment/config");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const USDT_CONTRACT_ADDRESS = config_1.USDT_ADDRESS;
function getProvider() {
    const rpcUrl = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
    return new ethers_1.ethers.JsonRpcProvider(rpcUrl);
}
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
        if (!match) {
            console.error(`[Settler] ⚠️ Could not extract a tx hash from stdout:`, stdout);
            throw new Error("Settlement broadcast returned no transaction hash");
        }
        const txHash = match[0];
        console.log(`[Settler] ✅ Settlement transaction broadcasted: ${txHash}`);
        // Wait for the settlement to actually confirm on-chain before granting access.
        // A broadcast hash alone does not prove the transfer succeeded (it could revert
        // on a used nonce, expired authorization, or insufficient balance).
        console.log(`[Settler] ⏳ Waiting for settlement confirmation...`);
        const receipt = await getProvider().waitForTransaction(txHash, 1, 90000);
        if (!receipt) {
            throw new Error(`Settlement not confirmed within timeout: ${txHash}`);
        }
        if (receipt.status !== 1) {
            throw new Error(`Settlement transaction reverted on-chain: ${txHash}`);
        }
        console.log(`[Settler] ✅ Settlement confirmed in block ${receipt.blockNumber}: ${txHash}`);
        return txHash;
    }
    catch (error) {
        console.error(`[Settler] ❌ Failed to execute settlement transaction:`, error.message);
        throw new Error(`On-chain settlement failed: ${error.message}`);
    }
}
