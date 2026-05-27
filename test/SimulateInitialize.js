import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Uniswap V4 Mainnet Fork End-to-End Validation", function () {
  it("should mine salt, deploy HatchHook via Create2Deployer, initialize pool, and configure launch successfully", async function () {
    const mainnetRpcUrl = "https://rpc.xlayer.tech";
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: mainnetRpcUrl,
            blockNumber: 61083150,
          },
        },
      ],
    });

    const creatorAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";
    const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [creatorAddress],
    });

    await hre.network.provider.send("hardhat_setBalance", [
      creatorAddress,
      ethers.toBeHex(ethers.parseEther("10")),
    ]);

    const creatorSigner = await ethers.getSigner(creatorAddress);

    const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
    const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";

    const currency0 = projectToken.toLowerCase() < weth.toLowerCase() ? projectToken : weth;
    const currency1 = projectToken.toLowerCase() < weth.toLowerCase() ? weth : projectToken;
    const isHatchCurrency0 = projectToken.toLowerCase() === currency0.toLowerCase();

    console.log("Deploying Create2Deployer helper on fork...");
    const Create2Deployer = await ethers.getContractFactory("Create2Deployer", creatorSigner);
    const create2Deployer = await Create2Deployer.deploy();
    await create2Deployer.waitForDeployment();
    const create2DeployerAddress = await create2Deployer.getAddress();
    console.log("Create2Deployer deployed at:", create2DeployerAddress);

    console.log("Preparing HatchHook bytecode and mining salt...");
    const HatchHook = await ethers.getContractFactory("HatchHook", creatorSigner);
    const baseBytecode = HatchHook.bytecode;
    const abiCoder = new ethers.AbiCoder();
    const constructorArgs = abiCoder.encode(["address", "address"], [poolManagerAddress, weth]);
    const creationBytecode = ethers.concat([baseBytecode, constructorArgs]);
    const creationBytecodeHash = ethers.keccak256(creationBytecode);

    let salt = 0;
    let targetAddress = "";
    const mask = 0x3FFF;      // lower 14 bits
    const target = 0x10C0;    // Permissions mask for HatchHook (afterInitialize, beforeSwap, afterSwap)

    const startTime = Date.now();
    while (true) {
      const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
      const predictedAddress = ethers.getCreate2Address(create2DeployerAddress, saltBytes32, creationBytecodeHash);
      const addressUint = BigInt(predictedAddress);

      if ((addressUint & BigInt(mask)) === BigInt(target)) {
        targetAddress = predictedAddress;
        salt = saltBytes32;
        break;
      }
      salt++;
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Mined successfully in ${duration}s! predicted address: ${targetAddress}`);

    console.log("Deploying HatchHook via Create2Deployer...");
    const deployTx = await create2Deployer.deploy(salt, creationBytecode);
    await deployTx.wait();
    console.log("HatchHook successfully deployed to:", targetAddress);

    const hatchHook = new ethers.Contract(targetAddress, HatchHook.interface, creatorSigner);

    // Verify Hook Permissions
    const permissions = await hatchHook.getHookPermissions();
    console.log("Hook permissions:");
    console.log("  afterInitialize:", permissions.afterInitialize);
    console.log("  beforeSwap:", permissions.beforeSwap);
    console.log("  afterSwap:", permissions.afterSwap);

    const poolManagerAbi = [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external returns (int24 tick)"
    ];
    const poolManager = new ethers.Contract(poolManagerAddress, poolManagerAbi, creatorSigner);

    const ratio = 1000000000;
    const price = isHatchCurrency0 ? (1 / ratio) : ratio;
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 79228162514264337593543950336));

    const poolKey = {
      currency0,
      currency1,
      fee: 8388608, // Dynamic Fee Flag 0x800000
      tickSpacing: 60,
      hooks: targetAddress
    };

    console.log("Step 1: Initializing pool on PoolManager...");
    const initTx = await poolManager.initialize(poolKey, sqrtPriceX96, {
      gasLimit: 3000000
    });
    const initReceipt = await initTx.wait();
    console.log("Pool initialized! Tx hash:", initReceipt.hash);

    console.log("Step 2: Configuring launch parameters on HatchHook...");
    const decayDuration = 86400n;
    const startFee = 50000; // 5%
    const endFee = 1000;   // 0.1%
    const maxSwapAmount = ethers.parseEther("500000000");
    const cooldownDuration = 60n;

    const configTx = await hatchHook.initializeLaunchPool(
      poolKey,
      decayDuration,
      startFee,
      endFee,
      maxSwapAmount,
      cooldownDuration,
      { gasLimit: 500000 }
    );
    const configReceipt = await configTx.wait();
    console.log("Launch parameters configured! Tx hash:", configReceipt.hash);

    // Verify configuration was saved successfully in storage
    const encodedKey = abiCoder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
    );
    const poolId = ethers.keccak256(encodedKey);

    const savedConfig = await hatchHook.poolConfigs(poolId);
    console.log("Verifying configuration in Hook storage:");
    console.log("  creator:", savedConfig.creator);
    console.log("  projectToken:", savedConfig.projectToken);
    console.log("  decayDuration:", savedConfig.decayDuration.toString());
    console.log("  startFee:", savedConfig.startFee);
    console.log("  endFee:", savedConfig.endFee);

    expect(savedConfig.creator).to.equal(creatorAddress);
    expect(savedConfig.projectToken.toLowerCase()).to.equal(projectToken.toLowerCase());
    expect(savedConfig.decayDuration).to.equal(decayDuration);
    expect(savedConfig.startFee).to.equal(startFee);
    expect(savedConfig.endFee).to.equal(endFee);
    console.log("\n✅ E2E Mainnet Fork simulation verification succeeded!");
  });
});
