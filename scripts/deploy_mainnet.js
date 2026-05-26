/**
 * Hatch - X Layer Mainnet Core Deployment Script
 *
 * Deploy sequence:
 *   1. Deploy MockPoolManager
 *   2. Deploy HatchHook
 *   3. Write Mainnet addresses to frontend/src/deployments.json (appending under "196")
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

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  console.log("\n========================================");
  console.log("  HATCH - Mainnet Core Deployment");
  console.log("========================================");
  console.log(`Network:   ${network} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:   ${ethers.formatEther(balance)} OKB`);

  if (balance === 0n) {
    console.error("\n❌ Deployer wallet has 0 OKB. Please fund it with OKB on X Layer Mainnet.");
    process.exit(1);
  }

  console.log("\n[1/2] Deploying MockPoolManager...");
  const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
  const poolManager = await MockPoolManager.deploy();
  await poolManager.waitForDeployment();
  const poolManagerAddress = await poolManager.getAddress();
  console.log(`      PoolManager deployed: ${poolManagerAddress}`);

  console.log("\n[2/2] Deploying HatchHook...");
  const HatchHook = await ethers.getContractFactory("HatchHook");
  const hatchHook = await HatchHook.deploy(poolManagerAddress);
  await hatchHook.waitForDeployment();
  const hatchHookAddress = await hatchHook.getAddress();
  console.log(`      HatchHook deployed: ${hatchHookAddress}`);

  // Load existing deployments.json
  const outPath = path.resolve(__dirname, "../frontend/src/deployments.json");
  let allDeployments = {};
  if (fs.existsSync(outPath)) {
    try {
      allDeployments = JSON.parse(fs.readFileSync(outPath, "utf8"));
      // Handle old format if it was not nested
      if (allDeployments.chainId && !allDeployments[allDeployments.chainId]) {
        const oldChainId = String(allDeployments.chainId);
        allDeployments = {
          [oldChainId]: { ...allDeployments }
        };
      }
    } catch (err) {
      console.warn("Could not parse existing deployments.json, starting fresh", err);
    }
  }

  // Create mainnet configuration block
  allDeployments["196"] = {
    chainId: 196,
    network: "xlayer_mainnet",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      poolManager: poolManagerAddress,
      hatchHook: hatchHookAddress
    },
    explorerUrl: "https://www.oklink.com/xlayer"
  };

  fs.writeFileSync(outPath, JSON.stringify(allDeployments, null, 2));
  console.log(`\n✅ deployments.json updated at: ${outPath}`);

  console.log("\n========================================");
  console.log("  MAINNET DEPLOYMENT COMPLETE 🚀");
  console.log("========================================");
  console.log(`PoolManager:  ${poolManagerAddress}`);
  console.log(`HatchHook:    ${hatchHookAddress}`);
  console.log(`\nView on OKLink Explorer:`);
  console.log(`  https://www.oklink.com/xlayer/address/${hatchHookAddress}`);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
