import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
let db;

async function initDB() {
  db = await open({
    filename: process.env.NODE_ENV === "production" ? "/data/pools.db" : "./pools.db",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pools (
      poolId TEXT PRIMARY KEY,
      chainId INTEGER,
      symbol TEXT,
      isHatchCurrency0 BOOLEAN,
      projectTokenAddress TEXT,
      createdAt INTEGER,
      priceRatio TEXT,
      decayDurationHours TEXT,
      startFeePercent TEXT,
      endFeePercent TEXT,
      maxSwapAmountTokens TEXT,
      cooldownSeconds TEXT,
      seedProjectAmount TEXT,
      seedWethAmount TEXT,
      decayMode TEXT,
      startBlock INTEGER,
      poolKey TEXT
    )
  `);

  // Seed default showcase pools if they don't exist
  await seedDefaultPools();
}

async function seedDefaultPools() {
  const showcasePools = [
    { poolId: "0x1ea175ae9e7f075f8539de8f118f8407c7e046300ea3e94e2f3f318dc1229bdc", chainId: 196, symbol: "HAI", isHatchCurrency0: 0, projectTokenAddress: "0xef3a51df4761feab2ed21424f5123a793aea46dc", createdAt: Date.now(), poolKey: "{}" },
    { poolId: "0x8fb70c677e4715d804e07a0a3f976e8e985b56a83fc5bcc8d076c31718ae2989", chainId: 196, symbol: "NTU", isHatchCurrency0: 0, projectTokenAddress: "0x27f2373d532b94cd060da9303e8aeb1794a58d61", createdAt: Date.now(), poolKey: "{}" }
  ];

  for (const pool of showcasePools) {
    try {
      await db.run(
        `INSERT OR IGNORE INTO pools (poolId, chainId, symbol, isHatchCurrency0, projectTokenAddress, createdAt, poolKey) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pool.poolId, pool.chainId, pool.symbol, pool.isHatchCurrency0, pool.projectTokenAddress, pool.createdAt, pool.poolKey]
      );
    } catch (e) {
      console.error("Seed error:", e.message);
    }
  }
}

// API: Get all pools
app.get("/pools", async (req, res) => {
  try {
    const pools = await db.all("SELECT * FROM pools ORDER BY createdAt DESC");
    
    // Parse boolean and JSON fields back to original types
    const formattedPools = pools.map(p => ({
      ...p,
      isHatchCurrency0: p.isHatchCurrency0 === 1,
      poolKey: p.poolKey ? JSON.parse(p.poolKey) : {}
    }));

    res.json(formattedPools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add a new pool
app.post("/pools", async (req, res) => {
  try {
    const {
      poolId, chainId, symbol, isHatchCurrency0, projectTokenAddress,
      createdAt, priceRatio, decayDurationHours, startFeePercent,
      endFeePercent, maxSwapAmountTokens, cooldownSeconds,
      seedProjectAmount, seedWethAmount, decayMode, startBlock, poolKey
    } = req.body;

    if (!poolId || !chainId) {
      return res.status(400).json({ error: "poolId and chainId are required" });
    }

    await db.run(
      `INSERT OR REPLACE INTO pools (
        poolId, chainId, symbol, isHatchCurrency0, projectTokenAddress,
        createdAt, priceRatio, decayDurationHours, startFeePercent,
        endFeePercent, maxSwapAmountTokens, cooldownSeconds,
        seedProjectAmount, seedWethAmount, decayMode, startBlock, poolKey
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poolId, chainId, symbol || "UNKNOWN", isHatchCurrency0 ? 1 : 0, projectTokenAddress || "",
        createdAt || Date.now(), priceRatio || "0", decayDurationHours || "0", startFeePercent || "0",
        endFeePercent || "0", maxSwapAmountTokens || "0", cooldownSeconds || "0",
        seedProjectAmount || "0", seedWethAmount || "0", decayMode || "time", startBlock || 0,
        poolKey ? JSON.stringify(poolKey) : "{}"
      ]
    );

    res.json({ success: true, message: "Pool saved successfully" });
  } catch (error) {
    console.error("Error saving pool:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HatchAI Backend running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
});
