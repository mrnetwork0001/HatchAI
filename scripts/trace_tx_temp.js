import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const txHash = "0x4615e9491361e3ab010dd7cd49031482621b80552aa94586c76fbf76fc98a831";
  
  console.log("Fetching transaction...");
  const tx = await provider.getTransaction(txHash);
  if (!tx) {
    console.log("Transaction not found");
    return;
  }
  
  console.log("Transaction Details:");
  console.log("To:", tx.to);
  console.log("From:", tx.from);
  console.log("Gas Limit:", tx.gasLimit.toString());
  console.log("Gas Price:", tx.gasPrice?.toString());
  console.log("Value:", ethers.formatEther(tx.value));
  console.log("Data (length):", tx.data.length);

  console.log("\nFetching receipt...");
  const receipt = await provider.getTransactionReceipt(txHash);
  if (receipt) {
    console.log("Receipt status:", receipt.status); // 0 = failed, 1 = success
    console.log("Gas Used:", receipt.gasUsed.toString());
    console.log("Block Number:", receipt.blockNumber);
  }

  // Simulate/trace call
  console.log("\nSimulating call to get revert reason...");
  try {
    const code = await provider.call({
      to: tx.to,
      from: tx.from,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
      blockTag: receipt ? receipt.blockNumber - 1 : undefined
    });
    console.log("Call returned (no revert?):", code);
  } catch (err) {
    console.log("Revert Error Details:");
    console.log("Error message:", err.message);
    if (err.data) {
      console.log("Revert data:", err.data);
    } else {
      console.log("No revert data in error, printing full error...");
      console.log(JSON.stringify(err));
    }
  }
}

main().catch(console.error);
