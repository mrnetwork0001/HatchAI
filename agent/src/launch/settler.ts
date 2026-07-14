import { exec } from "child_process";
import { promisify } from "util";
import { ethers } from "ethers";
import { USDT_ADDRESS, XLAYER_MAINNET_CHAIN_ID } from "../payment/config";

const execAsync = promisify(exec);

const USDT_CONTRACT_ADDRESS = USDT_ADDRESS;

const TRANSFER_WITH_AUTH_ABI = [
    "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
];

function getProvider(): ethers.JsonRpcProvider {
    const rpcUrl = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
    return new ethers.JsonRpcProvider(rpcUrl, XLAYER_MAINNET_CHAIN_ID, { staticNetwork: true });
}

/** The relayer that broadcasts the EIP-3009 transfer and pays gas (funds still flow to `to`). */
function getRelayerKey(): string | undefined {
    return process.env.RELAYER_PRIVATE_KEY
        || process.env.PRIVATE_KEY
        || process.env.AGENT_PRIVATE_KEY
        || undefined;
}

/**
 * Settle an x402 "exact" (EIP-3009) payment on-chain: broadcast
 * transferWithAuthorization so `value` USDT moves from the payer to `to`.
 *
 * Prefers a direct ethers relayer (works on Railway with only PRIVATE_KEY + gas);
 * falls back to the onchainos CLI when no key is configured. Retries transient
 * RPC/network errors, but never retries a deterministic revert (used/expired
 * authorization, bad signature), and only returns on a status==1 receipt.
 */
export async function executeOnChainSettlement(authorization: any, signature: string): Promise<string> {
    console.log(`[Settler] 💸 Settling ${ethers.formatUnits(authorization.value, 6)} USDT (from ${authorization.from} → ${authorization.to})...`);

    const sig = ethers.Signature.from(signature);
    const args = [
        authorization.from,
        authorization.to,
        authorization.value,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        sig.v,
        sig.r,
        sig.s,
    ];

    const relayerKey = getRelayerKey();
    if (relayerKey) {
        return settleViaEthers(relayerKey, args);
    }
    return settleViaOnchainos(args);
}

async function settleViaEthers(relayerKey: string, args: any[]): Promise<string> {
    const provider = getProvider();
    const wallet = new ethers.Wallet(relayerKey, provider);
    const usdt = new ethers.Contract(USDT_CONTRACT_ADDRESS, TRANSFER_WITH_AUTH_ABI, wallet);
    console.log(`[Settler] 🔑 Relayer ${wallet.address} broadcasting settlement...`);

    const MAX_ATTEMPTS = 3;
    let lastErr: any;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const tx = await usdt.transferWithAuthorization(...args, { gasLimit: 200000 });
            console.log(`[Settler] 📡 Settlement broadcast (attempt ${attempt}/${MAX_ATTEMPTS}): ${tx.hash}`);
            const receipt = await tx.wait(1);
            if (!receipt) throw new Error(`settlement not confirmed within timeout: ${tx.hash}`);
            if (receipt.status !== 1) throw new Error(`settlement transaction reverted: ${tx.hash}`);
            console.log(`[Settler] ✅ Settlement confirmed in block ${receipt.blockNumber}: ${tx.hash}`);
            return tx.hash;
        } catch (err: any) {
            lastErr = err;
            const detail = err?.shortMessage || err?.message || String(err);
            console.error(`[Settler] ❌ Settlement attempt ${attempt} failed: ${detail}`);
            // Only retry transient RPC/network issues; a revert or bad-funds error is final.
            const transient = ["TIMEOUT", "NETWORK_ERROR", "SERVER_ERROR"].includes(err?.code);
            if (!transient || attempt === MAX_ATTEMPTS) break;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
    }
    throw new Error(`On-chain settlement failed: ${lastErr?.shortMessage || lastErr?.message || lastErr}`);
}

/** Legacy fallback: broadcast via the onchainos CLI (requires the binary + a logged-in wallet). */
async function settleViaOnchainos(args: any[]): Promise<string> {
    const iface = new ethers.Interface(TRANSFER_WITH_AUTH_ABI);
    const inputData = iface.encodeFunctionData("transferWithAuthorization", args);
    const cmd = `onchainos wallet contract-call --chain ${XLAYER_MAINNET_CHAIN_ID} --to ${USDT_CONTRACT_ADDRESS} --input-data "${inputData}"`;

    try {
        console.log(`[Settler] 📡 Broadcasting settlement via onchainos CLI...`);
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) console.error(`[Settler] CLI warning:`, stderr);

        const match = stdout.match(/0x[a-fA-F0-9]{64}/);
        if (!match) throw new Error(`settlement broadcast returned no tx hash: ${stdout}`);
        const txHash = match[0];
        console.log(`[Settler] ✅ Settlement broadcast: ${txHash}. Waiting for confirmation...`);

        const receipt = await getProvider().waitForTransaction(txHash, 1, 90000);
        if (!receipt) throw new Error(`settlement not confirmed within timeout: ${txHash}`);
        if (receipt.status !== 1) throw new Error(`settlement transaction reverted: ${txHash}`);
        console.log(`[Settler] ✅ Settlement confirmed in block ${receipt.blockNumber}: ${txHash}`);
        return txHash;
    } catch (error: any) {
        console.error(`[Settler] ❌ onchainos settlement failed:`, error.message);
        throw new Error(`On-chain settlement failed: ${error.message}`);
    }
}
