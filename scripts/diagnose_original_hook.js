/**
 * Now that we know the X Layer PM uses 2-arg initialize and 4-arg afterInitialize,
 * let's test the ORIGINAL deployed hook to find out why it reverts.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const originalHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

  const pmAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, pmAbi, provider);

  // Test 1: Original hook with dynamic fee
  console.log("=== Test 1: Original hook + dynamic fee 0x800000 ===");
  const poolKeyDynamic = {
    currency0, currency1,
    fee: 8388608, tickSpacing: 60,
    hooks: originalHookAddress
  };
  try {
    const tx = await pm.initialize.populateTransaction(poolKeyDynamic, sqrtPriceX96, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS! Tick:", ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result)[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 200));
    if (err.data) console.log("Revert data:", err.data?.substring(0, 100));
  }

  // Test 2: Original hook with static fee 3000
  console.log("\n=== Test 2: Original hook + static fee 3000 ===");
  const poolKeyStatic = {
    currency0, currency1,
    fee: 3000, tickSpacing: 60,
    hooks: originalHookAddress
  };
  try {
    const tx = await pm.initialize.populateTransaction(poolKeyStatic, sqrtPriceX96, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS! Tick:", ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result)[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 200));
    if (err.data) console.log("Revert data:", err.data?.substring(0, 100));
  }

  // Test 3: Can we directly call afterInitialize on the original hook?
  console.log("\n=== Test 3: Direct call to original hook afterInitialize ===");
  const hookAbi = [
    "function afterInitialize(address sender, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, int24 tick) external returns (bytes4)",
    "function getHookPermissions() external pure returns ((bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool))",
    "function manager() external view returns (address)",
    "function weth() external view returns (address)"
  ];
  const hook = new ethers.Contract(originalHookAddress, hookAbi, provider);

  try {
    const mgr = await hook.manager();
    console.log("Hook's manager address:", mgr);
    console.log("Expected PoolManager:", poolManagerAddress);
    console.log("Match:", mgr.toLowerCase() === poolManagerAddress.toLowerCase());
  } catch (e) {
    console.log("Failed to read manager:", e.message?.substring(0, 200));
  }

  try {
    const w = await hook.weth();
    console.log("Hook's WETH address:", w);
    console.log("Expected WETH:", wethAddress);
    console.log("Match:", w.toLowerCase() === wethAddress.toLowerCase());
  } catch (e) {
    console.log("Failed to read weth:", e.message?.substring(0, 200));
  }

  try {
    const perms = await hook.getHookPermissions();
    console.log("Hook permissions:", perms);
  } catch (e) {
    console.log("Failed to read permissions:", e.message?.substring(0, 200));
  }

  // Test 4: Direct afterInitialize call simulating the PoolManager calling it
  console.log("\n=== Test 4: Simulate PoolManager calling afterInitialize ===");
  try {
    const tx = await hook.afterInitialize.populateTransaction(
      callerAddress,
      poolKeyDynamic,
      sqrtPriceX96,
      0
    );
    // Call from PoolManager address
    const result = await provider.call({ to: tx.to, from: poolManagerAddress, data: tx.data });
    console.log("✅ afterInitialize returned:", result);
  } catch (err) {
    console.log("❌ afterInitialize REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data?.substring(0, 200));
  }

  // Test 5: Can we call afterInitialize NOT from PoolManager (should fail with "Only PoolManager")
  console.log("\n=== Test 5: afterInitialize from random address (should fail with reason) ===");
  try {
    const tx = await hook.afterInitialize.populateTransaction(
      callerAddress,
      poolKeyDynamic,
      sqrtPriceX96,
      0
    );
    const result = await provider.call({ to: tx.to, from: callerAddress, data: tx.data });
    console.log("Unexpected success:", result);
  } catch (err) {
    console.log("Expected revert:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data?.substring(0, 200));
  }
}

main().catch(console.error);
