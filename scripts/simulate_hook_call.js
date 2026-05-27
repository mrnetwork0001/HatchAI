import { ethers } from "ethers";

const HATCH_HOOK_ABI = [
  "function afterInitialize(address, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) calldata, uint160, int24, bytes calldata) external returns (bytes4)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const poolKey = {
    currency0: "0x27f2373D532b94cD060Da9303E8aeB1794A58d61".toLowerCase(),
    currency1: "0x5A77f1443D16ee5761d310e38b62f77f726BC71c".toLowerCase(),
    fee: 3000,
    tickSpacing: 60,
    hooks: "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0".toLowerCase()
  };

  const creator = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02".toLowerCase();
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61".toLowerCase();
  const decayDuration = 86400;
  const startFee = 50000;
  const endFee = 1000;
  const maxSwapAmount = ethers.parseEther("1000");
  const cooldownDuration = 60;

  const coder = ethers.AbiCoder.defaultAbiCoder();
  const hookData = coder.encode(
    ["address", "address", "uint256", "uint24", "uint24", "uint256", "uint256"],
    [creator, projectToken, decayDuration, startFee, endFee, maxSwapAmount, cooldownDuration]
  );

  const iface = new ethers.Interface(HATCH_HOOK_ABI);
  const data = iface.encodeFunctionData("afterInitialize", [
    creator,
    poolKey,
    0, // sqrtPriceX96 (doesn't matter for decode)
    0, // tick
    hookData
  ]);

  console.log("Simulating direct afterInitialize call to Hook...");
  try {
    const result = await provider.call({
      from: "0x360e68faccca8ca495c1b759fd9eee466db9fb32".toLowerCase(), // PoolManager
      to: "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0".toLowerCase(), // HatchHook
      data: data,
    });
    console.log(`Call succeeded! Return value: ${result}`);
  } catch (err) {
    console.error("Call failed! Error details:");
    console.error(err);
    if (err.data) {
      console.log(`Revert data: ${err.data}`);
    }
  }
}

main().catch(console.error);
