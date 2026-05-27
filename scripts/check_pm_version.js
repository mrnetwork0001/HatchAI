/**
 * Check which version of initialize() the X Layer PoolManager actually uses.
 * Check if it's the 2-arg or 3-arg version.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  
  const pmCode = await provider.getCode(poolManagerAddress);
  
  // Check initialize selectors
  const initOld = "6276cbbe"; // initialize(PoolKey,uint160) - 2 arg
  const initNew = "695c5bf5"; // initialize(PoolKey,uint160,bytes) - 3 arg
  
  console.log("PM code contains 2-arg initialize selector:", pmCode.includes(initOld));
  console.log("PM code contains 3-arg initialize selector:", pmCode.includes(initNew));
  
  // Check all hook-related selectors
  const selectors = {
    "beforeInitialize_4arg": ethers.id("beforeInitialize(address,(address,address,uint24,int24,address),uint160,bytes)").slice(2,10),
    "afterInitialize_4arg": ethers.id("afterInitialize(address,(address,address,uint24,int24,address),uint160,int24)").slice(2,10),
    "afterInitialize_5arg": ethers.id("afterInitialize(address,(address,address,uint24,int24,address),uint160,int24,bytes)").slice(2,10),
    "beforeSwap_4arg": ethers.id("beforeSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),bytes)").slice(2,10),
    "afterSwap_5arg_old": ethers.id("afterSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),int256,bytes)").slice(2,10),
  };
  
  console.log("\nSelector analysis in PoolManager bytecode:");
  for (const [name, sel] of Object.entries(selectors)) {
    console.log(`  ${name} (0x${sel}): ${pmCode.includes(sel) ? "FOUND" : "NOT FOUND"}`);
  }

  // Now test: even with NO hooks, does a basic pool initialization work?
  // Use the 2-arg version to match the actual PM
  console.log("\n=== Test: 2-arg initialize with hooks=address(0) ===");
  const oldAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, oldAbi, provider);
  
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const proj = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const currency0 = proj.toLowerCase() < weth.toLowerCase() ? proj : weth;
  const currency1 = proj.toLowerCase() < weth.toLowerCase() ? weth : proj;
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  // No hooks
  const poolKeyNoHook = {
    currency0, currency1,
    fee: 3000, tickSpacing: 60,
    hooks: ethers.ZeroAddress
  };

  try {
    const tx = await pm.initialize.populateTransaction(poolKeyNoHook, sqrtPriceX96, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ 2-arg initialize SUCCESS!");
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data);
  }
  
  // 3-arg version - no hooks
  console.log("\n=== Test: 3-arg initialize with hooks=address(0) ===");
  const newAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const pm3 = new ethers.Contract(poolManagerAddress, newAbi, provider);
  
  try {
    const tx = await pm3.initialize.populateTransaction(poolKeyNoHook, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ 3-arg initialize SUCCESS!");
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data);
  }
}

main().catch(console.error);
