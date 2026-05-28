import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const hookAddress = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";
  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";
  const user = "0x1cE88a153ADD64802376d882309F4Bb2574488F4";

  const hookContract = new ethers.Contract(
    hookAddress,
    [
      "function lastSwapTimestamp(bytes32 poolId, address user) external view returns (uint256)"
    ],
    provider
  );

  try {
    const ts = await hookContract.lastSwapTimestamp(poolId, user);
    console.log("Last Swap Timestamp for User:", ts.toString());
    const block = await provider.getBlock("latest");
    console.log("Current Block Timestamp:", block.timestamp);
    console.log("Diff (seconds):", block.timestamp - Number(ts));
  } catch (e) {
    console.error("Failed to query last swap timestamp:", e.message);
  }
}

main().catch(console.error);
