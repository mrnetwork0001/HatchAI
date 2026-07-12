import { ethers } from 'ethers';

export class LaunchWatcher {
    private poolId: string;
    private provider: ethers.JsonRpcProvider;
    private poolManagerAddress: string;

    constructor(poolId: string) {
        this.poolId = poolId;
        const rpcUrl = process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        // Using the official mainnet PoolManager from deployments
        this.poolManagerAddress = process.env.POOL_MANAGER_ADDRESS || '0x360e68faccca8ca495c1b759fd9eee466db9fb32';
    }

    /**
     * Starts monitoring for Swap events on the PoolManager for this specific poolId.
     */
    public startWatching() {
        console.log(`[Watcher] 👁️  Starting post-launch monitoring for Pool: ${this.poolId}`);
        
        // Uniswap V4 PoolManager Swap event signature: 
        // event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)
        const swapEventSignature = "Swap(bytes32,address,int128,int128,uint160,uint128,int24)";
        const filter = {
            address: this.poolManagerAddress,
            topics: [
                ethers.id(swapEventSignature),
                this.poolId // indexed poolId is the first topic after the event signature hash
            ]
        };

        let swapCount = 0;
        
        // Subscribe to real RPC events
        this.provider.on(filter, (log) => {
            swapCount++;
            console.log(`[Watcher] 🔄 Swap detected on Pool ${this.poolId.slice(0, 10)}... | Total Swaps: ${swapCount} | Tx: ${log.transactionHash}`);
            
            if (swapCount >= 100) {
                console.log(`[Watcher] 🛑 Reached 100 swaps. Stopping monitoring for Pool ${this.poolId.slice(0, 10)}...`);
                this.provider.off(filter);
            }
        });

        // Set a timeout to stop watching after 1 hour (3600000 ms)
        setTimeout(() => {
            console.log(`[Watcher] ⏱️ 1 hour elapsed. Stopping monitoring for Pool ${this.poolId.slice(0, 10)}...`);
            this.provider.off(filter);
        }, 3600000);
    }
}
