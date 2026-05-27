import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const projectTokenAddress = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  
  const abi = [
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function balanceOf(address account) external view returns (uint256)"
  ];

  const token = new ethers.Contract(projectTokenAddress, abi, provider);

  console.log("Checking token details...");
  try {
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    console.log(`Token Name: ${name}`);
    console.log(`Token Symbol: ${symbol}`);
    console.log(`Token Decimals: ${decimals}`);
    
    const creator = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";
    const balance = await token.balanceOf(creator);
    console.log(`Creator Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  } catch (e) {
    console.log("Failed to query token details:", e.message);
  }
}

main().catch(console.error);
