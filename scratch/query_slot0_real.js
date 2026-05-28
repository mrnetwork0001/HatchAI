import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";
  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";

  const stateView = new ethers.Contract(
    stateViewAddress,
    [
      "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
    ],
    provider
  );

  console.log("Querying Slot0 via StateView...");
  try {
    const slot0 = await stateView.getSlot0(poolId);
    console.log("Slot0:");
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());
    console.log("  protocolFee:", slot0.protocolFee.toString());
    console.log("  lpFee:", slot0.lpFee.toString());
  } catch (err) {
    console.error("Failed to query Slot0:", err.message);
  }
}

main().catch(console.error);
