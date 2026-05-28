import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
  const managerAddress = "0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D";
  const code = await provider.getCode(managerAddress);
  
  const init2 = "6276cbbe"; // 2-arg: initialize(PoolKey,uint160)
  const init3 = "695c5bf5"; // 3-arg: initialize(PoolKey,uint160,bytes)
  
  console.log("MockPoolManager contains 2-arg initialize selector:", code.toLowerCase().includes(init2));
  console.log("MockPoolManager contains 3-arg initialize selector:", code.toLowerCase().includes(init3));
}

main().catch(console.error);
