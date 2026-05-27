const BEFORE_INITIALIZE_FLAG = 1n << 13n;
const AFTER_INITIALIZE_FLAG = 1n << 12n;
const BEFORE_ADD_LIQUIDITY_FLAG = 1n << 11n;
const AFTER_ADD_LIQUIDITY_FLAG = 1n << 10n;
const BEFORE_REMOVE_LIQUIDITY_FLAG = 1n << 9n;
const AFTER_REMOVE_LIQUIDITY_FLAG = 1n << 8n;
const BEFORE_SWAP_FLAG = 1n << 7n;
const AFTER_SWAP_FLAG = 1n << 6n;
const BEFORE_DONATE_FLAG = 1n << 5n;
const AFTER_DONATE_FLAG = 1n << 4n;
const BEFORE_SWAP_RETURNS_DELTA_FLAG = 1n << 3n;
const AFTER_SWAP_RETURNS_DELTA_FLAG = 1n << 2n;
const AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG = 1n << 1n;
const AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG = 1n << 0n;

function checkAddress(addr) {
  const addressBigInt = BigInt(addr);
  console.log(`Checking address: ${addr}`);
  console.log(`beforeInitialize: ${!!(addressBigInt & BEFORE_INITIALIZE_FLAG)}`);
  console.log(`afterInitialize: ${!!(addressBigInt & AFTER_INITIALIZE_FLAG)}`);
  console.log(`beforeAddLiquidity: ${!!(addressBigInt & BEFORE_ADD_LIQUIDITY_FLAG)}`);
  console.log(`afterAddLiquidity: ${!!(addressBigInt & AFTER_ADD_LIQUIDITY_FLAG)}`);
  console.log(`beforeRemoveLiquidity: ${!!(addressBigInt & BEFORE_REMOVE_LIQUIDITY_FLAG)}`);
  console.log(`afterRemoveLiquidity: ${!!(addressBigInt & AFTER_REMOVE_LIQUIDITY_FLAG)}`);
  console.log(`beforeSwap: ${!!(addressBigInt & BEFORE_SWAP_FLAG)}`);
  console.log(`afterSwap: ${!!(addressBigInt & AFTER_SWAP_FLAG)}`);
  console.log(`beforeDonate: ${!!(addressBigInt & BEFORE_DONATE_FLAG)}`);
  console.log(`afterDonate: ${!!(addressBigInt & AFTER_DONATE_FLAG)}`);
  console.log(`beforeSwapReturnsDelta: ${!!(addressBigInt & BEFORE_SWAP_RETURNS_DELTA_FLAG)}`);
  console.log(`afterSwapReturnsDelta: ${!!(addressBigInt & AFTER_SWAP_RETURNS_DELTA_FLAG)}`);
  console.log(`afterAddLiquidityReturnsDelta: ${!!(addressBigInt & AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG)}`);
  console.log(`afterRemoveLiquidityReturnsDelta: ${!!(addressBigInt & AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG)}`);
}

checkAddress("0x29b7f2A8a328066D070a9fC08A013e49F04a90c0");
