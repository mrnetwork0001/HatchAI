import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const hookAddress = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";
  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";

  const hookContract = new ethers.Contract(
    hookAddress,
    [
      "function poolConfigs(bytes32 poolId) external view returns (address creator, address projectToken, uint256 launchTime, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration)",
      "function weth() external view returns (address)"
    ],
    provider
  );

  try {
    const config = await hookContract.poolConfigs(poolId);
    console.log("LaunchConfig:");
    console.log("  creator:", config.creator);
    console.log("  projectToken:", config.projectToken);
    console.log("  launchTime:", config.launchTime.toString());
    console.log("  decayDuration:", config.decayDuration.toString());
    console.log("  startFee:", config.startFee.toString());
    console.log("  endFee:", config.endFee.toString());
    console.log("  maxSwapAmount:", config.maxSwapAmount.toString());
    console.log("  cooldownDuration:", config.cooldownDuration.toString());
  } catch (e) {
    console.error("Failed to query config:", e.message);
  }

  try {
    const wethAddress = await hookContract.weth();
    console.log("Hook WETH Address:", wethAddress);
  } catch (e) {
    console.error("Failed to query WETH address:", e.message);
  }
}

main().catch(console.error);
