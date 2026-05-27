import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";

  // StateView contract functions
  const abi = [
    // Standard Uniswap V4 StateView functions:
    "function tickSpacingToMaxLiquidityPerTick(int24 tickSpacing) external view returns (uint160)",
    "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    "function getLiquidity(bytes32 poolId) external view returns (uint128)"
  ];

  const sv = new ethers.Contract(stateViewAddress, abi, provider);

  console.log("Checking tick spacings via StateView...");
  for (const ts of [1, 2, 10, 60, 100, 200]) {
    try {
      const maxLiq = await sv.tickSpacingToMaxLiquidityPerTick(ts);
      console.log(`tickSpacingToMaxLiquidityPerTick(${ts}): ${maxLiq.toString()}`);
    } catch (e) {
      console.log(`StateView query for tickSpacing ${ts} failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
