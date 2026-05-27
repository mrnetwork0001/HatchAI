/**
 * Verify the new HatchHook deployment works with the official PoolManager.
 * Simulates an initialize call against the newly deployed hook.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const newHatchHookAddress = "0x160f9676Eb396993eFc38aF43b8cD55f8DD950C0";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  // Verify hook address permissions
  const hookAddrBigInt = BigInt(newHatchHookAddress);
  const lower14 = hookAddrBigInt & 0x3FFFn;
  console.log("New Hook address:", newHatchHookAddress);
  console.log("Lower 14 bits (hex):", "0x" + lower14.toString(16));
  console.log("Permission mask matches 0x10C0:", lower14 === 0x10C0n);

  // Verify code is deployed
  const code = await provider.getCode(newHatchHookAddress);
  console.log("Hook has deployed code:", code !== "0x", `(${code.length} bytes)`);

  // Sort currencies
  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;

  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));

  const poolKey = {
    currency0,
    currency1,
    fee: 8388608,   // DYNAMIC_FEE_FLAG
    tickSpacing: 60,
    hooks: newHatchHookAddress
  };

  // Use the CORRECT 3-arg ABI
  const correctAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, correctAbi, provider);

  console.log("\n=== Simulating initialize with new hook ===");
  console.log("Pool key:", JSON.stringify({
    currency0: poolKey.currency0,
    currency1: poolKey.currency1,
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks
  }, null, 2));

  try {
    const tx = await pm.initialize.populateTransaction(poolKey, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("\n✅ SUCCESS! Pool can be initialized!");
    // Decode the returned int24 tick
    const tick = ethers.AbiCoder.defaultAbiCoder().decode(["int24"], result);
    console.log("Returned tick:", tick[0].toString());
  } catch (err) {
    console.log("\n❌ REVERTED:", err.message?.substring(0, 400));
    if (err.data) {
      console.log("Revert data:", err.data);
      const selector = err.data?.substring(0, 10);
      const knownErrors = {
        "0x90bfb865": "HookAddressNotValid",
        "0x75383637": "PoolAlreadyInitialized",
        "0x8ca12fbb": "TickSpacingTooLarge",
        "0x7cfe07b5": "TickSpacingTooSmall",
        "0xd4e3ea47": "CurrencyNotSorted",
        "0xd2c9b8b4": "InvalidSqrtPrice",
      };
      if (knownErrors[selector]) {
        console.log("Decoded error:", knownErrors[selector]);
      }
    }
  }
}

main().catch(console.error);
