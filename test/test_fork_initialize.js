import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Testnet Fork Pool Initialization Diagnostics", function () {
  it("should simulate testnet initialize on fork and print stack trace", async function () {
    const testnetRpcUrl = "https://testrpc.xlayer.tech";
    
    console.log("Forking X Layer Testnet...");
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: testnetRpcUrl,
          },
        },
      ],
    });

    const creatorAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";
    const poolManagerAddress = "0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D";
    const hatchHookAddress = "0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f";
    const currency0 = "0xc147621c235a8004adc2c5dfc90b78ef50b0a061";
    const currency1 = "0xc3811d161d516a6bd939a0009583fa748e6af4f9";

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [creatorAddress],
    });

    await hre.network.provider.send("hardhat_setBalance", [
      creatorAddress,
      ethers.toBeHex(ethers.parseEther("10")),
    ]);

    const creatorSigner = await ethers.getSigner(creatorAddress);

    // Build poolManager contract with 3-arg initialize
    const poolManagerAbi = [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
    ];
    const pm = new ethers.Contract(poolManagerAddress, poolManagerAbi, creatorSigner);

    const poolKey = {
      currency0,
      currency1,
      fee: 3000,
      tickSpacing: 60,
      hooks: hatchHookAddress
    };

    const sqrtPriceX96 = 11529215046068469760n; // 0xa000000000000000

    console.log("Simulating initialize on testnet fork...");
    try {
      const tx = await pm.initialize(poolKey, sqrtPriceX96, "0x", { gasLimit: 3000000 });
      const receipt = await tx.wait();
      console.log("✅ Initialization succeeded on fork! Tx:", receipt.hash);
    } catch (err) {
      console.error("❌ Initialization failed on fork:");
      console.error(err);
    }
  });
});
