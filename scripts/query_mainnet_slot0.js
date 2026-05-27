import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");

  const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
  const projectToken = "0x27f2373D532b94cD060Da9303E8aeB1794A58d61";
  const hatchHook = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";

  const currency0 = projectToken.toLowerCase() < weth.toLowerCase() ? projectToken : weth;
  const currency1 = projectToken.toLowerCase() < weth.toLowerCase() ? weth : projectToken;

  const fees = [3000, 8388608];

  const stateViewAddress = "0x76fd297e2d437cd7f76d50f01afe6160f86e9990";
  const abi = [
    "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)"
  ];
  const contract = new ethers.Contract(stateViewAddress, abi, provider);

  for (const fee of fees) {
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = coder.encode(
      ["address", "address", "uint24", "int24", "address"],
      [currency0, currency1, fee, 60, hatchHook]
    );
    const poolId = ethers.keccak256(encoded);

    console.log(`\nFee: ${fee}`);
    console.log(`Computed PoolId: ${poolId}`);

    try {
      const slot0 = await contract.getSlot0(poolId);
      console.log(`sqrtPriceX96: ${slot0.sqrtPriceX96.toString()}`);
      console.log(`tick: ${slot0.tick.toString()}`);
      console.log(`protocolFee: ${slot0.protocolFee.toString()}`);
      console.log(`lpFee: ${slot0.lpFee.toString()}`);
      console.log(`Is Initialized: ${slot0.sqrtPriceX96 > 0n}`);
    } catch (e) {
      console.log(`Failed to query getSlot0: ${e.message}`);
    }
  }
}

main().catch(console.error);
