import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// ── Simple JSON file database ───────────────────────────────────────────────
const DB_PATH = fs.existsSync("/data") ? "/data/pools.json" : path.join(__dirname, "pools.json");

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

function writePools(pools) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(pools, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing pools:", e.message);
  }
}

// Seed default showcase pools on first run
function seedDefaults() {
  let pools = readPools();
  const defaults = [
    { poolId: "0x1ea175ae9e7f075f8539de8f118f8407c7e046300ea3e94e2f3f318dc1229bdc", chainId: 196, symbol: "HAI", isHatchCurrency0: false, projectTokenAddress: "0xef3a51df4761feab2ed21424f5123a793aea46dc", createdAt: Date.now(), priceRatio: "1000", startFeePercent: "10", endFeePercent: "0.3", maxSwapAmountTokens: "1000", cooldownSeconds: "30", decayDurationHours: "24", decayMode: "time", startBlock: 0, poolKey: {} },
    { poolId: "0x8fb70c677e4715d804e07a0a3f976e8e985b56a83fc5bcc8d076c31718ae2989", chainId: 196, symbol: "NTU", isHatchCurrency0: false, projectTokenAddress: "0x27f2373d532b94cd060da9303e8aeb1794a58d61", createdAt: Date.now(), priceRatio: "1000", startFeePercent: "10", endFeePercent: "0.3", maxSwapAmountTokens: "1000", cooldownSeconds: "30", decayDurationHours: "24", decayMode: "time", startBlock: 0, poolKey: {} }
  ];
  let changed = false;
  for (const d of defaults) {
    if (!pools.find(p => p.poolId === d.poolId)) {
      pools.push(d);
      changed = true;
    }
  }
  if (changed) writePools(pools);
}

seedDefaults();

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", pools: readPools().length });
});

// ── API: Get all pools ──────────────────────────────────────────────────────
app.get("/pools", (req, res) => {
  try {
    const pools = readPools();
    res.json(pools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── API: Add a new pool ────────────────────────────────────────────────────
app.post("/pools", (req, res) => {
  try {
    const { poolId, chainId } = req.body;

    if (!poolId || !chainId) {
      return res.status(400).json({ error: "poolId and chainId are required" });
    }

    const pools = readPools();
    const existingIdx = pools.findIndex(p => p.poolId === poolId);
    
    if (existingIdx >= 0) {
      pools[existingIdx] = { ...pools[existingIdx], ...req.body };
    } else {
      pools.unshift(req.body);
    }

    writePools(pools);
    res.json({ success: true, message: "Pool saved successfully" });
  } catch (error) {
    console.error("Error saving pool:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`HatchAI Backend running on port ${PORT}`);
});
