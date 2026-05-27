import { ethers } from "ethers";

async function main() {
  // Try several RPC endpoints
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

  const txHash = "0xebc9e14d333f81ae8d4bd4fc0218504117e13608108896b5851d99fc4cae399e";

  console.log("Fetching transaction details...");
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.error("Transaction not found!");
    return;
  }

  console.log("Transaction details:");
  console.log(`From: ${tx.from}`);
  console.log(`To: ${tx.to}`);
  console.log(`Value: ${tx.value.toString()}`);
  console.log(`Gas limit: ${tx.gasLimit.toString()}`);
  console.log(`Gas price: ${tx.gasPrice?.toString()}`);
  console.log(`Data length: ${tx.data.length} characters`);

  console.log("\nSimulating call at parent block...");
  try {
    const code = await provider.call({
      from: tx.from,
      to: tx.to,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, tx.blockNumber - 1);
    console.log("Call result:", code);
  } catch (err) {
    console.error("Simulation error:");
    console.error(err);
    
    // Check if error is custom or has data
    let data = err.data;
    if (!data && err.error && err.error.data) {
      data = err.error.data;
    }
    if (data) {
      console.log(`Revert data: ${data}`);
      try {
        const reason = ethers.abiCoder.defaultAbiCoder().decode(["string"], data);
        console.log(`Decoded reason: ${reason}`);
      } catch (e) {
        // Try decoding as common custom errors
        console.log("Could not decode as string, checking if custom error...");
        
        // Uniswap V4 Custom Errors check
        // e.g. LOK (Locked) = 0xc69a0a0e
        // HookRevert = 0x5a3b2b8d or similar
        // Let's print the first 10 hex characters
        const selector = data.slice(0, 10);
        console.log(`Selector (first 4 bytes): ${selector}`);
        if (selector === "0x82b226e6") {
          console.log("Error selector matches: HookRevert");
        } else if (selector === "0xc69a0a0e") {
          console.log("Error selector matches: Locked");
        }
      }
    }
  }
}

main().catch(console.error);
