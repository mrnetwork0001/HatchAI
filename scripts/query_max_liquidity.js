import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  const abi = [
    "function tickSpacingToMaxLiquidityPerTick(int24 tickSpacing) external view returns (uint160)"
  ];

  const pm = new ethers.Contract(pmAddress, abi, provider);

  console.log("Checking tick spacings in PoolManager...");
  for (const ts of [1, 2, 10, 60, 100, 200]) {
    try {
      const maxLiq = await pm.tickSpacingToMaxLiquidityPerTick(ts);
      console.log(`tickSpacingToMaxLiquidityPerTick(${ts}): ${maxLiq.toString()}`);
    } catch (e) {
      console.log(`Query for tickSpacing ${ts} failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
