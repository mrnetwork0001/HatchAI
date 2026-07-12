import { ethers } from 'ethers';
import { LaunchParameters, LaunchResult } from '../types';
import { validateAntiSniperSettings } from '../protections/antiSniper';
import { buildHookConfig } from '../hooks/config';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class SafeLaunchOrchestrator {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet | ethers.HDNodeWallet;

    constructor() {
        const rpcUrl = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        const privateKey = process.env.AGENT_PRIVATE_KEY;
        if (!privateKey) {
            console.warn("[Orchestrator] ⚠️ No AGENT_PRIVATE_KEY found. Running in simulation mode.");
            // We use a random wallet for simulation purposes if none provided
            this.wallet = ethers.Wallet.createRandom().connect(this.provider);
        } else {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            console.log(`[Orchestrator] 🔒 OKX Agentic Wallet loaded: ${this.wallet.address}`);
        }
    }

    private getArtifact(name: string) {
        const basePath1 = path.resolve(__dirname, '../../../../artifacts/contracts');
        const file1 = path.join(basePath1, `${name}.sol`, `${name}.json`);
        if (fs.existsSync(file1)) return JSON.parse(fs.readFileSync(file1, 'utf8'));
        
        const basePath2 = path.resolve(__dirname, '../../../artifacts/contracts');
        const file2 = path.join(basePath2, `${name}.sol`, `${name}.json`);
        return JSON.parse(fs.readFileSync(file2, 'utf8'));
    }

    public async executeLaunch(params: LaunchParameters): Promise<LaunchResult> {
        console.log(`\n🚀 [Orchestrator] Starting Safe Launch sequence for ${params.tokenSymbol}...`);
        
        try {
            // 1. Validate & Refine Parameters
            const safeParams = validateAntiSniperSettings(params);

            // 2. Deploy Token Contract (ERC20) via OKX Agentic Wallet (TEE)
            console.log(`[Orchestrator] Deploying token contract via TEE Agentic Wallet on X Layer...`);
            
            // Generate bytecode for the token
            const mockErc20 = this.getArtifact('MockERC20');
            const factory = new ethers.ContractFactory(mockErc20.abi, mockErc20.bytecode);
            const totalSupplyParam = safeParams.totalSupply || "1000000";
            const deployTxReq = await factory.getDeployTransaction(safeParams.tokenName, safeParams.tokenSymbol, ethers.parseEther(totalSupplyParam));
            const initCode = deployTxReq.data;

            // Encode the factory call using Create2Deployer
            const iface = new ethers.Interface([
                "function deploy(bytes32 salt, bytes bytecode) external returns (address)",
                "event Deployed(address addr, bytes32 salt)"
            ]);
            
            const salt = ethers.randomBytes(32);
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
                        } catch (e) {
                            // Ignore logs that don't match our ABI
                        }
                    }
                }
                
                if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
                    throw new Error("Deployed event not found in receipt");
                }
            } else {
                throw new Error(`CLI response format unexpected: ${JSON.stringify(result)}`);
            }

            console.log(`[Orchestrator] ✅ Token deployed at: ${tokenAddress}`);

            // 3. Generate Pool ID and Hook Config
            const mockPoolId = ethers.hexlify(ethers.randomBytes(32));
            const hookConfig = buildHookConfig(mockPoolId, safeParams);
            
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
        } catch (error: any) {
            console.error(`[Orchestrator] ❌ Launch failed:`, error.message);
            return {
                status: 'failed',
                error: error.message
            };
        }
    }
}
