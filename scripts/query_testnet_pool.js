import { ethers } from "ethers";

const POOL_MANAGER_ABI = [
  {
    name: "pools",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "reserves0", type: "uint256" },
      { name: "reserves1", type: "uint256" },
      { name: "initialized", type: "bool" },
    ],
  }
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");

  const testnetPoolId = "0xc414d0234a9b5f3ee5108b47e2b17b2b8db00000000000000000000000000000"; // Let's calculate the correct poolId or check deployments
  // Let's compute it
  const poolKey = {
    currency0: "0x9363Ef64d538BEe4706Aa2Dd13cfB559441d7c71".toLowerCase(),
    currency1: "0xc147621C235a8004adC2C5dFC90b78ef50B0a061".toLowerCase(),
    fee: 3000,
    tickSpacing: 60,
    hooks: "0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f".toLowerCase()
  };

  const poolKeyDynamic = {
    ...poolKey,
    fee: 0x800000
  };

  const coder = ethers.AbiCoder.defaultAbiCoder();
  
  function getPoolId(key) {
    // Encodes as: address, address, uint24, int24, address
    // In solidity: struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }
    // Note: uint24 is encoded as uint32 or uint256 in abi.encode?
    // Actually, in solidity, abi.encode(PoolKey) encodes currency0, currency1, fee, tickSpacing, hooks.
    // The fee (uint24) and tickSpacing (int24) are padded to 32 bytes each.
    return ethers.keccak256(coder.encode(
      ["address", "address", "uint256", "int256", "address"],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    ));
  }

  const idStatic = getPoolId(poolKey);
  const idDynamic = getPoolId(poolKeyDynamic);

  console.log(`Static PoolId: ${idStatic}`);
  console.log(`Dynamic PoolId: ${idDynamic}`);

  const manager = new ethers.Contract("0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D", POOL_MANAGER_ABI, provider);

  try {
    const resStatic = await manager.pools(idStatic);
    console.log(`Static Pool initialized: ${resStatic.initialized || resStatic[2]}`);
  } catch (e) {
    console.log(`Static check failed: ${e.message}`);
  }

  try {
    const resDynamic = await manager.pools(idDynamic);
    console.log(`Dynamic Pool initialized: ${resDynamic.initialized || resDynamic[2]}`);
  } catch (e) {
    console.log(`Dynamic check failed: ${e.message}`);
  }
}

main().catch(console.error);
