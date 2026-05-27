import { ethers } from "ethers";

const abi = [
  "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
];

const iface = new ethers.Interface(abi);

const data = "0x695c5bf500000000000000000000000027f2373d532b94cd060da9303e8aeb1794a58d610000000000000000000000005a77f1443d16ee5761d310e38b62f77f726bc71c0000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000029b7f2a8a328066d070a9fc08a013e49f04a90c000000000000000000000000000000000000000000002128aca937c37a000000000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000cd0a2370f2dc12c1802707b7d9ab3fec891e3c0200000000000000000000000027f2373d532b94cd060da9303e8aeb1794a58d610000000000000000000000000000000000000000000000000000000000015180000000000000000000000000000000000000000000000000000000000000c35000000000000000000000000000000000000000000000000000000000000003e80000000000000000000000000000000000000000019d971e4fe8401e74000000000000000000000000000000000000000000000000000000000000000000003c";

const decoded = iface.decodeFunctionData("initialize", data);

console.log("PoolKey:");
console.log("  currency0:", decoded[0][0]);
console.log("  currency1:", decoded[0][1]);
console.log("  fee:", decoded[0][2]);
console.log("  tickSpacing:", decoded[0][3]);
console.log("  hooks:", decoded[0][4]);
console.log("sqrtPriceX96:", decoded[1].toString());

const hookData = decoded[2];
console.log("HookData raw:", hookData);

const coder = ethers.AbiCoder.defaultAbiCoder();
const decodedHook = coder.decode(
  ["address", "address", "uint256", "uint24", "uint24", "uint256", "uint256"],
  hookData
);
console.log("HookData Decoded:");
console.log("  creator:", decodedHook[0]);
console.log("  projectToken:", decodedHook[1]);
console.log("  decayDuration:", decodedHook[2].toString());
console.log("  startFee:", decodedHook[3]);
console.log("  endFee:", decodedHook[4]);
console.log("  maxSwapAmount:", decodedHook[5].toString());
console.log("  cooldownDuration:", decodedHook[6].toString());
