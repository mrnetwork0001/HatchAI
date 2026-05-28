import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const projectToken = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const hook = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";

  const pm = new ethers.Contract(
    poolManagerAddress,
    [
      "function pools(bytes32) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
      "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
    ],
    provider
  );

  const uyo = new ethers.Contract(
    projectToken,
    [
      "function balanceOf(address) external view returns (uint256)",
      "function decimals() external view returns (uint8)"
    ],
    provider
  );

  const wethContract = new ethers.Contract(
    weth,
    [
      "function balanceOf(address) external view returns (uint256)",
      "function decimals() external view returns (uint8)"
    ],
    provider
  );

  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";
  console.log("Querying Slot0 and balances for poolId:", poolId);

  try {
    const slot0 = await pm.getSlot0(poolId);
    console.log("Slot0 via getSlot0:");
    console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("  tick:", slot0.tick.toString());
  } catch (e) {
    try {
      const slot0 = await pm.pools(poolId);
      console.log("Slot0 via pools:");
      console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
      console.log("  tick:", slot0.tick.toString());
    } catch (err) {
      console.log("Failed to query slot0:", err.message);
    }
  }

  const uyoBal = await uyo.balanceOf(poolManagerAddress);
  const wethBal = await wethContract.balanceOf(poolManagerAddress);
  console.log(`PoolManager UYO balance: ${ethers.formatEther(uyoBal)} UYO`);
  console.log(`PoolManager WETH balance: ${ethers.formatEther(wethBal)} WETH`);

  const uyoHookBal = await uyo.balanceOf(hook);
  const wethHookBal = await wethContract.balanceOf(hook);
  console.log(`HatchHook UYO balance: ${ethers.formatEther(uyoHookBal)} UYO`);
  console.log(`HatchHook WETH balance: ${ethers.formatEther(wethHookBal)} WETH`);
}

main().catch(console.error);
