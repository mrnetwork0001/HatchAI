import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Reading first 30 storage slots of PoolManager...");
  for (let slot = 0; slot < 30; slot++) {
    try {
      const value = await provider.getStorage(pmAddress, slot);
      if (value !== ethers.ZeroHash) {
        console.log(`Slot ${slot}: ${value}`);
      }
    } catch (e) {
      console.log(`Failed to read slot ${slot}: ${e.message}`);
    }
  }
}

main().catch(console.error);
