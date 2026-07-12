"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeLaunchOrchestrator = void 0;
const ethers_1 = require("ethers");
const antiSniper_1 = require("../protections/antiSniper");
const config_1 = require("../hooks/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec);
class SafeLaunchOrchestrator {
    provider;
    wallet;
    constructor() {
        const rpcUrl = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const privateKey = process.env.AGENT_PRIVATE_KEY;
        if (!privateKey) {
            console.warn("[Orchestrator] ⚠️ No AGENT_PRIVATE_KEY found. Running in simulation mode.");
            // We use a random wallet for simulation purposes if none provided
            this.wallet = ethers_1.ethers.Wallet.createRandom().connect(this.provider);
        }
        else {
            this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
            console.log(`[Orchestrator] 🔒 OKX Agentic Wallet loaded: ${this.wallet.address}`);
        }
    }
    getArtifact(name) {
        const basePath1 = path_1.default.resolve(__dirname, '../../../../artifacts/contracts');
        const file1 = path_1.default.join(basePath1, `${name}.sol`, `${name}.json`);
        if (fs_1.default.existsSync(file1))
            return JSON.parse(fs_1.default.readFileSync(file1, 'utf8'));
        const basePath2 = path_1.default.resolve(__dirname, '../../../artifacts/contracts');
        const file2 = path_1.default.join(basePath2, `${name}.sol`, `${name}.json`);
        return JSON.parse(fs_1.default.readFileSync(file2, 'utf8'));
    }
    async executeLaunch(params) {
        console.log(`\n🚀 [Orchestrator] Starting Safe Launch sequence for ${params.tokenSymbol}...`);
        try {
            // 1. Validate & Refine Parameters
            const safeParams = (0, antiSniper_1.validateAntiSniperSettings)(params);
            // 2. Deploy Token Contract (ERC20) via OKX Agentic Wallet (TEE)
            console.log(`[Orchestrator] Deploying token contract via TEE Agentic Wallet on X Layer...`);
            // Generate bytecode for the token
            const mockErc20 = this.getArtifact('MockERC20');
            const factory = new ethers_1.ethers.ContractFactory(mockErc20.abi, mockErc20.bytecode);
            const totalSupplyParam = safeParams.totalSupply || "1000000";
            const deployTxReq = await factory.getDeployTransaction(safeParams.tokenName, safeParams.tokenSymbol, ethers_1.ethers.parseEther(totalSupplyParam));
            const initCode = deployTxReq.data;
            // Encode the factory call using Create2Deployer
            const iface = new ethers_1.ethers.Interface([
                "function deploy(bytes32 salt, bytes bytecode) external returns (address)",
                "event Deployed(address addr, bytes32 salt)"
            ]);
            const salt = ethers_1.ethers.randomBytes(32);
            const inputData = iface.encodeFunctionData("deploy", [
                salt,
                initCode
            ]);
            const factoryAddress = "0xE313713b2b3d5779fd54ac125E428bF1faAd0C0D"; // Live Create2Deployer on X Layer
            let tokenAddress = '';
            let liquidityTxHash = '0x0';
            // Execute TEE signature via onchainos CLI
            const cmd = `onchainos wallet contract-call --chain 196 --to "${factoryAddress}" --input-data ${inputData} --force`;
            console.log(`[Orchestrator] Executing CLI: ${cmd.slice(0, 80)}...`);
            const { stdout } = await execAsync(cmd);
            const result = JSON.parse(stdout);
            if (result.ok && result.data && result.data.txHash) {
                liquidityTxHash = result.data.txHash;
                console.log(`[Orchestrator] ✅ TEE Tx Broadcasted: ${liquidityTxHash}`);
                console.log(`[Orchestrator] ⏳ Waiting for transaction confirmation to extract token address...`);
                const receipt = await this.provider.waitForTransaction(liquidityTxHash, 1, 60000);
                if (receipt && receipt.logs) {
                    for (const log of receipt.logs) {
                        try {
                            const parsedLog = iface.parseLog({ topics: log.topics.slice(), data: log.data });
                            if (parsedLog && parsedLog.name === "Deployed") {
                                tokenAddress = parsedLog.args.addr;
                                break;
                            }
                        }
                        catch (e) {
                            // Ignore logs that don't match our ABI
                        }
                    }
                }
                if (!tokenAddress || tokenAddress === ethers_1.ethers.ZeroAddress) {
                    throw new Error("Deployed event not found in receipt");
                }
            }
            else {
                throw new Error(`CLI response format unexpected: ${JSON.stringify(result)}`);
            }
            console.log(`[Orchestrator] ✅ Token deployed at: ${tokenAddress}`);
            // 3. Generate Pool ID and Hook Config
            const mockPoolId = ethers_1.ethers.hexlify(ethers_1.ethers.randomBytes(32));
            const hookConfig = (0, config_1.buildHookConfig)(mockPoolId, safeParams);
            // 4. Initialize Pool with HatchHook
            console.log(`[Orchestrator] Initializing Uniswap V4 Pool with HatchHook protections (Simulated for safety)...`);
            return {
                status: 'success',
                tokenAddress: tokenAddress,
                poolId: mockPoolId,
                liquidityTxHash: liquidityTxHash,
                hookConfig: hookConfig,
                monitoringLink: `https://hatchai.online/pool/${mockPoolId}`,
                summary: `Successfully deployed ${safeParams.tokenName} (${safeParams.tokenSymbol}) on X Layer at ${tokenAddress} with ${safeParams.startFeePercent}% bot tax decaying over ${safeParams.decayDurationHours} hours.`
            };
        }
        catch (error) {
            console.error(`[Orchestrator] ❌ Launch failed:`, error.message);
            return {
                status: 'failed',
                error: error.message
            };
        }
    }
}
exports.SafeLaunchOrchestrator = SafeLaunchOrchestrator;
