import { ethers } from "ethers";

async function scanRpc(rpcUrl) {
  console.log(`\nConnecting to RPC: ${rpcUrl}...`);
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
    const abi = ["function extsload(bytes32 slot) external view returns (bytes32)"];
    const pm = new ethers.Contract(pmAddress, abi, provider);

    // Call extsload(0) to verify connection works
    const test = await pm.extsload(ethers.zeroPadValue("0x00", 32));
    console.log(`Connection test OK! Slot 0: ${test}`);

    const tickSpacings = [10, 60, 200];
    const coder = ethers.AbiCoder.defaultAbiCoder();

    for (const ts of tickSpacings) {
      console.log(`Scanning slots 1 to 150 for tickSpacing: ${ts}...`);
      const promises = [];
      const slots = [];
      for (let slot = 1; slot <= 150; slot++) {
        const encoded = coder.encode(["uint256", "uint256"], [ts, slot]);
        const hash = ethers.keccak256(encoded);
        slots.push(slot);
        promises.push(pm.extsload(hash).catch(() => ethers.ZeroHash));
      }

      const results = await Promise.all(promises);
      let found = false;
      for (let i = 0; i < results.length; i++) {
        const val = results[i];
        const slot = slots[i];
        if (val !== ethers.ZeroHash) {
          console.log(`Found enabled tickSpacing ${ts} at slot index ${slot}!`);
          console.log(`Value: ${val}`);
          console.log(`As BigInt: ${BigInt(val).toString()}`);
          found = true;
        }
      }
      if (!found) {
        console.log(`tickSpacing ${ts} was NOT found in slots 1-150.`);
      }
    }
    return true;
  } catch (e) {
    console.log(`RPC scan failed: ${e.message}`);
    return false;
  }
}

async function main() {
  const rpcs = [
    "https://rpc.xlayer.tech"
  ];
  for (const rpc of rpcs) {
    const ok = await scanRpc(rpc);
    if (ok) break;
  }
}

main().catch(console.error);
