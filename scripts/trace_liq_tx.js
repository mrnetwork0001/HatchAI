import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech", undefined, { batchMaxCount: 1 });
const txHash = "0x8409b54223da21b0cf5fcf686e9f61badb2627be268e2c827ca0209fe2fca057";

const tx = await provider.getTransaction(txHash);
console.log("To:", tx.to);
console.log("Data (first 200):", tx.data.slice(0, 200));

const iface = new ethers.Interface([
  "function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable"
]);

const decoded = iface.parseTransaction({ data: tx.data });
console.log("\nDeadline:", decoded.args[1].toString());

const unlockData = decoded.args[0];
const innerDecoded = ethers.AbiCoder.defaultAbiCoder().decode(["bytes", "bytes[]"], unlockData);
const actions = innerDecoded[0];
const params = innerDecoded[1];
console.log("Actions:", Array.from(ethers.getBytes(actions)).map(b => "0x" + b.toString(16).padStart(2, "0")));
console.log("Param arrays:", params.length);

// Decode MINT_POSITION
const mintDecoded = ethers.AbiCoder.defaultAbiCoder().decode(
  ["tuple(address,address,uint24,int24,address)", "int24", "int24", "uint256", "uint128", "uint128", "address", "bytes"],
  params[0]
);
console.log("\n=== MINT_POSITION ===");
console.log("currency0:", mintDecoded[0][0]);
console.log("currency1:", mintDecoded[0][1]);
console.log("fee:", mintDecoded[0][2].toString());
console.log("tickSpacing:", mintDecoded[0][3].toString());
console.log("hooks:", mintDecoded[0][4]);
console.log("tickLower:", mintDecoded[1].toString());
console.log("tickUpper:", mintDecoded[2].toString());
console.log("liquidity:", mintDecoded[3].toString());
console.log("amount0Max:", ethers.formatEther(mintDecoded[4]));
console.log("amount1Max:", ethers.formatEther(mintDecoded[5]));
console.log("recipient:", mintDecoded[6]);

const settleDecoded = ethers.AbiCoder.defaultAbiCoder().decode(["address", "address"], params[1]);
console.log("\n=== SETTLE_PAIR ===");
console.log("currency0:", settleDecoded[0]);
console.log("currency1:", settleDecoded[1]);

// Check Permit2
console.log("\n=== Permit2 Check ===");
const permit2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const code = await provider.getCode(permit2);
console.log("Permit2 deployed:", code.length > 2 ? "YES (" + code.length + " bytes)" : "NO");

// Simulate
console.log("\n=== Simulation ===");
try {
  await provider.call({ to: tx.to, data: tx.data, from: tx.from, blockTag: tx.blockNumber - 1 });
  console.log("Simulation: SUCCESS");
} catch (e) {
  console.log("Simulation revert:", e.message?.slice(0, 300));
  if (e.data) console.log("Revert data:", e.data);
}
