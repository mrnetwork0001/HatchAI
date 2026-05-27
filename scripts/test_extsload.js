import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  const abi = [
    "function extsload(bytes32 slot) external view returns (bytes32)"
  ];

  const pm = new ethers.Contract(pmAddress, abi, provider);

  console.log("Calling extsload(0) on PoolManager...");
  try {
    const val = await pm.extsload(ethers.zeroPadValue("0x00", 32));
    console.log("extsload(0) returned:", val);
  } catch (e) {
    console.log("extsload(0) failed:", e.message);
  }
}

main().catch(console.error);
