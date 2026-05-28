import { ethers } from "ethers";

const projectToken = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
const hook = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";

const poolKey = {
  currency0: projectToken,
  currency1: weth,
  fee: 8388608,
  tickSpacing: 60,
  hooks: hook
};

// Encode PoolKey struct: (address, address, uint24, int24, address)
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "address", "uint24", "int24", "address"],
  [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
);

const poolId = ethers.keccak256(encoded);
console.log("Computed Pool ID:", poolId);
