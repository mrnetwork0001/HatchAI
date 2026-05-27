import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Starting Mainnet Fork Simulation (TickSpacing and Price scan)...");

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

  const poolManagerAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const poolManager = new ethers.Contract(poolManagerAddress, poolManagerAbi, creatorSigner);

  // Standard 1:1 price (79228162514264337593543950336)
  const standardPrice = 79228162514264337593543950336n;

  // Let's scan common tick spacings: 10, 60, 200, 1
  const tickSpacings = [10, 60, 200, 1];

  for (const ts of tickSpacings) {
    const poolKey = {
      currency0,
      currency1,
      fee: 3000,
      tickSpacing: ts,
      hooks: "0x0000000000000000000000000000000000000000"
    };

    console.log(`\nTesting initialize with tickSpacing=${ts} and 1:1 price...`);
    try {
      const tx = await poolManager.initialize(poolKey, standardPrice, "0x", {
        gasLimit: 3000000
      });
      console.log(`Success! tickSpacing=${ts} works! Hash: ${tx.hash}`);
      return;
    } catch (err) {
      console.log(`Failed for tickSpacing=${ts}: ${err.message}`);
    }
  }
}

main().catch(console.error);
