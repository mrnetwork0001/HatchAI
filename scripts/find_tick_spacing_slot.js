import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Searching for tickSpacing 60 in PoolManager mappings...");
  
  // We'll scan mapping slot indices 1 to 25.
  // For each slot index, we compute keccak256(encode(key, slot_index))
  // key is int24 60.
  const key = 60;
  
  for (let slotIndex = 1; slotIndex <= 25; slotIndex++) {
    // abi encode [int256, uint256] or [uint256, uint256]?
    // In Solidity, mapping keys are padded to 32 bytes.
    // The key is placed first, then the mapping's slot index.
    const coder = ethers.AbiCoder.defaultAbiCoder();
    
    // Test both padded representation (uint256/int256)
    const encoded = coder.encode(["uint256", "uint256"], [key, slotIndex]);
    const hash = ethers.keccak256(encoded);
    
    try {
      const val = await provider.getStorage(pmAddress, hash);
      if (val !== ethers.ZeroHash) {
        console.log(`Mapping slotIndex ${slotIndex} -> Hash ${hash} has value: ${val}`);
        console.log(`As BigInt: ${BigInt(val).toString()}`);
      }
    } catch (e) {
      console.log(`Failed at slotIndex ${slotIndex}: ${e.message}`);
    }
  }
}

main().catch(console.error);
