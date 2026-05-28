import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech"); // X Layer Mainnet
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";

  const tokenCode = await provider.getCode(projectToken);
  const wethCode = await provider.getCode(weth);

  console.log(`Project Token (${projectToken}) code length on Mainnet: ${tokenCode.length} bytes (is deployed: ${tokenCode !== "0x"})`);
  console.log(`WETH (${weth}) code length on Mainnet: ${wethCode.length} bytes (is deployed: ${wethCode !== "0x"})`);
}

main().catch(console.error);
