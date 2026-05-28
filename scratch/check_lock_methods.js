import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  const code = await provider.getCode(poolManagerAddress);
  console.log("PoolManager code size:", code.length);

  // Compute selectors
  const unlockSel = ethers.id("unlock(bytes)").slice(2, 10);
  const lockSel = ethers.id("lock(bytes)").slice(2, 10);

  console.log("unlock(bytes) selector (0x" + unlockSel + "):", code.includes(unlockSel));
  console.log("lock(bytes) selector (0x" + lockSel + "):", code.includes(lockSel));

  // Let's also check callbacks
  const unlockCallbackSel = ethers.id("unlockCallback(bytes)").slice(2, 10);
  const lockCallbackSel = ethers.id("lockCallback(bytes)").slice(2, 10);

  console.log("unlockCallback(bytes) selector (0x" + unlockCallbackSel + "):", code.includes(unlockCallbackSel));
  console.log("lockCallback(bytes) selector (0x" + lockCallbackSel + "):", code.includes(lockCallbackSel));
}

main().catch(console.error);
