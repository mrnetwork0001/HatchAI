/**
 * Verify the newly deployed hook has both immutable variables correctly embedded
 * and test that it works with the PoolManager.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const newHookAddress = "0x160f9676Eb396993eFc38aF43b8cD55f8DD950C0";

  const hookAbi = [
    "function manager() external view returns (address)",
    "function weth() external view returns (address)",
    "function getHookPermissions() external pure returns ((bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool))"
  ];
  const hook = new ethers.Contract(newHookAddress, hookAbi, provider);

  console.log("=== New hook verification ===");
  
  try {
    const m = await hook.manager();
    console.log("✅ manager():", m);
  } catch (e) {
    console.log("❌ manager() failed:", e.message?.substring(0, 200));
  }

  try {
    const w = await hook.weth();
    console.log("✅ weth():", w);
  } catch (e) {
    console.log("❌ weth() failed:", e.message?.substring(0, 200));
  }

  try {
    const perms = await hook.getHookPermissions();
    console.log("✅ permissions:", perms);
  } catch (e) {
    console.log("❌ permissions failed:", e.message?.substring(0, 200));
  }

  // Check bytecode
  const code = await provider.getCode(newHookAddress);
  const pmAddr = "360e68faccca8ca495c1b759fd9eee466db9fb32";
  const wethAddr = "5a77f1443d16ee5761d310e38b62f77f726bc71c";
  console.log("\nBytecode length:", (code.length - 2) / 2, "bytes");
  console.log("PoolManager address in bytecode:", code.toLowerCase().includes(pmAddr));
  console.log("WETH address in bytecode:", code.toLowerCase().includes(wethAddr));

  // Hook permission bits
  const hookAddrBigInt = BigInt(newHookAddress);
  const lower14 = hookAddrBigInt & 0x3FFFn;
  console.log("\nHook address lower 14 bits:", "0x" + lower14.toString(16));
  console.log("Matches 0x10C0:", lower14 === 0x10C0n);

  // Now the real test: simulate initialize via the PoolManager (2-arg version)
  console.log("\n=== Simulate pool initialize with new hook (2-arg) ===");
  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
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

  // Dynamic fee
  const poolKey = {
    currency0, currency1,
    fee: 8388608, tickSpacing: 60,
    hooks: newHookAddress
  };

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

  // Also simulate afterInitialize directly from PoolManager
  console.log("\n=== Direct afterInitialize from PoolManager ===");
  const hookDirectAbi = [
    "function afterInitialize(address sender, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, int24 tick) external returns (bytes4)"
  ];
  const hookDirect = new ethers.Contract(newHookAddress, hookDirectAbi, provider);
  try {
    const tx = await hookDirect.afterInitialize.populateTransaction(callerAddress, poolKey, sqrtPriceX96, 0);
    const result = await provider.call({ to: tx.to, from: poolManagerAddress, data: tx.data });
    console.log("✅ afterInitialize returned:", result);
  } catch (err) {
    console.log("❌ afterInitialize REVERTED:", err.message?.substring(0, 300));
  }
}

main().catch(console.error);
