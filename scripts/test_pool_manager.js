import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  // Let's test calling some common Uniswap V4 PoolManager view functions or check if it throws
  // The ABI can include functions we want to test:
  const abi = [
    // Does it have tickSpacing mapping?
    // In V4, tick spacing is supported if it is enabled.
    // Let's check getIncomingFee or other functions.
    // Let's check if we can query some state of the manager.
    "function isSupportedTickSpacing(int24 tickSpacing) external view returns (bool)",
    "function isSupportedFee(uint24 fee) external view returns (bool)",
    "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
  ];

  const pm = new ethers.Contract(pmAddress, abi, provider);

  console.log("Checking supported tick spacings...");
  for (const ts of [10, 60, 200]) {
    try {
      const ok = await pm.isSupportedTickSpacing(ts);
      console.log(`isSupportedTickSpacing(${ts}):`, ok);
    } catch (e) {
      console.log(`isSupportedTickSpacing(${ts}) failed:`, e.message);
    }
  }

  // Let's check isSupportedFee
  try {
    const ok = await pm.isSupportedFee(8388608);
    console.log("isSupportedFee(8388608):", ok);
  } catch (e) {
    console.log("isSupportedFee(8388608) failed:", e.message);
  }
}

main().catch(console.error);
