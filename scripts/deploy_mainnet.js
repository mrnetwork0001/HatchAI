/**
 * Hatch - X Layer Mainnet Core Deployment Script using Official Uniswap V4
 *
 * Deploy sequence:
 *   1. Deploy Create2Deployer helper
 *   2. Mine a salt for HatchHook pointing to official PoolManager
 *   3. Deploy HatchHook using Create2Deployer
 *   4. Update deployments.json under chainId 196
 *
 * Run: npx hardhat run scripts/deploy_mainnet.js --network xlayer_mainnet
 */

import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Official Uniswap V4 contracts on X Layer Mainnet
const OFFICIAL_POOL_MANAGER = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
const OFFICIAL_POSITION_MANAGER = "0xcf1eafc6928dc385a342e7c6491d371d2871458b";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  console.log("\n========================================");
  console.log("  HATCH - Mainnet Official V4 Deployment");
  console.log("========================================");
  console.log(`Network:   ${network} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} OKB`);

  if (balance === 0n) {
    console.error("\n❌ Deployer wallet has 0 OKB. Please fund it with OKB on X Layer Mainnet.");
    process.exit(1);
  }

  // 1. Deploy Create2Deployer helper
  console.log("\n[1/4] Deploying Create2Deployer...");
  const Create2Deployer = await ethers.getContractFactory("Create2Deployer");
  const create2Deployer = await Create2Deployer.deploy();
  await create2Deployer.waitForDeployment();
  const deployerAddress = await create2Deployer.getAddress();
  console.log(`      Create2Deployer deployed at: ${deployerAddress}`);

  // 2. Fetch bytecode and encode constructor args for mining
  console.log("\n[2/4] Preparing HatchHook bytecode and mining salt...");
  const HatchHook = await ethers.getContractFactory("HatchHook");
  const baseBytecode = HatchHook.bytecode;

  // Encode constructor argument: IPoolManager _manager (pointing to official PoolManager)
  const abiCoder = new ethers.AbiCoder();
  const constructorArgs = abiCoder.encode(["address"], [OFFICIAL_POOL_MANAGER]);
  const creationBytecode = ethers.concat([baseBytecode, constructorArgs]);
  const creationBytecodeHash = ethers.keccak256(creationBytecode);

  // Mine the salt
  let salt = 0;
  let targetAddress = "";
  const mask = 0x3FFF;      // lower 14 bits
  const target = 0x10C0;    // Permissions mask for HatchHook (afterInitialize, beforeSwap, afterSwap)

  console.log("      Mining salt... (looking for address & 0x3FFF == 0x10C0)");
  const startTime = Date.now();

  while (true) {
    // Generate 32-byte salt
    const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
    const predictedAddress = ethers.getCreate2Address(deployerAddress, saltBytes32, creationBytecodeHash);
    const addressUint = BigInt(predictedAddress);

    if ((addressUint & BigInt(mask)) === BigInt(target)) {
      targetAddress = predictedAddress;
      salt = saltBytes32;
      break;
    }
    salt++;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`      Mined successfully in ${duration}s!`);
  console.log(`      Salt:              ${salt}`);
  console.log(`      Predicted Address: ${targetAddress}`);

  // 3. Deploy HatchHook using Create2Deployer
  console.log("\n[3/4] Deploying HatchHook via Create2Deployer...");
  const tx = await create2Deployer.deploy(salt, creationBytecode);
  console.log(`      Deployment transaction submitted: ${tx.hash}`);
  await tx.wait();

  // Verify code exists at targetAddress
  const code = await ethers.provider.getCode(targetAddress);
  if (code === "0x") {
    console.error(`\n❌ Deployment failed: no bytecode exists at address ${targetAddress}`);
    process.exit(1);
  }
  console.log(`      HatchHook successfully deployed to: ${targetAddress}`);

  // 4. Update deployments.json
  console.log("\n[4/4] Updating deployments.json...");
  const outPath = path.resolve(__dirname, "../frontend/src/deployments.json");
  let allDeployments = {};

  if (fs.existsSync(outPath)) {
    try {
      allDeployments = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch (err) {
      console.warn("Could not parse existing deployments.json, starting fresh", err);
    }
  }

  // Preserve existing mainnet variables like usdt0
  const existingMainnet = allDeployments["196"] || {};
  const existingContracts = existingMainnet.contracts || {};

  allDeployments["196"] = {
    chainId: 196,
    network: "xlayer_mainnet",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ...existingContracts,
      poolManager: OFFICIAL_POOL_MANAGER,
      positionManager: OFFICIAL_POSITION_MANAGER,
      hatchHook: targetAddress,
      create2Deployer: deployerAddress,
    },
    explorerUrl: "https://www.oklink.com/xlayer"
  };

  fs.writeFileSync(outPath, JSON.stringify(allDeployments, null, 2));
  console.log(`      deployments.json updated successfully at: ${outPath}`);

  console.log("\n========================================");
  console.log("  OFFICIAL V4 MAINNET DEPLOY COMPLETE 🎉");
  console.log("========================================");
  console.log(`Create2Deployer: ${deployerAddress}`);
  console.log(`PoolManager:     ${OFFICIAL_POOL_MANAGER}`);
  console.log(`HatchHook:       ${targetAddress}`);
  console.log(`\nView on OKLink Explorer:`);
  console.log(`  https://www.oklink.com/xlayer/address/${targetAddress}`);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
