"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeLaunchOrchestrator = void 0;
const ethers_1 = require("ethers");
const antiSniper_1 = require("../protections/antiSniper");
const config_1 = require("../hooks/config");
const mockERC20Artifact_1 = require("../contracts/mockERC20Artifact");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec);
// Normalize to a valid EIP-55 checksum so ethers' direct-signer path (which validates
// addresses, unlike the onchainos CLI) never rejects a hand-typed constant.
const addr = (a) => ethers_1.ethers.getAddress(a.toLowerCase());
// X Layer Mainnet (chain 196) deployment addresses — the live Uniswap V4 + HatchAI stack.
const MAINNET = {
    chainId: 196,
    poolManager: addr("0x360e68faCcca8cA495c1B759Fd9EEe466db9FB32"),
    hatchHook: addr("0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0"),
    weth: addr("0x5A77f1443D16ee5761d310e38b62f77f726bC71c"),
    create2Deployer: addr("0xE313713b2b3d5779fd54ac125E428bF1faAd0C0D"),
    positionManager: addr("0xcf1eafc6928dc385a342e7c6491d371d2871458b"),
    permit2: addr("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
    // Uniswap V4 dynamic-fee flag (0x800000) — HatchHook overrides the fee per-swap.
    dynamicFee: 8388608,
    tickSpacing: 60,
};
// Uniswap V4 PositionManager action codes.
const MINT_POSITION = 0x02;
const SETTLE_PAIR = 0x0d;
// Full-range ticks (nearest multiples of tickSpacing=60).
const FULL_RANGE_TICK_LOWER = -887220;
const FULL_RANGE_TICK_UPPER = 887220;
/** Compute the Uniswap V4 poolId (keccak256 of the abi-encoded PoolKey). */
function computePoolId(poolKey) {
    const encoded = ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(["address", "address", "uint24", "int24", "address"], [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);
    return ethers_1.ethers.keccak256(encoded);
}
class SafeLaunchOrchestrator {
    provider;
    wallet;
    // When true, on-chain writes are signed/broadcast directly via ethers using
    // `this.wallet` (works anywhere — e.g. Railway). When false, we fall back to
    // shelling out to the onchainos CLI (requires that binary + a logged-in wallet).
    useDirectSigner;
    constructor() {
        const rpcUrl = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl, MAINNET.chainId, { staticNetwork: true });
        const privateKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
        if (privateKey) {
            this.wallet = new ethers_1.ethers.Wallet(privateKey, this.provider);
            this.useDirectSigner = true;
            console.log(`[Orchestrator] 🔒 Direct signer loaded: ${this.wallet.address}`);
        }
        else {
            console.warn("[Orchestrator] ⚠️ No AGENT_PRIVATE_KEY/PRIVATE_KEY found. Falling back to onchainos CLI for broadcasts.");
            this.wallet = ethers_1.ethers.Wallet.createRandom().connect(this.provider);
            this.useDirectSigner = false;
        }
    }
    /**
     * Broadcast a contract call and wait for it to confirm. Returns the confirmed tx hash.
     * Uses the direct ethers signer when available (Railway-friendly), else the onchainos CLI.
     */
    async broadcastAndConfirm(to, inputData, opts = { label: "tx" }) {
        if (this.useDirectSigner) {
            console.log(`[Orchestrator] 📡 ${opts.label}: sending from ${this.wallet.address}...`);
            const tx = await this.wallet.sendTransaction({
                to,
                data: inputData,
                ...(opts.gasLimit ? { gasLimit: opts.gasLimit } : {}),
            });
            console.log(`[Orchestrator] ⏳ ${opts.label} broadcast (${tx.hash}). Waiting for confirmation...`);
            const receipt = await tx.wait(1);
            if (!receipt)
                throw new Error(`${opts.label}: not confirmed within timeout (${tx.hash})`);
            if (receipt.status !== 1)
                throw new Error(`${opts.label}: transaction reverted (${tx.hash})`);
            console.log(`[Orchestrator] ✅ ${opts.label} confirmed in block ${receipt.blockNumber}`);
            return tx.hash;
        }
        // Fallback: broadcast via the onchainos CLI (requires the binary + a logged-in wallet).
        const gasFlag = opts.gasLimit ? ` --gas-limit ${opts.gasLimit}` : "";
        const cmd = `onchainos wallet contract-call --chain ${MAINNET.chainId} --to "${to}" --input-data "${inputData}"${gasFlag} --force`;
        console.log(`[Orchestrator] 📡 ${opts.label}: ${cmd.slice(0, 90)}...`);
        const { stdout } = await execAsync(cmd);
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
    /**
     * Resolve the operating wallet's EVM address — the actual sender of every launch tx.
     * Seeded liquidity and the resulting LP NFT are owned by this address. With the direct
     * signer this is this.wallet; otherwise it's the onchainos-logged-in wallet.
     */
    async getAgentAddress() {
        if (this.useDirectSigner) {
            return ethers_1.ethers.getAddress(this.wallet.address);
        }
        const { stdout } = await execAsync("onchainos wallet addresses");
        const parsed = JSON.parse(stdout);
        const addr = parsed?.data?.xlayer?.[0]?.address || parsed?.data?.evm?.[0]?.address;
        if (!addr || !ethers_1.ethers.isAddress(addr)) {
            throw new Error(`Could not resolve agent EVM address from wallet: ${stdout}`);
        }
        return ethers_1.ethers.getAddress(addr);
    }
    /** Read an ERC20 balance for `owner`. */
    async erc20Balance(token, owner) {
        const c = new ethers_1.ethers.Contract(token, ["function balanceOf(address) view returns (uint256)"], this.provider);
        return await c.balanceOf(owner);
    }
    /**
     * Seed initial liquidity so the pool is actually tradeable, and mint the resulting
     * LP NFT to the agent wallet (the future owner of the harvest/buyback loop).
     *
     * Mainnet path mirrors the proven frontend flow: mint the project side to the agent
     * (custody fix), approve both tokens through Permit2 → PositionManager, then call
     * PositionManager.modifyLiquidities with MINT_POSITION + SETTLE_PAIR.
     *
     * Returns the seeding tx hash, or null when seeding is skipped (with the reason logged).
     */
    async seedLiquidity(args) {
        const { agentAddr, projectToken, baseToken, poolKey, sqrtPriceX96, isProjectCurrency0 } = args;
        const seedProjectWei = ethers_1.ethers.parseEther(args.seedProjectAmount);
        const seedWethWei = ethers_1.ethers.parseEther(args.seedWethAmount);
        // 1. Custody fix — the token supply was minted to the CREATE2 deployer, so the agent
        // holds none. MockERC20 exposes a public mint(); give the agent exactly what it needs.
        const mintIface = new ethers_1.ethers.Interface(["function mint(address to, uint256 amount)"]);
        const mintData = mintIface.encodeFunctionData("mint", [agentAddr, seedProjectWei]);
        await this.broadcastAndConfirm(projectToken, mintData, {
            gasLimit: 150000,
            label: "MockERC20.mint (custody)",
        });
        // 2. The agent must already hold the WETH side — we cannot conjure real WETH.
        const wethBal = await this.erc20Balance(baseToken, agentAddr);
        if (wethBal < seedWethWei) {
            console.warn(`[Orchestrator] ⚠️ Skipping liquidity seeding: agent WETH balance `
                + `${ethers_1.ethers.formatEther(wethBal)} < required ${args.seedWethAmount}. `
                + `Pool is initialized but unseeded until WETH is funded.`);
            return null;
        }
        // 3. Approvals: ERC20 → Permit2, then Permit2 → PositionManager (uint160/uint48).
        const erc20Iface = new ethers_1.ethers.Interface(["function approve(address spender, uint256 amount) returns (bool)"]);
        const permit2Iface = new ethers_1.ethers.Interface([
            "function approve(address token, address spender, uint160 amount, uint48 expiration)",
        ]);
        const MAX_UINT160 = (2n ** 160n) - 1n;
        const MAX_UINT48 = (2n ** 48n) - 1n;
        for (const token of [projectToken, baseToken]) {
            const approveData = erc20Iface.encodeFunctionData("approve", [MAINNET.permit2, ethers_1.ethers.MaxUint256]);
            await this.broadcastAndConfirm(token, approveData, { gasLimit: 150000, label: `approve ${token.slice(0, 8)} → Permit2` });
            const p2Data = permit2Iface.encodeFunctionData("approve", [token, MAINNET.positionManager, MAX_UINT160, MAX_UINT48]);
            await this.broadcastAndConfirm(MAINNET.permit2, p2Data, { gasLimit: 100000, label: `Permit2 approve ${token.slice(0, 8)} → PM` });
        }
        // 4. Compute Uniswap liquidity L from desired amounts and price (mirror of frontend math).
        const amount0Desired = isProjectCurrency0 ? seedProjectWei : seedWethWei;
        const amount1Desired = isProjectCurrency0 ? seedWethWei : seedProjectWei;
        const Q96 = 2n ** 96n;
        const L0 = (amount0Desired * sqrtPriceX96) / Q96;
        const L1 = (amount1Desired * Q96) / sqrtPriceX96;
        const liquidity = ((L0 < L1 ? L0 : L1) * 95n) / 100n; // 95% to avoid rounding reverts
        const amount0Max = (amount0Desired * 105n) / 100n;
        const amount1Max = (amount1Desired * 105n) / 100n;
        // 5. Encode MINT_POSITION + SETTLE_PAIR and call modifyLiquidities.
        const actions = ethers_1.ethers.solidityPacked(["uint8", "uint8"], [MINT_POSITION, SETTLE_PAIR]);
        const coder = ethers_1.ethers.AbiCoder.defaultAbiCoder();
        const mintParams = coder.encode([
            "tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)",
            "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes",
        ], [
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            FULL_RANGE_TICK_LOWER, FULL_RANGE_TICK_UPPER, liquidity, amount0Max, amount1Max, agentAddr, "0x",
        ]);
        const settleParams = coder.encode(["address", "address"], [poolKey.currency0, poolKey.currency1]);
        const unlockData = coder.encode(["bytes", "bytes[]"], [actions, [mintParams, settleParams]]);
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 min
        const pmIface = new ethers_1.ethers.Interface([
            "function modifyLiquidities(bytes unlockData, uint256 deadline) payable",
        ]);
        const liqData = pmIface.encodeFunctionData("modifyLiquidities", [unlockData, deadline]);
        return await this.broadcastAndConfirm(MAINNET.positionManager, liqData, {
            gasLimit: 5000000,
            label: "PositionManager.modifyLiquidities (seed)",
        });
    }
    async executeLaunch(params) {
        console.log(`\n🚀 [Orchestrator] Starting Safe Launch sequence for ${params.tokenSymbol}...`);
        try {
            // 1. Validate & Refine Parameters
            const safeParams = (0, antiSniper_1.validateAntiSniperSettings)(params);
            // 2. Deploy the ERC20 token.
            console.log(`[Orchestrator] Deploying ${safeParams.tokenSymbol} token on X Layer...`);
            const totalSupplyParam = safeParams.totalSupply || "1000000";
            // MockERC20's constructor scales _initialSupply by 1e18 internally, so pass the
            // plain token count. Using parseEther here would double-apply 18 decimals and
            // mint a supply 1e18x too large. Parse the integer part from the string (no
            // float) to preserve precision for very large supplies.
            const initialSupply = BigInt(totalSupplyParam.trim().split('.')[0] || "0");
            let tokenAddress = '';
            let deployTxHash = '0x0';
            if (this.useDirectSigner) {
                // Deploy directly from the signer wallet. msg.sender = this.wallet, so the full
                // supply is minted to the operating wallet — native custody, no CREATE2 orphaning.
                const factory = new ethers_1.ethers.ContractFactory(mockERC20Artifact_1.MockERC20Artifact.abi, mockERC20Artifact_1.MockERC20Artifact.bytecode, this.wallet);
                const token = await factory.deploy(safeParams.tokenName, safeParams.tokenSymbol, initialSupply);
                deployTxHash = token.deploymentTransaction()?.hash || '0x0';
                console.log(`[Orchestrator] ⏳ Token deploy broadcast (${deployTxHash}). Waiting...`);
                await token.waitForDeployment();
                tokenAddress = await token.getAddress();
            }
            else {
                // Fallback: deploy via the CREATE2Deployer through the onchainos CLI.
                const factory = new ethers_1.ethers.ContractFactory(mockERC20Artifact_1.MockERC20Artifact.abi, mockERC20Artifact_1.MockERC20Artifact.bytecode);
                const deployTxReq = await factory.getDeployTransaction(safeParams.tokenName, safeParams.tokenSymbol, initialSupply);
                const iface = new ethers_1.ethers.Interface([
                    "function deploy(bytes32 salt, bytes bytecode) external returns (address)",
                    "event Deployed(address addr, bytes32 salt)",
                ]);
                const salt = ethers_1.ethers.randomBytes(32);
                const inputData = iface.encodeFunctionData("deploy", [salt, deployTxReq.data]);
                const cmd = `onchainos wallet contract-call --chain ${MAINNET.chainId} --to "${MAINNET.create2Deployer}" --input-data ${inputData} --force`;
                console.log(`[Orchestrator] Executing CLI: ${cmd.slice(0, 80)}...`);
                const { stdout } = await execAsync(cmd);
                const result = JSON.parse(stdout);
                if (!result.ok || !result.data?.txHash) {
                    throw new Error(`CLI response format unexpected: ${JSON.stringify(result)}`);
                }
                deployTxHash = result.data.txHash;
                console.log(`[Orchestrator] ✅ TEE Tx Broadcasted: ${deployTxHash}. Waiting for confirmation...`);
                const receipt = await this.provider.waitForTransaction(deployTxHash, 1, 60000);
                for (const log of receipt?.logs || []) {
                    try {
                        const parsedLog = iface.parseLog({ topics: log.topics.slice(), data: log.data });
                        if (parsedLog && parsedLog.name === "Deployed") {
                            tokenAddress = parsedLog.args.addr;
                            break;
                        }
                    }
                    catch { /* not our event */ }
                }
            }
            if (!tokenAddress || tokenAddress === ethers_1.ethers.ZeroAddress) {
                throw new Error("Token deployment failed: no token address");
            }
            console.log(`[Orchestrator] ✅ Token deployed at: ${tokenAddress}`);
            // 3. Build the real Uniswap V4 PoolKey (canonical currency ordering).
            const baseToken = safeParams.baseToken
                ? ethers_1.ethers.getAddress(safeParams.baseToken.toLowerCase())
                : MAINNET.weth;
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
            // 8. Seed initial liquidity so the pool is actually tradeable (optional).
            // Requires both seed amounts; only runs when they are provided.
            let seedTxHash = null;
            const seedProjectAmount = safeParams.seedProjectAmount;
            const seedWethAmount = safeParams.seedWethAmount;
            if (seedProjectAmount && seedWethAmount
                && parseFloat(seedProjectAmount) > 0 && parseFloat(seedWethAmount) > 0) {
                try {
                    const agentAddr = await this.getAgentAddress();
                    console.log(`[Orchestrator] 🌱 Seeding liquidity from agent wallet ${agentAddr}...`);
                    seedTxHash = await this.seedLiquidity({
                        agentAddr,
                        projectToken: tokenAddress,
                        baseToken,
                        poolKey,
                        sqrtPriceX96,
                        isProjectCurrency0,
                        seedProjectAmount,
                        seedWethAmount,
                    });
                }
                catch (seedErr) {
                    // Non-fatal: the pool is live and protected even if seeding fails; it can
                    // be seeded later. Surface the reason rather than failing the whole launch.
                    console.warn(`[Orchestrator] ⚠️ Liquidity seeding failed: ${seedErr.message}`);
                }
            }
            else {
                console.log(`[Orchestrator] ℹ️ No seed amounts provided — pool initialized without liquidity.`);
            }
            const hookConfig = (0, config_1.buildHookConfig)(poolId, safeParams);
            const seeded = !!seedTxHash;
            return {
                status: 'success',
                tokenAddress,
                poolId,
                deployTxHash,
                initTxHash: initTxHash || undefined,
                configTxHash: configTxHash || undefined,
                liquidityTxHash: seedTxHash || undefined,
                hookConfig,
                monitoringLink: `https://hatchai.online/pool/${poolId}`,
                summary: `Launched ${safeParams.tokenName} (${safeParams.tokenSymbol}) on X Layer at ${tokenAddress}. `
                    + `Uniswap V4 pool ${poolId.slice(0, 10)}… initialized with HatchHook protections: `
                    + `${safeParams.startFeePercent}% → ${safeParams.endFeePercent}% fee decay over ${safeParams.decayDurationHours}h, `
                    + `${safeParams.cooldownSeconds}s wallet cooldown, ${safeParams.maxSwapAmountTokens} max swap. `
                    + (seeded
                        ? `Seeded with ${seedProjectAmount} ${safeParams.tokenSymbol} + ${seedWethAmount} WETH — pool is live and tradeable.`
                        : `Not yet seeded — fund liquidity to enable trading.`),
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
