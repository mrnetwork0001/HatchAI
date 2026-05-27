/**
 * Deep diagnostic: Try to trace what exact function the PoolManager calls on afterInitialize.
 * Also test with hooks = address(0) to isolate if the issue is hook-related.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const newHatchHookAddress = "0x160f9676Eb396993eFc38aF43b8cD55f8DD950C0";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

  const correctAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, correctAbi, provider);

  // Test 1: Initialize with NO hook (address(0)) to see if pool creation works at all
  console.log("=== Test 1: Initialize with hooks = address(0) ===");
  const poolKeyNoHook = {
    currency0,
    currency1,
    fee: 3000,      // static fee (not dynamic)
    tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  try {
    const tx = await pm.initialize.populateTransaction(poolKeyNoHook, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS! Pool with no hook can be initialized!");
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data);
  }

  // Test 2: Initialize with hook but static fee
  console.log("\n=== Test 2: Initialize with hook + static fee 3000 ===");
  const poolKeyStaticFee = {
    currency0,
    currency1,
    fee: 3000,
    tickSpacing: 60,
    hooks: newHatchHookAddress
  };

  try {
    const tx = await pm.initialize.populateTransaction(poolKeyStaticFee, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS!");
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) {
      console.log("Revert data:", err.data);
      const selector = err.data?.substring(0, 10);
      const knownErrors = {
        "0x90bfb865": "HookAddressNotValid(address)",
        "0x75383637": "PoolAlreadyInitialized",
        "0xd2c9b8b4": "InvalidSqrtPrice",
        "0xd4e3ea47": "CurrencyNotSorted",
      };
      if (knownErrors[selector]) console.log("Decoded error:", knownErrors[selector]);
    }
  }

  // Test 3: Dynamic fee with hook
  console.log("\n=== Test 3: Initialize with hook + dynamic fee 0x800000 ===");
  const poolKeyDynamic = {
    currency0,
    currency1,
    fee: 8388608,
    tickSpacing: 60,
    hooks: newHatchHookAddress
  };

  try {
    const tx = await pm.initialize.populateTransaction(poolKeyDynamic, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS!");
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) {
      console.log("Revert data:", err.data);
    }
  }

  // Test 4: Check if PoolManager's bytecode contains the afterInitialize selector
  console.log("\n=== Test 4: Check PoolManager bytecode for afterInitialize selectors ===");
  const pmCode = await provider.getCode(poolManagerAddress);
  const oldSelector = "6fe7e6eb"; // old 4-arg afterInitialize
  const newSelector = "a910f80f"; // new 5-arg afterInitialize
  console.log("PM code contains old afterInitialize selector (4-arg):", pmCode.includes(oldSelector));
  console.log("PM code contains new afterInitialize selector (5-arg):", pmCode.includes(newSelector));

  // Also check what afterInitialize selector the new hook contains
  const hookCode = await provider.getCode(newHatchHookAddress);
  console.log("\nNew hook code contains old afterInitialize selector (4-arg):", hookCode.includes(oldSelector));
  console.log("New hook code contains new afterInitialize selector (5-arg):", hookCode.includes(newSelector));

  // Test 5: Check if maybe the issue is with `eth_call` on X Layer
  // Try using `estimateGas` instead, which gives better error info
  console.log("\n=== Test 5: estimateGas with dynamic fee + hook ===");
  try {
    const tx = await pm.initialize.populateTransaction(poolKeyDynamic, sqrtPriceX96, "0x", { from: callerAddress });
    const gas = await provider.estimateGas({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ Estimated gas:", gas.toString());
  } catch (err) {
    console.log("❌ estimateGas failed:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data);
  }
}

main().catch(console.error);
