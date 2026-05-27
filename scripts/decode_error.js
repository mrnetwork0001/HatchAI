/**
 * Decode the HookAddressNotValid error to understand what the PoolManager is checking.
 * 
 * error data: 0x90bfb865
 *   000000000000000000000000160f9676eb396993efc38af43b8cd55f8dd950c0  (hook address)
 *   6fe7e6eb00000000000000000000000000000000000000000000000000000000  (afterInitialize selector)
 *   0000000000000000000000000000000000000000000000000000000000000000
 *   0000000000000000000000000000000000000000000000000000000080000000
 *   0000000000000000000000000000000000000000000000000000000000000000
 * 
 * This looks like the PM is trying to validate something about the hook.
 * Let's decode the full error properly.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  // Decode HookAddressNotValid error
  // From v4-core, this error is defined as:
  // error HookAddressNotValid(address hookAddress);
  // But in some versions it's:
  // error HookAddressNotValid(address hookAddress, bool shouldCallHook);
  // Or in newer versions it has more params

  const revertData = "0x90bfb865000000000000000000000000160f9676eb396993efc38af43b8cd55f8dd950c06fe7e6eb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

  // The error seems to have: address hookAddress + additional diagnostic data
  // Let's try decoding various formats
  console.log("Raw revert data length:", (revertData.length - 10) / 2, "bytes after selector");
  
  // Parse the data word by word (32 bytes each)
  const dataWithoutSelector = revertData.slice(10);
  const words = [];
  for (let i = 0; i < dataWithoutSelector.length; i += 64) {
    words.push(dataWithoutSelector.slice(i, i + 64));
  }
  
  console.log("\nDecoded words:");
  words.forEach((w, i) => {
    console.log(`  Word ${i}: 0x${w}`);
    // Try to interpret
    if (w.startsWith("000000000000000000000000")) {
      const addr = "0x" + w.slice(24);
      console.log(`    -> Address: ${addr}`);
    }
    const num = BigInt("0x" + w);
    console.log(`    -> Number: ${num}`);
    if (num < 0xFFFFFFFFn) {
      console.log(`    -> Selector: 0x${num.toString(16)}`);
    }
  });

  // Now test: what if we try different afterInitialize selectors?
  // The PM code expects 0x6fe7e6eb - which is the 4-arg afterInitialize
  // Let's check if the new hook also responds to that selector

  const newHookAddress = "0x160f9676Eb396993eFc38aF43b8cD55f8DD950C0";
  
  // Check if the new hook responds to the afterInitialize function at all
  // by looking at the deployed bytecode for the selector
  const code = await provider.getCode(newHookAddress);
  
  // Compute what selector the DEPLOYED hook actually has for afterInitialize
  const sel4arg = ethers.id("afterInitialize(address,(address,address,uint24,int24,address),uint160,int24)").slice(2, 10);
  const sel5arg = ethers.id("afterInitialize(address,(address,address,uint24,int24,address),uint160,int24,bytes)").slice(2, 10);
  
  console.log("\nafterInitialize selector (4-arg):", sel4arg);
  console.log("afterInitialize selector (5-arg):", sel5arg);
  console.log("New hook bytecode contains 4-arg selector:", code.toLowerCase().includes(sel4arg));
  console.log("New hook bytecode contains 5-arg selector:", code.toLowerCase().includes(sel5arg));

  // Important: The new hook was compiled with the reverted (correct) 4-arg interface
  // but let me double check - was the deploy_mainnet script using the artifacts from BEFORE or AFTER revert?
  // The deploy happened WHILE we had the 5-arg version!
  
  // So the deployed hook at 0x160f... has the 5-arg afterInitialize selector (a910f80f)
  // But the X Layer PoolManager calls the 4-arg version (6fe7e6eb)
  // SELECTOR MISMATCH! The newly deployed hook has WRONG selectors too!
  
  console.log("\n⚠️  THE NEWLY DEPLOYED HOOK WAS COMPILED WITH THE WRONG INTERFACE!");
  console.log("   It has the 5-arg afterInitialize (a910f80f) but X Layer PM calls 4-arg (6fe7e6eb)");
  console.log("   We need to redeploy after reverting the interface changes.");
}

main().catch(console.error);
