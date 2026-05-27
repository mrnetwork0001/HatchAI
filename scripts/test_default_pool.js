import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
  
  const poolManagerAddress = "0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D";
  const poolManager = new ethers.Contract(
    poolManagerAddress,
    [
      "event PoolInitialized(bytes32 indexed poolId, address currency0, address currency1, uint24 fee)",
      "function pools(bytes32 poolId) external view returns (uint256 reserves0, uint256 reserves1, bool initialized)"
    ],
    provider
  );

  console.log("Fetching PoolInitialized events...");
  const filter = poolManager.filters.PoolInitialized();
  // Let's get events from the last 100,000 blocks
  const latestBlock = await provider.getBlockNumber();
  console.log("Latest block:", latestBlock);
  const events = await poolManager.queryFilter(filter, latestBlock - 100000, latestBlock);
  console.log(`Found ${events.length} pools initialized in the last 100,000 blocks:`);
  
  for (const e of events) {
    console.log("Pool ID:", e.args.poolId);
    console.log("  currency0:", e.args.currency0);
    console.log("  currency1:", e.args.currency1);
    console.log("  fee:", e.args.fee);
    try {
      const res = await poolManager.pools(e.args.poolId);
      console.log("  reserves:", res);
    } catch (err) {
      console.log("  error querying reserves:", err.message);
    }
  }
}

main().catch(console.error);
