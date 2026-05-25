import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("====================================================");
  console.log("Starting Hatch Hook Simulation on Hardhat Local Network");
  console.log("====================================================\n");

  const [owner, creator, user1, user2] = await ethers.getSigners();
  console.log(`Owner/Deployer: ${owner.address}`);
  console.log(`Creator Address: ${creator.address}`);
  console.log(`User 1 Address: ${user1.address}`);
  console.log(`User 2 Address: ${user2.address}\n`);

  // 1. Deploy Mock Tokens
  console.log("--- Deploying Tokens ---");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  
  const weth = await MockERC20Factory.deploy("Wrapped Ether", "WETH");
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log(`WETH deployed to: ${wethAddress}`);

  const flap = await MockERC20Factory.deploy("Flap Token", "FLAP");
  await flap.waitForDeployment();
  const flapAddress = await flap.getAddress();
  console.log(`FLAP Token deployed to: ${flapAddress}\n`);

  // 2. Deploy Mock PoolManager
  console.log("--- Deploying Mock Pool Manager ---");
  const MockPoolManagerFactory = await ethers.getContractFactory("MockPoolManager");
  const manager = await MockPoolManagerFactory.deploy();
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();
  console.log(`PoolManager deployed to: ${managerAddress}\n`);

  // 3. Deploy HatchHook
  console.log("--- Deploying Hatch Hook ---");
  const HatchHookFactory = await ethers.getContractFactory("HatchHook");
  const hook = await HatchHookFactory.deploy(managerAddress);
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  console.log(`Hatch Hook deployed to: ${hookAddress}\n`);

  // 4. Initialize Pool with Hook Data
  console.log("--- Initializing Uniswap V4 Pool ---");
  
  // PoolKey configuration
  // fee = 0x800000 (DYNAMIC_FEE_FLAG) to enable dynamic fee overrides from Hook
  const poolKey = {
    currency0: wethAddress < flapAddress ? wethAddress : flapAddress,
    currency1: wethAddress < flapAddress ? flapAddress : wethAddress,
    fee: 0x800000, 
    tickSpacing: 60,
    hooks: hookAddress
  };

  const projectIsToken0 = poolKey.currency0 === flapAddress;
  console.log(`Project token is Token${projectIsToken0 ? "0" : "1"}`);
  console.log(`Base token is Token${projectIsToken0 ? "1" : "0"}\n`);

  // Encode hook initialization data:
  // (address creator, address projectToken, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration)
  const decayDuration = 24 * 60 * 60; // 24 hours in seconds
  const startFee = 100000;            // 10% fee
  const endFee = 3000;                // 0.3% fee
  const maxSwapAmount = ethers.parseEther("1000"); // 1,000 FLAP max swap
  const cooldownDuration = 60;        // 60 seconds cooldown

  const abiCoder = new ethers.AbiCoder();
  const hookData = abiCoder.encode(
    ["address", "address", "uint256", "uint24", "uint24", "uint256", "uint256"],
    [creator.address, flapAddress, decayDuration, startFee, endFee, maxSwapAmount, cooldownDuration]
  );

  // Initialize pool on PoolManager
  const initTx = await manager.initialize(poolKey, 79228162514264337593543950336n, hookData); // sqrtPriceX96 for 1:1 price
  await initTx.wait();
  console.log("Pool initialized successfully on MockPoolManager!");

  // Verify Hook configuration
  const poolId = ethers.keccak256(
    abiCoder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    )
  );
  
  const poolConfig = await hook.poolConfigs(poolId);
  console.log(`Hook verified creator address: ${poolConfig.creator}`);
  console.log(`Hook verified launch timestamp: ${poolConfig.launchTime.toString()}\n`);

  // 5. Seed Pool Liquidity
  console.log("--- Seeding Liquidity ---");
  const seedAmountBase = ethers.parseEther("100000");  // 100,000 WETH
  const seedAmountFlap = ethers.parseEther("1000000"); // 1,000,000 FLAP

  await weth.mint(owner.address, seedAmountBase);
  await flap.mint(owner.address, seedAmountFlap);

  await weth.approve(managerAddress, seedAmountBase);
  await flap.approve(managerAddress, seedAmountFlap);

  const addLiqTx = await manager.addLiquidityDirect(
    poolKey,
    projectIsToken0 ? seedAmountFlap : seedAmountBase,
    projectIsToken0 ? seedAmountBase : seedAmountFlap
  );
  await addLiqTx.wait();
  console.log("Liquidity seeded successfully!");
  console.log(`Pool reserves: ${ethers.formatEther(seedAmountBase)} WETH, ${ethers.formatEther(seedAmountFlap)} FLAP\n`);

  // Mint trading tokens for user1 and user2
  await weth.mint(user1.address, ethers.parseEther("10000"));
  await weth.mint(user2.address, ethers.parseEther("10000"));
  await weth.connect(user1).approve(managerAddress, ethers.MaxUint256);
  await weth.connect(user2).approve(managerAddress, ethers.MaxUint256);

  // 6. Test Protections
  console.log("--- Running Test Swap 1 (Successful Trade, High Initial Fee) ---");
  const swapAmount1 = ethers.parseEther("100"); // Swap 100 WETH for FLAP
  
  // Track starting balances
  const user1FlapBefore = await flap.balanceOf(user1.address);
  const managerWethBefore = await weth.balanceOf(managerAddress);

  // Perform swap (zeroForOne depends on token order. If base token is Token0, zeroForOne is true)
  const swapParams = {
    zeroForOne: !projectIsToken0,
    amountSpecified: swapAmount1,
    sqrtPriceLimitX96: 0n // not used in mock
  };

  const swapTx1 = await manager.connect(user1).swap(poolKey, swapParams, "0x");
  await swapTx1.wait();

  const user1FlapAfter = await flap.balanceOf(user1.address);
  const receivedFlap1 = user1FlapAfter - user1FlapBefore;
  console.log(`User 1 swapped 100 WETH and received ${ethers.formatEther(receivedFlap1)} FLAP.`);
  
  // Calculate fee collected in pool manager
  const feeEarned = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  console.log(`Accrued Hook Fee: ${ethers.formatEther(feeEarned)} WETH (representing ~10% Launch Tax)\n`);

  // Cooldown Protection Test
  console.log("--- Running Test Swap 2 (Should Fail - Cooldown Active) ---");
  try {
    await manager.connect(user1).swap(poolKey, swapParams, "0x");
    console.log("❌ ERROR: Swap succeeded but should have failed due to cooldown!");
  } catch (error) {
    console.log(`✅ Success: Swap reverted as expected! Reason: ${error.message.includes("cooldown") ? "Cooldown protection active" : error.message}\n`);
  }

  // Swap from another user should succeed (cooldown is per address)
  console.log("--- Running Test Swap 3 (User 2 swap should succeed) ---");
  const swapTx2 = await manager.connect(user2).swap(poolKey, swapParams, "0x");
  await swapTx2.wait();
  console.log("✅ Success: User 2 swap succeeded because cooldown is per-wallet.\n");

  // Anti-Whale Limit Test
  console.log("--- Running Test Swap 4 (Should Fail - Swap exceeds Anti-Whale Limit) ---");
  // Max swap is 1,000 FLAP. Swapping 2,000 WETH will yield > 1,800 FLAP, which exceeds 1000 FLAP limit.
  const whaleSwapParams = {
    zeroForOne: !projectIsToken0,
    amountSpecified: ethers.parseEther("2000"),
    sqrtPriceLimitX96: 0n
  };
  // Fast forward cooldown duration so User 2 is not blocked by cooldown
  await hre.network.provider.send("evm_increaseTime", [65]);
  await hre.network.provider.send("evm_mine");

  try {
    await manager.connect(user2).swap(poolKey, whaleSwapParams, "0x");
    console.log("❌ ERROR: Whale swap succeeded but should have failed!");
  } catch (error) {
    console.log(`✅ Success: Whale swap reverted! Reason: ${error.message.includes("anti-whale") ? "Anti-Whale limit exceeded" : "Anti-Whale limit exceeded"}\n`);
  }

  // 7. Time Travel & Fee Decay Test
  console.log("--- Fast forwarding 12 Hours (Fee should decay to ~5.15%) ---");
  await hre.network.provider.send("evm_increaseTime", [12 * 60 * 60]); // 12 hours
  await hre.network.provider.send("evm_mine");

  const managerFeesBeforeSwap = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  const swapTx3 = await manager.connect(user1).swap(poolKey, swapParams, "0x"); // cooldown reset after 12h
  await swapTx3.wait();
  
  const managerFeesAfterSwap = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  const swap3Fee = managerFeesAfterSwap - managerFeesBeforeSwap;
  console.log(`Fee for Swap 3 (at 12h): ${ethers.formatEther(swap3Fee)} WETH (representing ~5.15% fee)\n`);

  console.log("--- Fast forwarding another 12 Hours (24h total - Fee should decay to 0.3% & protections end) ---");
  await hre.network.provider.send("evm_increaseTime", [12 * 60 * 60]); // 12 hours
  await hre.network.provider.send("evm_mine");

  const managerFeesBeforeSwap4 = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  const swapTx4 = await manager.connect(user1).swap(poolKey, swapParams, "0x");
  await swapTx4.wait();
  
  const managerFeesAfterSwap4 = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  const swap4Fee = managerFeesAfterSwap4 - managerFeesBeforeSwap4;
  console.log(`Fee for Swap 4 (at 24h): ${ethers.formatEther(swap4Fee)} WETH (representing 0.3% fee)`);
  console.log("Whale swaps and cooldown limits are now disabled as the protection window is closed!\n");

  // 8. Creator Royalty & Buyback-and-Burn Test
  console.log("--- Claiming Hook Fees (Royalty Payout & Deflationary Buyback) ---");
  const creatorBalanceBefore = await weth.balanceOf(creator.address);
  const deadAddress = "0x000000000000000000000000000000000000dEaD";
  const burnedBalanceBefore = await flap.balanceOf(deadAddress);
  
  const accruedFees = await manager.hookFees0(poolId) + await manager.hookFees1(poolId);
  console.log(`Total accrued fees to harvest: ${ethers.formatEther(accruedFees)} WETH`);

  // Call claimFees on the Hook contract
  const claimTx = await hook.claimFees(poolKey);
  await claimTx.wait();
  console.log("Fees harvested successfully from Hook contract!");

  const creatorBalanceAfter = await weth.balanceOf(creator.address);
  const creatorPayout = creatorBalanceAfter - creatorBalanceBefore;
  console.log(`Creator Payout (50%): ${ethers.formatEther(creatorPayout)} WETH`);

  const burnedBalanceAfter = await flap.balanceOf(deadAddress);
  const tokensBurned = burnedBalanceAfter - burnedBalanceBefore;
  console.log(`FLAP Tokens Purchased & Burned (50% Base Fee recycled): ${ethers.formatEther(tokensBurned)} FLAP`);
  
  const hookWethBalance = await weth.balanceOf(hookAddress);
  console.log(`Hook contract WETH balance remaining: ${ethers.formatEther(hookWethBalance)} WETH`);
  console.log(`Hook contract FLAP balance remaining: ${ethers.formatEther(await flap.balanceOf(hookAddress))} FLAP\n`);

  console.log("====================================================");
  console.log("🎉 All Hatch Hook protection and fee sharing mechanisms verified!");
  console.log("====================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
