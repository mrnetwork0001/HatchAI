import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Checking selector compiled by Solidity...");
  const HatchHook = await ethers.getContractFactory("HatchHook");
  
  // We can query selector from the interface
  const iface = HatchHook.interface;
  const afterInitFragment = iface.getFunction("afterInitialize");
  console.log("afterInitialize selector from interface:", afterInitFragment.selector);

  // Expected selector from Uniswap V4 IHooks is 0x150b90f4.
  console.log("Expected selector:", "0x150b90f4");
  console.log("Match:", afterInitFragment.selector === "0x150b90f4");
}

main().catch(console.error);
