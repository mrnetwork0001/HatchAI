/**
 * Further diagnosis: Check if pool already initialized, and test with fresh params.
 */

import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const hatchHookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";
  const wethAddress = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";

  // Check hook address permissions
  const hookAddrBigInt = BigInt(hatchHookAddress);
  const lower14 = hookAddrBigInt & 0x3FFFn;
  console.log("Hook address:", hatchHookAddress);
  console.log("Lower 14 bits (hex):", "0x" + lower14.toString(16));
  console.log("Expected: 0x10C0 (afterInitialize + beforeSwap + afterSwap)");
  console.log("Match:", lower14 === 0x10C0n);

  // Decode individual permission flags from lower 14 bits
  const flags = {
    beforeInitialize:   (lower14 & (1n << 13n)) !== 0n,
    afterInitialize:    (lower14 & (1n << 12n)) !== 0n,
    beforeAddLiquidity: (lower14 & (1n << 11n)) !== 0n,
    afterAddLiquidity:  (lower14 & (1n << 10n)) !== 0n,
    beforeRemoveLiquidity: (lower14 & (1n << 9n)) !== 0n,
    afterRemoveLiquidity:  (lower14 & (1n << 8n)) !== 0n,
    beforeSwap:         (lower14 & (1n << 7n)) !== 0n,
    afterSwap:          (lower14 & (1n << 6n)) !== 0n,
    beforeDonate:       (lower14 & (1n << 5n)) !== 0n,
    afterDonate:        (lower14 & (1n << 4n)) !== 0n,
    beforeSwapReturnDelta:       (lower14 & (1n << 3n)) !== 0n,
    afterSwapReturnDelta:        (lower14 & (1n << 2n)) !== 0n,
    afterAddLiquidityReturnDelta:  (lower14 & (1n << 1n)) !== 0n,
    afterRemoveLiquidityReturnDelta: (lower14 & 1n) !== 0n,
  };
  console.log("\nHook permission flags from address:");
  for (const [k, v] of Object.entries(flags)) {
    if (v) console.log(`  ✅ ${k}`);
  }

  // Check if there's code at the hook address
  const hookCode = await provider.getCode(hatchHookAddress);
  console.log("\nHook has deployed code:", hookCode !== "0x");
  console.log("Hook code length:", hookCode.length);

  // Check pool status via StateView
  const stateView = new ethers.Contract(
    "0x76fd297e2d437cd7f76d50f01afe6160f86e9990",
    ["function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"],
    provider
  );

  // Sort currencies
  const currency0 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? projectToken : wethAddress;
  const currency1 = projectToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : projectToken;
  
  // Compute pool ID
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const poolId = ethers.keccak256(
    coder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [currency0, currency1, 8388608, 60, hatchHookAddress]
    )
  );
  console.log("\nPool ID:", poolId);

  try {
    const slot0 = await stateView.getSlot0(poolId);
    console.log("Pool sqrtPriceX96:", slot0[0].toString());
    console.log("Pool tick:", slot0[1].toString());
    console.log("Pool protocolFee:", slot0[2].toString());
    console.log("Pool lpFee:", slot0[3].toString());
    console.log("Pool IS initialized:", BigInt(slot0[0]) > 0n);
  } catch (e) {
    console.log("StateView getSlot0 failed:", e.message?.substring(0, 200));
  }

  // Now try to simulate initialize with correct ABI but checking if pool is already initialized
  console.log("\n=== Simulating initialize with CORRECT ABI ===");
  const correctAbi = [
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)"
  ];
  const pm = new ethers.Contract(poolManagerAddress, correctAbi, provider);

  const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1) * 79228162514264337593543950336));
  const callerAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";
  
  const poolKey = { currency0, currency1, fee: 8388608, tickSpacing: 60, hooks: hatchHookAddress };

  try {
    const tx = await pm.initialize.populateTransaction(poolKey, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("SUCCESS:", result);
  } catch (err) {
    console.log("REVERTED:", err.message?.substring(0, 400));
    if (err.data) {
      console.log("Revert data:", err.data);
      // Try to decode known Uniswap v4 errors
      const knownErrors = {
        "0x90bfb865": "HookAddressNotValid",
        "0x75383637": "PoolAlreadyInitialized", 
        "0x8ca12fbb": "TickSpacingTooLarge",
        "0x7cfe07b5": "TickSpacingTooSmall",
        "0xd4e3ea47": "CurrencyNotSorted",
        "0xd2c9b8b4": "InvalidSqrtPrice",
      };
      const selector = err.data?.substring(0, 10);
      if (knownErrors[selector]) {
        console.log("Decoded error:", knownErrors[selector]);
      }
    }
  }

  // Test with a fresh random token to avoid "already initialized"
  console.log("\n=== Test with a fresh (non-existent) token pair ===");
  const fakeToken = "0x0000000000000000000000000000000000000001";
  const fakeC0 = fakeToken.toLowerCase() < wethAddress.toLowerCase() ? fakeToken : wethAddress;
  const fakeC1 = fakeToken.toLowerCase() < wethAddress.toLowerCase() ? wethAddress : fakeToken;
  const fakeKey = { currency0: fakeC0, currency1: fakeC1, fee: 8388608, tickSpacing: 60, hooks: hatchHookAddress };
  
  try {
    const tx = await pm.initialize.populateTransaction(fakeKey, sqrtPriceX96, "0x", { from: callerAddress });
    const result = await provider.call({ to: tx.to, from: tx.from, data: tx.data });
    console.log("SUCCESS:", result);
  } catch (err) {
    console.log("REVERTED:", err.message?.substring(0, 400));
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
