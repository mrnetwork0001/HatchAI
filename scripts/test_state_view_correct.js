import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  // StateView ABI with the correct manager argument
  const abi = [
    "function tickSpacingToMaxLiquidityPerTick(address manager, int24 tickSpacing) external view returns (uint160)",
    "function getSlot0(address manager, bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    "function getLiquidity(address manager, bytes32 poolId) external view returns (uint128)"
  ];

  const sv = new ethers.Contract(stateViewAddress, abi, provider);

  console.log("Checking tick spacings via StateView (with manager)...");
  for (const ts of [10, 60, 200]) {
    try {
      const maxLiq = await sv.tickSpacingToMaxLiquidityPerTick(pmAddress, ts);
      console.log(`tickSpacingToMaxLiquidityPerTick(${ts}): ${maxLiq.toString()}`);
    } catch (e) {
      console.log(`StateView query for tickSpacing ${ts} failed: ${e.message}`);
    }
  }
}

main().catch(console.error);
