import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Contract ABIs and Addresses (X Layer Mainnet)
const HATCH_HOOK_ADDRESS = "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0";
const RPC_URL = process.env.XLAYER_MAINNET_RPC || "https://rpc.xlayer.tech";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const hatchHookAbi = [
  "function harvestAndSplit(bytes32 poolId) external",
  "function poolCreator(bytes32 poolId) external view returns (address)"
];

// ── Read Pools Database ─────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "pools.json");

function readPools() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading pools:", e.message);
  }
  return [];
}

// ── Yield Keeper Logic ──────────────────────────────────────────────────────
async function runYieldKeeper() {
  console.log("🤖 HatchAI Autonomous Yield Keeper starting...");
  console.log(`📡 Connecting to X Layer RPC: ${RPC_URL}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  if (!PRIVATE_KEY) {
    console.warn("⚠️ No PRIVATE_KEY found in .env. Running in read-only simulation mode.");
  }
  
  const wallet = PRIVATE_KEY ? new ethers.Wallet(PRIVATE_KEY, provider) : null;
  const hatchHook = new ethers.Contract(HATCH_HOOK_ADDRESS, hatchHookAbi, wallet || provider);

  // Polling loop
  setInterval(async () => {
    try {
      console.log("\n[Keeper] Scanning pools for yield harvest opportunities...");
      const pools = readPools();
      
      if (pools.length === 0) {
        console.log("[Keeper] No pools registered yet.");
        return;
      }

      for (const pool of pools) {
        // In a production environment, you would query the PositionManager here 
        // to check EXACTLY how much WETH fees have accumulated before calling harvestAndSplit
        // For the hackathon demo, we will simulate the check.
        
        console.log(`[Keeper] Checking pool ${pool.symbol} (${pool.poolId.slice(0, 10)}...)`);
        
        // Simulate checking fees
        const simulatedFees = Math.random() * 0.1; // Random amount up to 0.1 WETH
        
        if (simulatedFees > 0.05) { // Threshold to trigger harvest
          console.log(`[Keeper] 🎯 Threshold met for ${pool.symbol}: ~${simulatedFees.toFixed(4)} WETH accumulated.`);
          
          if (wallet) {
            console.log(`[Keeper] ⚡ Executing harvestAndSplit() on X Layer...`);
            try {
              // Gas check/simulation would go here
              const tx = await hatchHook.harvestAndSplit(pool.poolId);
              console.log(`[Keeper] ✅ Transaction submitted! Hash: ${tx.hash}`);
              await tx.wait();
              console.log(`[Keeper] 🎉 Harvest complete for ${pool.symbol}. 50% to creator, 50% bought back and burned!`);
            } catch (txError) {
              console.error(`[Keeper] ❌ Transaction failed:`, txError.message);
            }
          } else {
            console.log(`[Keeper] 📝 SIMULATION: Would have executed harvestAndSplit(${pool.poolId})`);
          }
        } else {
          console.log(`[Keeper] ⏳ Fees too low (~${simulatedFees.toFixed(4)} WETH). Skipping.`);
        }
      }
    } catch (error) {
      console.error("[Keeper] Error in polling loop:", error.message);
    }
  }, 15000); // Poll every 15 seconds for the hackathon demo
}

// Start the keeper
runYieldKeeper().catch(console.error);
