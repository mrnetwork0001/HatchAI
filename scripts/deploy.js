/**
 * Hatch - X Layer Testnet Deployment Script
 *
 * Deploy sequence:
 *   1. Deploy MockERC20 (HATCH token)
 *   2. Deploy MockERC20 (WETH stand-in for testnet)
 *   3. Deploy MockPoolManager
 *   4. Deploy HatchHook
 *   5. Initialize pool with HatchHook
 *   6. Seed pool with initial liquidity
 *   7. Write all addresses to frontend/src/deployments.json
 *
 * Run: npx hardhat run scripts/deploy.js --network xlayer_testnet
 */

import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("\n========================================");
  console.log("  HATCH - Testnet Deployment");
  console.log("========================================");
  console.log(`Network:   ${network} (chainId: ${hre.network.config.chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} OKB`);

  if (balance === 0n) {
    console.error("\n❌ Deployer wallet has 0 OKB. Get test OKB from:");
    console.error("   https://web3.okx.com/xlayer/faucet");
    process.exit(1);
  }

  console.log("\n[1/6] Deploying WETH (test stand-in)...");
  const MockERC20 = await ethers.getContractFactory("contracts/MockERC20.sol:MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether (Test)", "WETH", 1_000_000);
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log(`      WETH deployed: ${wethAddress}`);

  console.log("\n[2/6] Deploying HATCH token...");
  const hatchToken = await MockERC20.deploy("Hatch Token", "HATCH", 10_000_000);
  await hatchToken.waitForDeployment();
  const hatchTokenAddress = await hatchToken.getAddress();
  console.log(`      HATCH deployed: ${hatchTokenAddress}`);

  console.log("\n[3/6] Deploying MockPoolManager...");
  const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
  const poolManager = await MockPoolManager.deploy();
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log(`      PoolManager deployed: ${poolManagerAddress}`);

  console.log("\n[4/6] Deploying HatchHook...");
  const HatchHook = await ethers.getContractFactory("HatchHook");
  const hatchHook = await HatchHook.deploy(poolManagerAddress, wethAddress);
  await hatchHook.waitForDeployment();
  const hatchHookAddress = await hatchHook.getAddress();
  console.log(`      HatchHook deployed: ${hatchHookAddress}`);

  // Pool parameters
  // currency0 must be < currency1 (sorted by address, ascending)
  const [currency0, currency1] = wethAddress.toLowerCase() < hatchTokenAddress.toLowerCase()
    ? [wethAddress, hatchTokenAddress]
    : [hatchTokenAddress, wethAddress];

  const isHatchCurrency0 = currency0.toLowerCase() === hatchTokenAddress.toLowerCase();

  const poolKey = {
    currency0,
    currency1,
    fee: 3000, // 0.3% base fee - overridden dynamically by the hook
    tickSpacing: 60,
    hooks: hatchHookAddress,
  };

  // Hook initialization data: creator, projectToken, decayDuration, startFee, endFee, maxSwapAmount, cooldownDuration
  const decayDuration = 24 * 60 * 60;            // 24 hours
  const startFee = 100000;                         // 10% (out of 1,000,000)
  const endFee = 3000;                             // 0.3%
  const maxSwapAmount = ethers.parseEther("1000"); // 1,000 HATCH max per swap
  const cooldownDuration = 60;                     // 60 seconds

  // sqrtPriceX96 for initial price of 1 WETH = 10 HATCH (ratio 0.1)
  // sqrtPriceX96 = sqrt(price) * 2^96
  // If WETH is currency0 and HATCH is currency1: price = HATCH/WETH = 10
  // sqrtPriceX96 = sqrt(10) * 2^96 ≈ 250541448375047931186413801569
  const sqrtPriceX96 = 250541448375047931186413801569n;

  console.log("\n[5/6] Initializing pool on PoolManager...");
  const initTx = await poolManager.initialize(poolKey, sqrtPriceX96);
  await initTx.wait();
  console.log(`      Pool initialized! Tx: ${initTx.hash}`);

  console.log("      Configuring launch pool on HatchHook...");
  const configTx = await hatchHook.initializeLaunchPool(
    poolKey,
    decayDuration,
    startFee,
    endFee,
    maxSwapAmount,
    cooldownDuration
  );
  await configTx.wait();
  console.log(`      Launch pool configured! Tx: ${configTx.hash}`);

  // Seed liquidity: add 10,000 WETH + 100,000 HATCH to start
  const liquidityWeth = ethers.parseEther("10000");
  const liquidityHatch = ethers.parseEther("100000");

  const liq0 = isHatchCurrency0 ? liquidityHatch : liquidityWeth;
  const liq1 = isHatchCurrency0 ? liquidityWeth : liquidityHatch;

  console.log("\n[6/6] Seeding initial liquidity...");
  // Approve PoolManager to spend tokens
  const approveTx0 = await weth.approve(poolManagerAddress, liquidityWeth);
  await approveTx0.wait();
  const approveTx1 = await hatchToken.approve(poolManagerAddress, liquidityHatch);
  await approveTx1.wait();

  const addLiqTx = await poolManager.addLiquidityDirect(poolKey, liq0, liq1);
  await addLiqTx.wait();
  console.log(`      Liquidity seeded! Tx: ${addLiqTx.hash}`);

  // =============================================
  // Write deployments to frontend
  // =============================================
  const deployments = {
    chainId: hre.network.config.chainId,
    network,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      poolManager: poolManagerAddress,
      hatchHook: hatchHookAddress,
      weth: wethAddress,
      hatchToken: hatchTokenAddress,
    },
    poolKey: {
      currency0,
      currency1,
      fee: 3000,
      tickSpacing: 60,
      hooks: hatchHookAddress,
    },
    poolConfig: {
      decayDuration,
      startFee,
      endFee,
      maxSwapAmountEther: "1000",
      cooldownSeconds: cooldownDuration,
    },
    isHatchCurrency0,
    explorerUrl: "https://www.oklink.com/xlayer-test",
  };

  const outPath = path.resolve(__dirname, "../frontend/src/deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✅ deployments.json written to: ${outPath}`);

  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE 🚀");
  console.log("========================================");
  console.log(`PoolManager:  ${poolManagerAddress}`);
  console.log(`HatchHook:    ${hatchHookAddress}`);
  console.log(`WETH (test):  ${wethAddress}`);
  console.log(`HATCH Token:  ${hatchTokenAddress}`);
  console.log(`\nView on OKLink Explorer:`);
  console.log(`  https://www.oklink.com/xlayer-test/address/${hatchHookAddress}`);
  console.log("\n🎯 Submit this HatchHook address to the hackathon!");
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
