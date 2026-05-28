import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const to = "0xf958152c5252A40C722c191880d53e5f9d217905"; // SwapRouter
  const from = "0x1cE88a153ADD64802376d882309F4Bb2574488F4"; // User

  const projectToken = "0x3d7e67d7fbdfd349398c8e06e92baf91504a69ac";
  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const hook = "0xb2daac3fc51e958f89a6346f92ef7542805150c0";

  const poolKey = {
    currency0: projectToken,
    currency1: weth,
    fee: 8388608,
    tickSpacing: 60,
    hooks: hook
  };

  const swapRouterAbi = [
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external payable returns (int256 delta)"
  ];
  const swapRouter = new ethers.Contract(to, swapRouterAbi, provider);

  // Test 1: Try with 0.00012 WETH (original user amount)
  console.log("=== Test 1: Simulating swap with 0.00012 WETH ===");
  await simulateSwap(ethers.parseEther("0.00012"));

  // Test 2: Try with 0.00005 WETH (should be below anti-whale cap of 3,000 tokens)
  console.log("\n=== Test 2: Simulating swap with 0.00005 WETH ===");
  await simulateSwap(ethers.parseEther("0.00005"));

  async function simulateSwap(amountIn) {
    const params = {
      zeroForOne: false,
      amountSpecified: amountIn,
      sqrtPriceLimitX96: BigInt("1461446703485210103287273052203988822378723970341")
    };

    try {
      const tx = await swapRouter.swap.populateTransaction(poolKey, params, "0x", { from });
      const result = await provider.call({
        to: tx.to,
        from: tx.from,
        data: tx.data
      });
      console.log("✅ SUCCESS! Returned:", result);
    } catch (err) {
      console.log("❌ REVERTED!");
      console.log("Message:", err.message);
      if (err.data) {
        console.log("Revert data:", err.data);
        // Decode custom error if possible
        if (err.data.startsWith("0x08c379a0")) {
          // Standard revert string
          const reason = ethers.AbiCoder.defaultAbiCoder().decode(["string"], "0x" + err.data.substring(10));
          console.log("Decoded Revert Reason:", reason[0]);
        }
      }
    }
  }
}

main().catch(console.error);
