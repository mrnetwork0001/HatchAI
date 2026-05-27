import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const hatchHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";
  const projectTokenAddress = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  
  // Two candidate WETH addresses:
  // 1. Correct: 0x5a77f1443d16ee5761d310e38b62f77f726bc71c
  // 2. Typo (the user's entered value): 0x5a77f1443d16ee5761d310e38b62f77f726b17c02 (which we noted has invalid length 43/41 hex chars - wait! If they copied it, was it 40 hex chars?)
  // Wait! In the UI input, the user entered 0x5a77f1443d16ee5761d310e38b62f77f726b17c02? Wait, let's verify if that is exactly what is in the screenshot.
  // In the screenshot: 0x5a77f1443d16ee5761d310e38b62f77f726bc71c is 42 chars.
  // Wait! The user's input: "0x5a77f1443d16ee5761d310e38b62f77f726b17c02" is 43 characters.
  // Let's test both!
  
  const wethAddresses = {
    correctWeth: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
    typoWeth: "0x5a77f1443d16ee5761d310e38b62f77f726b17c02"
  };

  const poolManagerAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  
  const poolManager = new ethers.Contract(poolManagerAddress, poolManagerAbi, provider);

  const priceRatio = "1000000000";
  const ratio = parseFloat(priceRatio);

  const creatorAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  for (const [name, weth] of Object.entries(wethAddresses)) {
    console.log(`\n--- Simulating initialize with: ${name} (${weth}) ---`);
    
    // Sort currencies
    const currency0 = projectTokenAddress.toLowerCase() < weth.toLowerCase() ? projectTokenAddress : weth;
    const currency1 = projectTokenAddress.toLowerCase() < weth.toLowerCase() ? weth : projectTokenAddress;
    const isHatchCurrency0 = projectTokenAddress.toLowerCase() === currency0.toLowerCase();

    const price = isHatchCurrency0 ? (1 / ratio) : ratio;
    const sqrtPrice = Math.sqrt(price);
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 79228162514264337593543950336));

    const decayDuration = 86400n;
    const startFee = 50000; // 5%
    const endFee = 1000;   // 0.1%
    const maxSwapAmount = ethers.parseEther("500000000");
    const cooldownDuration = 60n;

    const coder = ethers.AbiCoder.defaultAbiCoder();
    const hookData = coder.encode(
      ["address", "address", "uint256", "uint24", "uint24", "uint256", "uint256"],
      [creatorAddress, projectTokenAddress, decayDuration, startFee, endFee, maxSwapAmount, cooldownDuration]
    );

    const poolKey = {
      currency0,
      currency1,
      fee: 8388608,
      tickSpacing: 60,
      hooks: hatchHookAddress
    };

    try {
      // Simulate call at latest block
      console.log("Simulating call...");
      const populatedTx = await poolManager.initialize.populateTransaction(poolKey, sqrtPriceX96, hookData, {
        from: creatorAddress
      });
      
      const result = await provider.call({
        to: populatedTx.to,
        from: populatedTx.from,
        data: populatedTx.data,
        value: populatedTx.value
      });
      console.log(`Result: ${result}`);
    } catch (err) {
      console.log("Revert reason/error:");
      console.log(err.message);
      if (err.data) {
        console.log("Revert data:", err.data);
      }
    }
  }
}

main().catch(console.error);
