import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Searching for enabled tick spacings in PoolManager mappings...");
  
  // We'll scan mapping slot indices 1 to 100.
  // Standard tickSpacings to check: 10, 60, 200
  const tickSpacings = [10, 60, 200];
  const coder = ethers.AbiCoder.defaultAbiCoder();

  for (const ts of tickSpacings) {
    console.log(`\nScanning for tickSpacing: ${ts}`);
    for (let slotIndex = 0; slotIndex <= 50; slotIndex++) {
      // Compute keccak256 of padded key and padded slot
      const encoded = coder.encode(["uint256", "uint256"], [ts, slotIndex]);
      const hash = ethers.keccak256(encoded);
      
      try {
        const val = await provider.getStorage(pmAddress, hash);
        if (val !== ethers.ZeroHash) {
          console.log(`  Found! Slot index ${slotIndex} -> Hash ${hash} has value: ${val}`);
          console.log(`  As BigInt: ${BigInt(val).toString()}`);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

main().catch(console.error);
