/**
 * Final verification: test the correctly compiled hook with the X Layer PoolManager.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const newHookAddress = "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0";
  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  // 1. Verify hook basics
  console.log("=== Hook verification ===");
  const hookAbi = [
    "function manager() external view returns (address)",
    "function weth() external view returns (address)",
    "function getHookPermissions() external pure returns ((bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool))"
  ];
  const hook = new ethers.Contract(newHookAddress, hookAbi, provider);

  const mgr = await hook.manager();
  console.log("manager():", mgr, mgr.toLowerCase() === poolManagerAddress ? "✅" : "❌");

  const weth = await hook.weth();
  console.log("weth():", weth, weth.toLowerCase() === wethAddress ? "✅" : "❌");

  const perms = await hook.getHookPermissions();
  console.log("permissions:", { afterInit: perms[1], beforeSwap: perms[6], afterSwap: perms[7] });

  // 2. Verify correct selectors in bytecode
  const code = await provider.getCode(newHookAddress);
  const sel4arg = "6fe7e6eb"; // afterInitialize(address,PoolKey,uint160,int24)
  const sel5arg = "a910f80f"; // afterInitialize(address,PoolKey,uint160,int24,bytes)
  console.log("\nBytecode has 4-arg afterInitialize (6fe7e6eb):", code.includes(sel4arg), code.includes(sel4arg) ? "✅" : "❌");
  console.log("Bytecode has 5-arg afterInitialize (a910f80f):", code.includes(sel5arg), !code.includes(sel5arg) ? "✅ (not expected)" : "❌ (unexpected!)");

  // 3. Test direct afterInitialize call from PoolManager
  console.log("\n=== Direct afterInitialize call (from PM address) ===");
  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;
  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

  const poolKey = {
    currency0, currency1,
    fee: 8388608, tickSpacing: 60,
    hooks: newHookAddress
  };

  const afterInitAbi = [
    "function afterInitialize(address sender, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, int24 tick) external returns (bytes4)"
  ];
  const hookDirect = new ethers.Contract(newHookAddress, afterInitAbi, provider);

  try {
    const tx = await hookDirect.afterInitialize.populateTransaction(callerAddress, poolKey, sqrtPriceX96, 0);
    const result = await provider.call({ to: tx.to, from: poolManagerAddress, data: tx.data });
    console.log("✅ afterInitialize returned:", result, "(should be 0x6fe7e6eb)");
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 200));
  }

  // 4. The real test: simulate PoolManager.initialize
  console.log("\n=== Simulate PoolManager.initialize ===");
  const pmAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, pmAbi, provider);

  try {
    const tx = await pm.initialize.populateTransaction(poolKey, sqrtPriceX96, { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("✅ SUCCESS! Pool can be initialized!");
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("❌ REVERTED:", err.message?.substring(0, 300));
    if (err.data) console.log("Revert data:", err.data?.substring(0, 200));
  }
}

main().catch(console.error);
