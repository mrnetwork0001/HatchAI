/**
 * Check if the deployed hook bytecode responds to basic function calls.
 * The weth() call failing suggests the bytecode is corrupted.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const originalHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";

  const hookAbi = [
    "function manager() external view returns (address)",
    "function weth() external view returns (address)",
    "function getHookPermissions() external pure returns ((bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool))"
  ];
  const hook = new ethers.Contract(originalHookAddress, hookAbi, provider);

  // Test 1: manager() works
  console.log("=== Test manager() ===");
  try {
    const m = await hook.manager();
    console.log("✅ manager():", m);
  } catch (e) {
    console.log("❌ manager() failed:", e.message?.substring(0, 200));
  }

  // Test 2: weth() fails
  console.log("\n=== Test weth() ===");
  try {
    const w = await hook.weth();
    console.log("✅ weth():", w);
  } catch (e) {
    console.log("❌ weth() failed:", e.message?.substring(0, 200));
    // Try raw call
    const wethSelector = ethers.id("weth()").slice(0, 10);
    console.log("weth selector:", wethSelector);
    try {
      const raw = await provider.call({ to: originalHookAddress, data: wethSelector });
      console.log("raw result:", raw);
    } catch (e2) {
      console.log("raw call also failed:", e2.message?.substring(0, 100));
    }
  }

  // Test 3: Check getHookPermissions
  console.log("\n=== Test getHookPermissions() ===");
  try {
    const perms = await hook.getHookPermissions();
    console.log("✅ permissions:", perms);
  } catch (e) {
    console.log("❌ failed:", e.message?.substring(0, 200));
  }

  // Test 4: Check bytecode start (to see if it matches expected pattern)
  console.log("\n=== Bytecode analysis ===");
  const code = await provider.getCode(originalHookAddress);
  console.log("Code length:", code.length, "bytes (hex):", (code.length - 2) / 2, "bytes");
  console.log("First 100 chars:", code.substring(0, 100));

  // Check if weth and manager immutable addresses are embedded in bytecode
  const pmAddr = "360e68faccca8ca495c1b759fd9eee466db9fb32";
  const wethAddr = "5a77f1443d16ee5761d310e38b62f77f726bc71c";
  console.log("\nPoolManager address found in bytecode:", code.toLowerCase().includes(pmAddr));
  console.log("WETH address found in bytecode:", code.toLowerCase().includes(wethAddr));

  // Check if bytecode was compiled with viaIR (which stores immutables differently)
  // Let's search for the weth address with and without padding
  const wethPadded = "0000000000000000000000005a77f1443d16ee5761d310e38b62f77f726bc71c";
  console.log("WETH (32-byte padded) found in bytecode:", code.toLowerCase().includes(wethPadded));
}

main().catch(console.error);
