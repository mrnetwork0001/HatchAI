import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const user = "0x1cE88a153ADD64802376d882309F4Bb2574488F4";
  const weth = "0x5A77f1443D16ee5761d310e38b62f77f726bC71c";
  const uyo = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
  const manager = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const router = "0xf958152c5252A40C722c191880d53e5f9d217905";

  const okbBal = await provider.getBalance(user);
  console.log("User Native OKB Balance:", ethers.formatEther(okbBal), "OKB");

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
    "function allowance(address, address) external view returns (uint256)"
  ];

  const wethContract = new ethers.Contract(weth, erc20Abi, provider);
  const uyoContract = new ethers.Contract(uyo, erc20Abi, provider);

  console.log("\n--- WETH Balances & Allowances ---");
  const userWeth = await wethContract.balanceOf(user);
  console.log("User WETH Balance:", ethers.formatEther(userWeth), "WETH");
  const pmWeth = await wethContract.balanceOf(manager);
  console.log("PoolManager WETH Balance:", ethers.formatEther(pmWeth), "WETH");
  const routerWethAllowance = await wethContract.allowance(user, router);
  console.log("User WETH Allowance to SwapRouter:", ethers.formatEther(routerWethAllowance), "WETH");

  console.log("\n--- UYO Balances & Allowances ---");
  const userUyo = await uyoContract.balanceOf(user);
  console.log("User UYO Balance:", ethers.formatEther(userUyo), "UYO");
  const pmUyo = await uyoContract.balanceOf(manager);
  console.log("PoolManager UYO Balance:", ethers.formatEther(pmUyo), "UYO");
  const routerUyoAllowance = await uyoContract.allowance(user, router);
  console.log("User UYO Allowance to SwapRouter:", ethers.formatEther(routerUyoAllowance), "UYO");
}

main().catch(console.error);
