/**
 * Deploy SwapRouter to X Layer Mainnet or Testnet
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
  console.log("  HATCH - SwapRouter Deployment");
  console.log("========================================");
  console.log(`Network:   ${network} (chainId: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);

  const outPath = path.resolve(__dirname, "../frontend/src/deployments.json");
  if (!fs.existsSync(outPath)) {
    console.error("deployments.json not found!");
    process.exit(1);
  }
  const deployments = JSON.parse(fs.readFileSync(outPath, "utf8"));
  const activeConfig = deployments[chainId.toString()];
  if (!activeConfig || !activeConfig.contracts || !activeConfig.contracts.poolManager) {
    console.error(`No configuration or PoolManager found for chainId ${chainId}`);
    process.exit(1);
  }

  const poolManagerAddress = activeConfig.contracts.poolManager;
  console.log(`PoolManager address: ${poolManagerAddress}`);

  console.log("\nDeploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy(poolManagerAddress);
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();

  console.log(`SwapRouter successfully deployed to: ${swapRouterAddress}`);

  // Save to deployments.json
  activeConfig.contracts.swapRouter = swapRouterAddress;
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log("deployments.json updated!");

  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
