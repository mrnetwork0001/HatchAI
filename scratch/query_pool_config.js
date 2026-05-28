import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const hookAddress = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";
  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";

  const hook = new ethers.Contract(
    hookAddress,
    [
      "function poolConfigs(bytes32) external view returns (address creator, address projectToken, uint256 launchTime, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration)"
    ],
    provider
  );

  console.log("Querying pool configuration for poolId:", poolId);
  const config = await hook.poolConfigs(poolId);
  console.log("Pool Config:");
  console.log("  creator:", config.creator);
  console.log("  projectToken:", config.projectToken);
  console.log("  launchTime:", config.launchTime.toString(), `(${new Date(Number(config.launchTime) * 1000).toISOString()})`);
  console.log("  decayDuration:", config.decayDuration.toString(), "seconds");
  console.log("  startFee:", config.startFee.toString());
  console.log("  endFee:", config.endFee.toString());
  console.log("  maxSwapAmount:", ethers.formatEther(config.maxSwapAmount), "tokens");
  console.log("  cooldownDuration:", config.cooldownDuration.toString(), "seconds");
}

main().catch(console.error);
