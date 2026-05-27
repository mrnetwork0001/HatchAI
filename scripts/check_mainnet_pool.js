import { ethers } from "ethers";

const POOL_MANAGER_ABI = [
  {
    name: "pools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" }
    ],
  }
];

async function main() {
  const rpcs = [
    "https://xlayerrpc.okx.com",
    "https://rpc.ankr.com/xlayer",
    "https://rpc.xlayer.tech"
  ];

  let provider;
  for (const rpc of rpcs) {
    try {
      console.log(`Connecting to RPC: ${rpc}...`);
      const p = new ethers.JsonRpcProvider(rpc);
      await p.getNetwork();
      provider = p;
      console.log("Connected successfully!");
      break;
    } catch (e) {
      console.log(`Failed to connect to ${rpc}: ${e.message}`);
    }
  }

  if (!provider) {
    console.error("All RPC providers failed!");
    return;
  }

  const poolKey = {
    currency0: "0x27f2373D532b94cD060Da9303E8aeB1794A58d61".toLowerCase(),
    currency1: "0x5A77f1443D16ee5761d310e38b62f77f726BC71c".toLowerCase(),
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0".toLowerCase()
  };

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const poolId = ethers.keccak256(coder.encode(
    ["address", "address", "uint256", "int256", "address"],
    [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  ));

  console.log(`Computed PoolId: ${poolId}`);

  const manager = new ethers.Contract("0x360e68faccca8ca495c1b759fd9eee466db9fb32", POOL_MANAGER_ABI, provider);

  try {
    const slot0 = await manager.pools(poolId);
    console.log("Slot0 from PoolManager:");
    console.log(`sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
    console.log(`tick: ${slot0.tick.toString()}`);
    console.log(`protocolFee: ${slot0.protocolFee.toString()}`);
    console.log(`lpFee: ${slot0.lpFee.toString()}`);
    console.log(`Is Initialized: ${slot0.sqrtPriceX96 > 0n}`);
  } catch (e) {
    console.log(`Failed to query pools: ${e.message}`);
  }
}

main().catch(console.error);
