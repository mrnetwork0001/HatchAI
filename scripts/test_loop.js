import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
  
  const deployerAddress = "0x8131208c08AFe5187C41F7A04746d058600804b2";
  const poolManagerAddress = "0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D";
  const hatchHookAddress = "0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f";
  const wethAddress = "0xc147621C235a8004adC2C5dFC90b78ef50B0a061";
  const hatchTokenAddress = "0x9363Ef64d538BEe4706Aa2Dd13cfB559441d7c71";
  
  const poolKey = {
    currency0: hatchTokenAddress,
    currency1: wethAddress,
    fee: 3000,
    tickSpacing: 60,
    hooks: hatchHookAddress
  };

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ["address", "address", "uint24", "int24", "address"],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  );
  const poolIdHex = ethers.keccak256(encoded);

  const ERC20_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ];
  const POOL_MANAGER_ABI = [
    "function pools(bytes32 poolId) external view returns (uint256 reserves0, uint256 reserves1, bool initialized)",
    "function hookFees0(bytes32 poolId) external view returns (uint256)",
    "function hookFees1(bytes32 poolId) external view returns (uint256)"
  ];
  const HATCH_HOOK_ABI = [
    "function poolConfigs(bytes32 poolId) external view returns (address creator, address projectToken, uint256 launchTime, uint256 decayDuration, uint24 startFee, uint24 endFee, uint256 maxSwapAmount, uint256 cooldownDuration)",
    "function totalCreatorFeesClaimed(bytes32 poolId) external view returns (uint256)",
    "function totalTokensBurned(bytes32 poolId) external view returns (uint256)",
    "function lastSwapTimestamp(bytes32 poolId, address user) external view returns (uint256)"
  ];

  const wethContract = new ethers.Contract(wethAddress, ERC20_ABI, provider);
  const hatchTokenContract = new ethers.Contract(hatchTokenAddress, ERC20_ABI, provider);
  const poolManagerContract = new ethers.Contract(poolManagerAddress, POOL_MANAGER_ABI, provider);
  const hatchHookContract = new ethers.Contract(hatchHookAddress, HATCH_HOOK_ABI, provider);

  console.log("Starting query loop every 5 seconds for 5 iterations...");
  for (let iter = 1; iter <= 5; iter++) {
    console.log(`\n--- Iteration ${iter} ---`);
    try {
      const results = await Promise.allSettled([
        wethContract.balanceOf(deployerAddress),
        hatchTokenContract.balanceOf(deployerAddress).catch(() => 0n),
        poolManagerContract.pools(poolIdHex),
        hatchHookContract.poolConfigs(poolIdHex),
        hatchHookContract.totalCreatorFeesClaimed(poolIdHex),
        hatchHookContract.totalTokensBurned(poolIdHex),
        poolManagerContract.hookFees0(poolIdHex),
        poolManagerContract.hookFees1(poolIdHex),
        hatchHookContract.lastSwapTimestamp(poolIdHex, deployerAddress),
        wethContract.allowance(deployerAddress, poolManagerAddress)
      ]);

      const names = [
        "WETH Balance",
        "HATCH Balance",
        "Pool Reserves",
        "Pool Config",
        "Total Fees Claimed",
        "Total Burned",
        "Hook Fees 0",
        "Hook Fees 1",
        "Last Swap Timestamp",
        "WETH Allowance"
      ];

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === "fulfilled") {
          console.log(`✅ ${names[i]}:`, res.value.toString());
        } else {
          console.log(`❌ ${names[i]} failed:`, res.reason);
        }
      }
    } catch (e) {
      console.error("General error:", e);
    }
    
    if (iter < 5) {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
