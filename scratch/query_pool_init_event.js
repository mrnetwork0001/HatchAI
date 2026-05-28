import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  console.log("Forking X Layer Mainnet...");
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://rpc.xlayer.tech"
        },
      },
    ],
  });

  const poolManagerAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";
  const poolId = "0x4c9ceae1e42b437cdbafd3350a8a65d5a9c8066e2c0298cdde2175d4c005b3b4";

  const pm = new ethers.Contract(
    poolManagerAddress,
    [
      "event Initialize(bytes32 indexed poolId, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)"
    ],
    ethers.provider
  );

  console.log("Querying Initialize events for poolId:", poolId);
  const filter = pm.filters.Initialize(poolId);
  const latestBlock = await ethers.provider.getBlockNumber();
  const totalBlocks = 50000;
  const chunkSize = 90;
  let currentBlock = latestBlock - totalBlocks;

  console.log(`Scanning last ${totalBlocks} blocks in chunks of ${chunkSize}...`);
  const logs = [];
  while (currentBlock < latestBlock) {
    const toBlock = Math.min(currentBlock + chunkSize, latestBlock);
    try {
      const chunkLogs = await pm.queryFilter(filter, currentBlock, toBlock);
      logs.push(...chunkLogs);
      if (chunkLogs.length > 0) {
        console.log(`Found ${chunkLogs.length} events in block range ${currentBlock} to ${toBlock}!`);
      }
    } catch (e) {
      // ignore transient chunk query errors and proceed
    }
    currentBlock = toBlock + 1;
  }

  if (logs.length === 0) {
    console.log("No Initialize event found in the scanned range!");
  } else {
    for (const log of logs) {
      console.log("Event log found:");
      console.log("  Transaction Hash:", log.transactionHash);
      console.log("  Block Number:", log.blockNumber);
      console.log("  currency0:", log.args.currency0);
      console.log("  currency1:", log.args.currency1);
      console.log("  fee:", log.args.fee.toString());
      console.log("  tickSpacing:", log.args.tickSpacing.toString());
      console.log("  hooks:", log.args.hooks);
    }
  }
}

main().catch(console.error);
