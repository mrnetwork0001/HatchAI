import { ethers } from "ethers";

const abi = [
  "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (int256 delta)"
];
const iface = new ethers.Interface(abi);

let data = "0xf3cd914c0000000000000000000000003d7e67d7fbdfd349398c8e06e92baf91504a69ac0000000000000000000000005a77f1443d16ee5761d310e38b62f77f726bc71c0000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000b2daac3fc51e958f89a6346f92ef7542805150c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006d23ad5f8000000000000000000000000000fffd8963efd1fc6a506488495d951d5263988d2500000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000000";

data = data.trim().toLowerCase();
console.log("Length:", data.length);

try {
  const decoded = iface.decodeFunctionData("swap", data);
  console.log("Decoded PoolKey:");
  console.log("  currency0:", decoded[0].currency0);
  console.log("  currency1:", decoded[0].currency1);
  console.log("  fee:", decoded[0].fee.toString());
  console.log("  tickSpacing:", decoded[0].tickSpacing.toString());
  console.log("  hooks:", decoded[0].hooks);

  console.log("\nDecoded SwapParams:");
  console.log("  zeroForOne:", decoded[1].zeroForOne);
  console.log("  amountSpecified:", decoded[1].amountSpecified.toString());
  console.log("  sqrtPriceLimitX96:", decoded[1].sqrtPriceLimitX96.toString());
  console.log("\nDecoded HookData:", decoded[2]);
} catch (e) {
  console.error("Error decoding:", e);
}
