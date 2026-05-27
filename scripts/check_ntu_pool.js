/**
 * Quick check: can we read poolConfigs from the new hook for the NTU pool?
 */
import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const hookAddress = "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0";
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  
  // NTU token address - we need to find it. Let's check events.
  // From the screenshot: NTU token with ratio 1000000000 NTU/WETH
  // Let's read LaunchInitialized events from the hook
  const hookAbi = [
    "function poolConfigs(bytes32 poolId) external view returns (address creator, address projectToken, uint256 launchTime, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration)",
    "event LaunchInitialized(bytes32 indexed poolId, address indexed creator, address projectToken, uint256 launchTime)"
  ];
  const hook = new ethers.Contract(hookAddress, hookAbi, provider);

  // Get latest block
  const latestBlock = await provider.getBlockNumber();
  console.log("Latest block:", latestBlock);

  // Query LaunchInitialized events
  const filter = hook.filters.LaunchInitialized();
  try {
    const events = await hook.queryFilter(filter, latestBlock - 10000, latestBlock);
    console.log("LaunchInitialized events found:", events.length);
    for (const event of events) {
      console.log("\nEvent:");
      console.log("  poolId:", event.args[0]);
      console.log("  creator:", event.args[1]);
      console.log("  projectToken:", event.args[2]);
      console.log("  launchTime:", event.args[3].toString());
      console.log("  block:", event.blockNumber);

      // Now read the poolConfig for this poolId
      const config = await hook.poolConfigs(event.args[0]);
      console.log("  poolConfig:", {
        creator: config.creator,
        projectToken: config.projectToken,
        launchTime: config.launchTime.toString(),
        decayDuration: config.decayDuration.toString(),
        startFee: config.startFee,
        endFee: config.endFee,
        maxSwapAmount: ethers.formatEther(config.maxSwapAmount),
        cooldownDuration: config.cooldownDuration.toString()
      });

      // Also compute what poolId the frontend would compute
      const projectToken = config.projectToken;
      const currency0 = projectToken.toLowerCase() < weth.toLowerCase() ? projectToken : weth;
      const currency1 = projectToken.toLowerCase() < weth.toLowerCase() ? weth : projectToken;
      const computedPoolId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint24", "int24", "address"],
          [currency0, currency1, 8388608, 60, hookAddress]
        )
      );
      console.log("  Computed poolId:", computedPoolId);
      console.log("  Match:", computedPoolId === event.args[0]);
    }
  } catch (e) {
    console.log("Event query failed:", e.message?.substring(0, 200));
  }
}

main().catch(console.error);
