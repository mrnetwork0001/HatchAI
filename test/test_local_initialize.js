import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Local Pool Initialization Diagnostics", function () {
  it("should deploy mock PM, Hook, and try to initialize a pool", async function () {
    const [deployer] = await ethers.getSigners();

    // Deploy MockPoolManager
    const MockPoolManager = await ethers.getContractFactory("MockPoolManager");
    const pm = await MockPoolManager.deploy();
    await pm.waitForDeployment();
    const pmAddress = await pm.getAddress();
    console.log("Deployed MockPoolManager at:", pmAddress);

    // Deploy Mock Token (WETH stand-in)
    const MockERC20 = await ethers.getContractFactory("contracts/MockERC20.sol:MockERC20");
    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 1000000);
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();

    // Deploy Project Token
    const projectToken = await MockERC20.deploy("Project Token", "PROJ", 1000000);
    await projectToken.waitForDeployment();
    const projectTokenAddress = await projectToken.getAddress();

    // Deploy HatchHook
    const HatchHook = await ethers.getContractFactory("HatchHook");
    const hook = await HatchHook.deploy(pmAddress, wethAddress);
    await hook.waitForDeployment();
    const hookAddress = await hook.getAddress();
    console.log("Deployed HatchHook at:", hookAddress);

    // Sort tokens
    const currency0 = projectTokenAddress.toLowerCase() < wethAddress.toLowerCase() ? projectTokenAddress : wethAddress;
    const currency1 = projectTokenAddress.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectTokenAddress;

    const poolKey = {
      currency0,
      currency1,
      fee: 3000,
      tickSpacing: 60,
      hooks: hookAddress
    };

    const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

    console.log("Attempting to initialize pool...");
    try {
      const tx = await pm.initialize(poolKey, sqrtPriceX96);
      await tx.wait();
      console.log("✅ Initialization succeeded locally!");
    } catch (err) {
      console.error("❌ Initialization failed locally:");
      console.error(err);
    }
  });
});
