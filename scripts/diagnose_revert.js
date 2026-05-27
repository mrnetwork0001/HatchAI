/**
 * Diagnose why PoolManager.initialize reverts on X Layer Mainnet.
 *
 * The official Uniswap V4 PoolManager.initialize signature is:
 *   function initialize(PoolKey calldata key, uint160 sqrtPriceX96, bytes calldata hookData) external returns (int24 tick)
 *
 * But the frontend ABI and call were missing the `hookData` parameter!
 * This script tests both the broken (2-arg) and correct (3-arg) versions.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const hatchHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  
  // Use a dummy project token for testing
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  // Sort currencies
  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;

  console.log("currency0:", currency0);
  console.log("currency1:", currency1);

  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

  const poolKey = {
    currency0,
    currency1,
    fee: 8388608,   // DYNAMIC_FEE_FLAG
    tickSpacing: 60,
    hooks: hatchHookAddress
  };

  // ──────── Test 1: BROKEN ABI (2-arg, no hookData) ────────
  console.log("\n=== Test 1: BROKEN (missing hookData param) ===");
  const brokenAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
  ];
  const brokenPM = new ethers.Contract(poolManagerAddress, brokenAbi, provider);

  try {
    const tx = await brokenPM.initialize.populateTransaction(poolKey, sqrtPriceX96, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("SUCCESS (unexpected):", result);
  } catch (err) {
    console.log("REVERTED (expected):", err.message?.substring(0, 200));
  }

  // ──────── Test 2: CORRECT ABI (3-arg, with hookData) ────────
  console.log("\n=== Test 2: CORRECT (with hookData param) ===");
  const correctAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const correctPM = new ethers.Contract(poolManagerAddress, correctAbi, provider);

  try {
    const hookData = "0x"; // empty hookData
    const tx = await correctPM.initialize.populateTransaction(poolKey, sqrtPriceX96, hookData, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("SUCCESS:", result);
    // Decode the returned int24 tick
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data);
  }
}

main().catch(console.error);
