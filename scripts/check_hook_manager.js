import { ethers } from "ethers";

async function main() {
  const rpcs = [
    "https://xlayerrpc.okx.com",
    "https://rpc.ankr.com/xlayer",
    "https://rpc.xlayer.tech"
  ];

  let provider;
  for (const rpc of rpcs) {
    try {
      console.log(`Connecting to RPC: ${rpc}...`);
      const p = new ethers.JsonRpcProvider(rpc);
      await p.getNetwork();
      provider = p;
      console.log("Connected successfully!");
      break;
    } catch (e) {
      console.log(`Failed to connect to ${rpc}: ${e.message}`);
    }
  }

  if (!provider) {
    console.error("All RPC providers failed!");
    return;
  }
  
  const hatchHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";
  const abi = [
    "function manager() external view returns (address)"
  ];
  
  const contract = new ethers.Contract(hatchHookAddress, abi, provider);
  try {
    const managerAddress = await contract.manager();
    console.log(`HatchHook manager address: ${managerAddress}`);
    console.log(`Expected PoolManager address: 0x360e68faccca8ca495c1b759fd9eee466db9fb32`);
    console.log(`Match: ${managerAddress.toLowerCase() === "0x360e68faccca8ca495c1b759fd9eee466db9fb32".toLowerCase()}`);
  } catch (e) {
    console.log(`Failed to query manager: ${e.message}`);
  }
}

main().catch(console.error);
