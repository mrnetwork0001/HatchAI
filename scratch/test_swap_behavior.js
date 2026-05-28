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
  
  // We will deploy two test ERC20 tokens to have clean balances
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const token0 = await MockERC20.deploy("Token 0", "TK0", 18);
  await token0.waitForDeployment();
  const token1 = await MockERC20.deploy("Token 1", "TK1", 18);
  await token1.waitForDeployment();

  const token0Address = await token0.getAddress();
  const token1Address = await token1.getAddress();
  
  // Ensure token0Address < token1Address alphabetically
  let c0 = token0Address;
  let c1 = token1Address;
  let t0 = token0;
  let t1 = token1;
  if (token0Address.toLowerCase() > token1Address.toLowerCase()) {
    c0 = token1Address;
    c1 = token0Address;
    t0 = token1;
    t1 = token0;
  }

  console.log("token0:", c0);
  console.log("token1:", c1);

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const poolManager = new ethers.Contract(poolManagerAddress, [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24)",
    "function unlock(bytes calldata data) external returns (bytes memory)",
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes calldata hookData) external returns (int256)",
    "function settle(address token) external payable returns (uint256)",
    "function take(address token, address to, uint256 amount) external"
  ], deployer);

  const poolKey = {
    currency0: c0,
    currency1: c1,
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x0000000000000000000000000000000000000000"
  };

  // Initialize pool at price 1:1 (sqrtPriceX96 = 2^96)
  const sqrtPriceX96 = BigInt("79228162514264337593543950336");
  console.log("Initializing pool...");
  const initTx = await poolManager.initialize(poolKey, sqrtPriceX96);
  await initTx.wait();
  console.log("Pool initialized!");

  // Since we want to test swap, we need to add liquidity first.
  // We can deploy a helper contract that implements unlockCallback to add liquidity and execute swaps.
  const SwapHelper = await ethers.getContractFactory("SwapRouter"); // We can use the SwapRouter bytecode
  const swapRouter = await SwapHelper.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();

  // Approve swapRouter to spend our tokens
  await t0.approve(swapRouterAddress, ethers.MaxUint256);
  await t1.approve(swapRouterAddress, ethers.MaxUint256);

  // Transfer tokens to the swapRouter so it can add liquidity/swap on behalf of itself or us
  await t0.transfer(swapRouterAddress, ethers.parseEther("1000"));
  await t1.transfer(swapRouterAddress, ethers.parseEther("1000"));

  // Wait, let's write a simple custom tester contract to add liquidity and swap so we can see the raw behavior.
  // Actually, we can use our SwapRouter to do a swap!
  // But wait, there is no liquidity in the pool yet. A swap will fail with no liquidity.
  // Let's add liquidity. How do we add liquidity to a V4 pool without the PositionManager?
  // We can write a simple contract that unlocks, calls poolManager.modifyLiquidity (or modifyLiquidities), and settles.
  // Or we can just use the official PositionManager!
  // The official PositionManager on mainnet is at 0xcf1eafc6928dc385a342e7c6491d371d2871458b.
  // Let's write a script that does this.
}

main().catch(console.error);
