import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Querying PoolManager Initialize events on X Layer mainnet...");

  // The event signature in V4 PoolManager:
  // event Initialize(bytes32 indexed poolId, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)
  // Let's compute the topic:
  const eventSignature = "Initialize(bytes32,address,address,uint24,int24,address)";
  const topic = ethers.id(eventSignature);
  console.log("Event Topic:", topic);

  // We will query the logs from a recent range of blocks
  // X Layer block time is ~2 seconds. Let's query the last 5,000,000 blocks (~115 days)
  const currentBlock = await provider.getBlockNumber();
  console.log("Current Block:", currentBlock);
  
  const fromBlock = currentBlock - 5000000;
  console.log(`Scanning from block ${fromBlock} to ${currentBlock}...`);

  // Ethers filter
  const filter = {
    address: pmAddress,
    topics: [topic],
    fromBlock: fromBlock,
    toBlock: currentBlock
  };

  try {
    const logs = await provider.getLogs(filter);
    console.log(`Found ${logs.length} Initialize events!`);
    
    const abi = [
      "event Initialize(bytes32 indexed poolId, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)"
    ];
    const iface = new ethers.Interface(abi);

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const parsed = iface.parseLog(log);
      console.log(`\nEvent ${i + 1}:`);
      console.log("  PoolId:", parsed.args.poolId);
      console.log("  Currency0:", parsed.args.currency0);
      console.log("  Currency1:", parsed.args.currency1);
      console.log("  Fee:", parsed.args.fee);
      console.log("  TickSpacing:", parsed.args.tickSpacing);
      console.log("  Hooks:", parsed.args.hooks);
      console.log("  Block Number:", log.blockNumber);
    }
  } catch (e) {
    console.log("Failed to query logs:", e.message);
  }
}

main().catch(console.error);
