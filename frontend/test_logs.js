import { ethers } from "ethers";

async function testLogs(rpcUrl, hookAddress) {
    console.log(`Testing RPC: ${rpcUrl} for Hook: ${hookAddress}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // ABI for LaunchInitialized event
    const abi = ["event LaunchInitialized(bytes32 indexed poolId, address indexed creator, address projectToken, uint256 launchTime)"];
    const contract = new ethers.Contract(hookAddress, abi, provider);
    
    try {
        const currentBlock = await provider.getBlockNumber();
        const startBlock = Math.max(0, currentBlock - 500000); // Try last 500k blocks
        console.log(`Querying from ${startBlock} to latest...`);
        
        const logs = await contract.queryFilter(contract.filters.LaunchInitialized(), startBlock, "latest");
        console.log(`Found ${logs.length} pools!`);
        for (const log of logs) {
            console.log(`- PoolId: ${log.args.poolId}, Token: ${log.args.projectToken}`);
        }
    } catch (e) {
        console.error("Error querying logs:", e.message);
    }
}

async function main() {
    await testLogs("https://testrpc.xlayer.tech", "0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f"); // Testnet
    await testLogs("https://rpc.xlayer.tech", "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0"); // Mainnet
}

main();
