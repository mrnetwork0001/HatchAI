import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log("Forking X Layer Mainnet (LATEST block)...");
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://rpc.xlayer.tech"
        },
      },
    ],
  });

  const [deployer] = await ethers.getSigners();
  const userAddress = "0x1cE88a153ADD64802376d882309F4Bb2574488F4";
  
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [userAddress]
  });
  
  await deployer.sendTransaction({
    to: userAddress,
    value: ethers.parseEther("1.0")
  });

  const signer = await ethers.getSigner(userAddress);

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const projectToken = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const hookAddress = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";

  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();

  // Override the pre-deployed HatchHook bytecode on the fork with our local compiled code (preserving storage state)
  console.log("Replacing hook bytecode on fork with local compiled version...");
  const HatchHook = await ethers.getContractFactory("HatchHook");
  const tempHook = await HatchHook.deploy(poolManagerAddress, wethAddress);
  await tempHook.waitForDeployment();
  const tempHookAddress = await tempHook.getAddress();
  const hookCode = await network.provider.send("eth_getCode", [tempHookAddress]);
  await network.provider.send("hardhat_setCode", [hookAddress, hookCode]);
  console.log("Hook bytecode replaced!");

  const weth = new ethers.Contract(wethAddress, [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ], signer);

  await weth.approve(swapRouterAddress, ethers.MaxUint256);

  const uyo = new ethers.Contract(projectToken, [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)"
  ], signer);
  await uyo.approve(swapRouterAddress, ethers.MaxUint256);

  const poolKey = {
    currency0: projectToken,
    currency1: wethAddress,
    fee: 8388608,
    tickSpacing: 60,
    hooks: hookAddress
  };

  // zeroForOne=false: sell currency1 (WETH) to buy currency0 (UYO)
  // amountSpecified < 0: exact-input (user specifies how much WETH to spend)
  // sqrtPriceLimitX96 = MAX_SQRT_PRICE - 1 for zeroForOne=false
  const params = {
    zeroForOne: false,
    amountSpecified: -ethers.parseEther("0.00002"), // negative = exact-input (spend 0.00002 WETH)
    sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341n // MAX_SQRT_PRICE - 1
  };

  console.log("User WETH balance before swap:", ethers.formatEther(await weth.balanceOf(userAddress)));
  console.log("User UYO balance before swap:", ethers.formatEther(await uyo.balanceOf(userAddress)));

  console.log("\n=== Executing swap with POSITIVE amountSpecified ===");
  try {
    const tx = await swapRouter.connect(signer).swap(poolKey, params, "0x");
    const receipt = await tx.wait();
    console.log("✅ Swap succeeded! Gas used:", receipt.gasUsed.toString());
    console.log("User WETH balance after swap:", ethers.formatEther(await weth.balanceOf(userAddress)));
    console.log("User UYO balance after swap:", ethers.formatEther(await uyo.balanceOf(userAddress)));
  } catch (err) {
    console.log("❌ Swap failed!");
    console.log("Error details:", err.message);
  }
}

main().catch(console.error);
