import { ethers } from "ethers";

async function main() {
  const xlayerProvider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const arbitrumProvider = new ethers.JsonRpcProvider("https://arb1.統領.xyz"); // wait, let's use public arbitrum RPC:
  const arbProvider = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");

  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Fetching bytecode from X Layer mainnet...");
  const xlayerCode = await xlayerProvider.getCode(pmAddress);
  console.log(`X Layer bytecode length: ${xlayerCode.length}`);

  console.log("Fetching bytecode from Arbitrum mainnet...");
  try {
    const arbCode = await arbProvider.getCode(pmAddress);
    console.log(`Arbitrum bytecode length: ${arbCode.length}`);
    console.log(`Bytecode Match: ${xlayerCode === arbCode}`);
  } catch (e) {
    console.log("Failed to query Arbitrum:", e.message);
  }
}

main().catch(console.error);
