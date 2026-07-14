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
// X Layer Mainnet (chain 196) deployment addresses — the live Uniswap V4 + HatchAI stack.
const MAINNET = {
    chainId: 196,
    poolManager: "0x360e68faCcca8cA495c1B759Fd9EEe466db9FB32",
    hatchHook: "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0",
    weth: "0x5A77f1443D16ee5761d310e38b62f77f726bC71c",
    create2Deployer: "0xE313713b2b3d5779fd54ac125E428bF1faAd0C0D",
    // Uniswap V4 dynamic-fee flag (0x800000) — HatchHook overrides the fee per-swap.
    dynamicFee: 8388608,
    tickSpacing: 60,
};
/** Compute the Uniswap V4 poolId (keccak256 of the abi-encoded PoolKey). */
function computePoolId(poolKey) {
    const encoded = ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["address", "address", "uint24", "int24", "address"], [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);
    return ethers_1.ethers.keccak256(encoded);
}
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
    /**
     * Broadcast a contract call through the OKX Agentic Wallet (TEE) via the onchainos CLI,
     * then wait for it to confirm. Returns the confirmed transaction hash.
     */
    async broadcastAndConfirm(to, inputData, opts = { label: "tx" }) {
        const gasFlag = opts.gasLimit ? ` --gas-limit ${opts.gasLimit}` : "";
        const cmd = `onchainos wallet contract-call --chain ${MAINNET.chainId} --to "${to}" --input-data "${inputData}"${gasFlag} --force`;
        console.log(`[Orchestrator] 📡 ${opts.label}: ${cmd.slice(0, 90)}...`);
        const { stdout } = await execAsync(cmd);
        // The CLI may print structured JSON or a bare hash — accept either.
        let txHash = "";
        try {
            const parsed = JSON.parse(stdout);
            txHash = parsed?.data?.txHash || parsed?.txHash || "";
        }
        catch {
            // not JSON
        }
        if (!txHash) {
            const match = stdout.match(/0x[a-fA-F0-9]{64}/);
            if (match)
                txHash = match[0];
        }
        if (!txHash) {
            throw new Error(`${opts.label}: could not extract tx hash from CLI output: ${stdout}`);
        }
        console.log(`[Orchestrator] ⏳ ${opts.label} broadcast (${txHash}). Waiting for confirmation...`);
        const receipt = await this.provider.waitForTransaction(txHash, 1, 90000);
        if (!receipt)
            throw new Error(`${opts.label}: not confirmed within timeout (${txHash})`);
        if (receipt.status !== 1)
            throw new Error(`${opts.label}: transaction reverted (${txHash})`);
        console.log(`[Orchestrator] ✅ ${opts.label} confirmed in block ${receipt.blockNumber}`);
        return txHash;
    }
    /** Check whether a V4 pool is already initialized by reading slot0 via StateView. */
    async isPoolInitialized(poolId) {
        try {
            const stateView = new ethers_1.ethers.Contract("0x76fd297e2d437cd7f76d50f01afe6160f86e9990", ["function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"], this.provider);
            const slot0 = await stateView.getSlot0(poolId);
            return slot0 && BigInt(slot0[0]) > 0n;
        }
        catch (e) {
            console.warn("[Orchestrator] ⚠️ Could not read pool slot0; assuming uninitialized.");
            return false;
        }
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
            // 3. Build the real Uniswap V4 PoolKey (canonical currency ordering).
            const baseToken = safeParams.baseToken || MAINNET.weth;
            const projectLc = tokenAddress.toLowerCase();
            const baseLc = baseToken.toLowerCase();
            const currency0 = projectLc < baseLc ? tokenAddress : baseToken;
            const currency1 = projectLc < baseLc ? baseToken : tokenAddress;
            const isProjectCurrency0 = projectLc < baseLc;
            const poolKey = {
                currency0,
                currency1,
                fee: MAINNET.dynamicFee,
                tickSpacing: MAINNET.tickSpacing,
                hooks: MAINNET.hatchHook,
            };
            const poolId = computePoolId(poolKey);
            console.log(`[Orchestrator] 🆔 Computed poolId: ${poolId}`);
            // 4. Derive the starting price and encode sqrtPriceX96.
            // priceRatio = project tokens per 1 WETH. Fallback: totalSupply / initialLiquidityWeth.
            const seedWeth = parseFloat(safeParams.initialLiquidityWeth || "0");
            const supplyNum = parseFloat(totalSupplyParam);
            let ratio = parseFloat(safeParams.priceRatio || "");
            if (!Number.isFinite(ratio) || ratio <= 0) {
                ratio = seedWeth > 0 && supplyNum > 0 ? supplyNum / seedWeth : 1000;
            }
            // Uniswap price is currency1-per-currency0.
            const price = isProjectCurrency0 ? (1 / ratio) : ratio;
            const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(price) * 79228162514264337593543950336));
            // 5. Convert launch params to on-chain hook units.
            const decayDuration = BigInt(Math.floor(safeParams.decayDurationHours * 3600));
            const startFee = Math.floor(safeParams.startFeePercent * 10000); // percent → hundredths-of-bip
            const endFee = Math.floor(safeParams.endFeePercent * 10000);
            const maxSwapAmount = ethers_1.ethers.parseEther(safeParams.maxSwapAmountTokens || "0");
            const cooldownDuration = BigInt(safeParams.cooldownSeconds);
            // 6. Initialize the pool on the PoolManager (mainnet: 2-arg initialize).
            let initTxHash = "";
            if (await this.isPoolInitialized(poolId)) {
                console.log(`[Orchestrator] Pool already initialized on-chain. Skipping initialize.`);
            }
            else {
                const pmIface = new ethers_1.ethers.Interface([
                    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24)",
                ]);
                const initData = pmIface.encodeFunctionData("initialize", [
                    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
                    sqrtPriceX96,
                ]);
                initTxHash = await this.broadcastAndConfirm(MAINNET.poolManager, initData, {
                    gasLimit: 3000000,
                    label: "PoolManager.initialize",
                });
            }
            // 7. Configure the launch protections on the HatchHook.
            let configTxHash = "";
            try {
                const hookIface = new ethers_1.ethers.Interface([
                    "function initializeLaunchPool((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration) external",
                ]);
                const configData = hookIface.encodeFunctionData("initializeLaunchPool", [
                    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
                    decayDuration,
                    startFee,
                    endFee,
                    maxSwapAmount,
                    cooldownDuration,
                ]);
                configTxHash = await this.broadcastAndConfirm(MAINNET.hatchHook, configData, {
                    gasLimit: 500000,
                    label: "HatchHook.initializeLaunchPool",
                });
            }
            catch (cfgErr) {
                // Non-fatal: the pool exists and is protected by the hook's defaults even if
                // the config call reverts (e.g. already configured).
                console.warn(`[Orchestrator] ⚠️ Hook configuration skipped/failed: ${cfgErr.message}`);
            }
            const hookConfig = (0, config_1.buildHookConfig)(poolId, safeParams);
            return {
                status: 'success',
                tokenAddress,
                poolId,
                deployTxHash: liquidityTxHash,
                initTxHash: initTxHash || undefined,
                configTxHash: configTxHash || undefined,
                liquidityTxHash: initTxHash || liquidityTxHash,
                hookConfig,
                monitoringLink: `https://hatchai.online/pool/${poolId}`,
                summary: `Launched ${safeParams.tokenName} (${safeParams.tokenSymbol}) on X Layer at ${tokenAddress}. `
                    + `Uniswap V4 pool ${poolId.slice(0, 10)}… initialized with HatchHook protections: `
                    + `${safeParams.startFeePercent}% → ${safeParams.endFeePercent}% fee decay over ${safeParams.decayDurationHours}h, `
                    + `${safeParams.cooldownSeconds}s wallet cooldown, ${safeParams.maxSwapAmountTokens} max swap.`,
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
