import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  const abi = [
    "function extsload(bytes32 slot) external view returns (bytes32)"
  ];
  const pm = new ethers.Contract(pmAddress, abi, provider);

  console.log("Searching for tickSpacing 60 in PoolManager mappings in parallel using extsload...");
  
  const tickSpacing = 60;
  const coder = ethers.AbiCoder.defaultAbiCoder();

  const promises = [];
  const slots = [];
  for (let slot = 1; slot <= 150; slot++) {
    const encoded = coder.encode(["uint256", "uint256"], [tickSpacing, slot]);
    const hash = ethers.keccak256(encoded);
    slots.push(slot);
    promises.push(pm.extsload(hash).catch(() => ethers.ZeroHash));
  }

  console.log("Sending 150 parallel extsload requests...");
  const results = await Promise.all(promises);
  console.log("Received all responses!");

  let found = false;
  for (let i = 0; i < results.length; i++) {
    const val = results[i];
    const slot = slots[i];
    if (val !== ethers.ZeroHash) {
      console.log(`Found enabled tickSpacing 60 at slot index ${slot}!`);
      console.log(`Value: ${val}`);
      console.log(`As BigInt: ${BigInt(val).toString()}`);
      found = true;
    }
  }

  if (!found) {
    console.log("Finished scan. tickSpacing 60 was NOT found in slots 1-150.");
  }
}

main().catch(console.error);
