import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const projectToken = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const hook = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";
  const fee = 8388608;
  const tickSpacing = 60;

  const currency0 = projectToken.toLowerCase() < weth.toLowerCase() ? projectToken : weth;
  const currency1 = projectToken.toLowerCase() < weth.toLowerCase() ? weth : projectToken;

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const poolId = ethers.keccak256(
    coder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [currency0, currency1, fee, tickSpacing, hook]
    )
  );

  console.log("Pool ID:", poolId);

  // Query StateView for slot0 & liquidity
  const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";
  const stateView = new ethers.Contract(
    stateViewAddress,
    [
      "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
      "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)"
    ],
    provider
  );

  try {
    const slot0 = await stateView.getSlot0(poolId);
    console.log("sqrtPriceX96:", slot0[0].toString());
    console.log("tick:", slot0[1].toString());
    console.log("protocolFee:", slot0[2].toString());
    console.log("lpFee:", slot0[3].toString());
  } catch (e) {
    console.log("Failed to query slot0:", e.message);
  }

  try {
    const liquidity = await stateView.getLiquidity(poolId);
    console.log("liquidity:", liquidity.toString());
  } catch (e) {
    console.log("Failed to query liquidity:", e.message);
  }
}

main().catch(console.error);
