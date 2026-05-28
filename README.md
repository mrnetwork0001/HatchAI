<h1 align="center">HatchAI</h1>

<p align="center">
  <strong>Uniswap V4 Hook-Protected Token Launchpad on X Layer</strong>
</p>


<img width="1577" height="988" alt="27 05 2026_12 38 24_REC" src="https://github.com/user-attachments/assets/9c4f9d42-033b-4089-9bab-3297053879d4"/>


<p align="center">
  <a href="https://hatchai.online">Live App</a> ·
  <a href="https://www.oklink.com/xlayer/address/0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0">Mainnet Contract</a> ·
  <a href="https://flasp.sh">Flasp.sh</a>
</p>


---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Problem Statement](#problem-statement)
- [How HatchAI Works](#how-hatchai-works)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Deployed Addresses](#deployed-addresses)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Backend API](#backend-api)
- [Testing](#testing)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

HatchAI is a decentralized token launchpad built on **X Layer** (OKX's EVM L2), powered by **Uniswap V4 Hooks** and integrated with **[Flasp.sh](https://flasp.sh)** for flash loan-resistant pool mechanics. It provides institutional-grade launch protection through on-chain dynamic fee decay, anti-whale swap caps, and wallet cooldown timers - all enforced natively inside the Uniswap V4 pool, with zero off-chain dependencies.

Projects can launch tokens directly into protected Uniswap V4 pools where bot frontrunning is financially disincentivized, whale manipulation is capped, and creator yield is automatically generated through a deflationary buyback-and-burn loop.

### Key Features

- **Dynamic Fee Decay** - Fees start high (10%) and linearly decay to baseline (0.3%) over a configurable window
- **Anti-Whale Caps** - Per-transaction swap limits enforced on-chain during the launch phase
- **Wallet Cooldowns** - Configurable delay between consecutive swaps from the same address
- **Buyback & Burn** - 50% of collected fees auto-buy project tokens and burn them
- **Creator Yield** - 50% of fees go directly to the project creator
- **Flasp.sh Integration** - Flash loan-aware hook mechanics for additional pool security
- **Multi-Network** - Supports X Layer Mainnet (196) and Testnet (1952) with automatic network switching

---

## Live Demo

| Resource | Link |
|----------|------|
| **Live Application** | [https://hatchai.online](https://hatchai.online) |
| **HatchHook on OKLink** | [View on Explorer →](https://www.oklink.com/xlayer/address/0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0) |
| **Flasp.sh** | [https://flasp.sh](https://flasp.sh) |

### Showcase Pools (Mainnet)

| Token | Contract Address | Pool ID |
|-------|-----------------|---------|
| **HAI** | [`0xef3a51df4761feab2ed21424f5123a793aea46dc`](https://www.oklink.com/xlayer/address/0xef3a51df4761feab2ed21424f5123a793aea46dc) | `0x1ea175ae...1229bdc` |
| **NTU** | [`0x27f2373d532b94cd060da9303e8aeb1794a58d61`](https://www.oklink.com/xlayer/address/0x27f2373d532b94cd060da9303e8aeb1794a58d61) | `0x8fb70c67...ae2989` |

---

## Problem Statement

Modern token launches on decentralized exchanges suffer from three critical vulnerabilities:

| Threat | Description | Impact |
|--------|------------|--------|
| **Sniper Bots** | Algorithms that buy massive supply in the exact block liquidity is added, frontrunning retail participants | Unfair distribution; community priced out |
| **Whale Manipulation** | Large early swaps that create extreme price slippage and trigger panic selling | Price instability; eroded trust |
| **Unsustainable Yield** | Trading fees go entirely to passive LPs, providing no funding for ongoing project development | Projects lose momentum post-launch |

Existing launchpad models (bonding curves, fair launches) protect the pre-DEX phase but offer **zero protection once liquidity migrates to a public pool**. HatchAI fills this gap.

---

## How HatchAI Works

HatchAI introduces the **`HatchHook`** - a Uniswap V4 hook contract that intercepts swap operations to enforce a configurable launch protection window.

### Dynamic Fee Decay

Swap fees start high (e.g., **10%**) at launch, making bot frontrunning financially non-viable. Over a configurable decay duration (e.g., 24 hours), the fee decays **linearly on-chain** to the project's baseline rate (e.g., **0.3%**).

```
Launch          12h (~5.2%)         24h (0.3%)
  ●━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━●
 10% fee         decaying...       standard fee
```

### Anti-Whale Swap Caps

Individual transaction sizes are capped during the launch phase, enforcing a maximum swap amount per trade. This ensures decentralized and fair token distribution among early participants.

### Wallet Cooldown Timers

A configurable delay (in seconds) is enforced between consecutive trades from the same wallet address, neutralizing high-frequency trading algorithms.

### Deflationary Yield Loop

Collected trading fees (in WETH) are harvested and split on-chain:

- **50% → Creator Yield**: Sent directly to the project creator wallet
- **50% → Buyback & Burn**: Used to buy project tokens from the pool and burn them, applying constant buy pressure and reducing circulating supply

### Flasp.sh Integration

[Flasp.sh](https://flasp.sh) provides flash loan-aware hooks that add an additional layer of security to HatchAI pools, preventing flash loan attacks during the critical launch window.

---

## Architecture

```mermaid
graph TD
    User([Trader]) -->|1. Swap WETH ↔ Token| PM[Uniswap V4 PoolManager]
    PM -->|2. beforeSwap callback| HH[HatchHook Contract]
    HH -->|3. Enforce whale caps & cooldowns| HH
    HH -->|4. Compute dynamic decaying fee| HH
    HH -->|5. Return modified fee| PM
    PM -->|6. Execute trade & accrue fees in Hook| HH

    Creator([Project Creator]) -->|7. Claim & harvest| HH
    HH -->|8a. 50% creator yield| CreatorWallet[Creator Wallet]
    HH -->|8b. 50% buyback & burn| PM
    PM -->|9. Burn tokens| Burn[Zero Address 🔥]

    Flasp([Flasp.sh]) -.->|Flash loan guard| HH
```

### Contract Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Wallet                           │
│  MetaMask / OKX Wallet                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ swap(poolKey, params, hookData)
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Uniswap V4 PoolManager                         │
│  0x360e68faCcca8cA495c1B759Fd9EEe466db9FB32                │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ initialize() │  │ beforeSwap() │  │ afterInitialize()│  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼─────────────┘
          │                │                   │
          ▼                ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 HatchHook Contract                          │
│  Permission Mask: 0x10C0 (afterInitialize|beforeSwap|       │
│                           afterSwap)                        │
│                                                             │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │  LaunchConfig     │  │  Fee Decay Engine              │  │
│  │  - creator        │  │  - startFee → endFee           │  │
│  │  - projectToken   │  │  - linear decay over duration  │  │
│  │  - decayDuration  │  │  - per-wallet cooldown         │  │
│  │  - maxSwapAmount  │  │  - anti-whale cap enforcement  │  │
│  └──────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Contracts

| Contract | Description | Source |
|----------|-------------|--------|
| `HatchHook.sol` | Core hook implementing dynamic fees, anti-whale caps, cooldowns, and yield harvesting | [`contracts/HatchHook.sol`](contracts/HatchHook.sol) |
| `BaseHook.sol` | Abstract base providing Uniswap V4 hook callback scaffolding and `onlyPoolManager` guard | [`contracts/BaseHook.sol`](contracts/BaseHook.sol) |
| `UniswapV4Types.sol` | Type definitions for `PoolKey`, `IHooks`, `IPoolManager`, and helper libraries | [`contracts/UniswapV4Types.sol`](contracts/UniswapV4Types.sol) |
| `MockPoolManager.sol` | Testnet-only mock that simulates the Uniswap V4 PoolManager for local development | [`contracts/mocks/MockPoolManager.sol`](contracts/mocks/MockPoolManager.sol) |
| `MockERC20.sol` | Mintable ERC20 for testnet pool seeding | [`contracts/MockERC20.sol`](contracts/MockERC20.sol) |

### Hook Permissions

HatchHook requires the following Uniswap V4 hook permission flags encoded in the contract's deploy address (lower 14 bits = `0x10C0`):

| Permission | Bit | Used For |
|------------|-----|----------|
| `afterInitialize` | 12 | Register pool with the hook on creation |
| `beforeSwap` | 7 | Enforce anti-whale caps, cooldowns, compute dynamic fee |
| `afterSwap` | 6 | Accrue and track collected fees |

---

## Deployed Addresses

### X Layer Mainnet (Chain ID: `196`)

| Contract | Address | Explorer |
|----------|---------|----------|
| **PoolManager** (Official Uniswap V4) | `0x360e68faCcca8cA495c1B759Fd9EEe466db9FB32` | [View →](https://www.oklink.com/xlayer/address/0x360e68faCcca8cA495c1B759Fd9EEe466db9FB32) |
| **HatchHook** | `0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0` | [View →](https://www.oklink.com/xlayer/address/0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0) |
| **StateView** | `0x76fd297e2d437cd7f76d50f01afe6160f86e9990` | [View →](https://www.oklink.com/xlayer/address/0x76fd297e2d437cd7f76d50f01afe6160f86e9990) |
| **PositionManager** | `0xcf1eafc6928dc385a342e7c6491d371d2871458b` | [View →](https://www.oklink.com/xlayer/address/0xcf1eafc6928dc385a342e7c6491d371d2871458b) |
| **WETH** | `0x5A77f1443D16ee5761d310e38b62f77f726bC71c` | [View →](https://www.oklink.com/xlayer/address/0x5A77f1443D16ee5761d310e38b62f77f726bC71c) |
| **USDT0** | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` | [View →](https://www.oklink.com/xlayer/address/0x779Ded0c9e1022225f8E0630b35a9b54bE713736) |
| **CREATE2 Deployer** | `0x5C3322358C4F3e426870d2eF96cDEc2CF4252E19` | [View →](https://www.oklink.com/xlayer/address/0x5C3322358C4F3e426870d2eF96cDEc2CF4252E19) |

### X Layer Testnet (Chain ID: `1952`)

| Contract | Address | Explorer |
|----------|---------|----------|
| **PoolManager** (Mock) | `0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D` | [View →](https://www.oklink.com/xlayer-test/address/0xe5392F2AF7f2DA3C386cB879C35ABfa2DAcdaE4D) |
| **HatchHook** | `0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f` | [View →](https://www.oklink.com/xlayer-test/address/0xe78117Bf2Ca342ce1DcBa2367d3CCAb30bb3508f) |
| **WETH** (Mock) | `0xc147621C235a8004adC2C5dFC90b78ef50B0a061` | [View →](https://www.oklink.com/xlayer-test/address/0xc147621C235a8004adC2C5dFC90b78ef50B0a061) |
| **HATCH Token** (Mock) | `0x9363Ef64d538BEe4706Aa2Dd13cfB559441d7c71` | [View →](https://www.oklink.com/xlayer-test/address/0x9363Ef64d538BEe4706Aa2Dd13cfB559441d7c71) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.24, Hardhat, Ethers.js v6 |
| **Hook Framework** | Uniswap V4 Core (IHooks, IPoolManager) |
| **Flash Loan Security** | [Flasp.sh](https://flasp.sh) |
| **Deployment** | CREATE2 deterministic deploy (for hook address mining) |
| **Frontend** | React 19, Vite 8, Ethers.js v6 |
| **Backend** | Node.js, Express, JSON file storage |
| **Wallet Integration** | MetaMask, OKX Wallet (direct `BrowserProvider`) with auto network switching |
| **Hosting** | Vercel (frontend), Railway (backend API) |
| **Chain** | X Layer Mainnet (196) / Testnet (1952) |
| **Block Explorer** | OKLink |
| **Design System** | Sand `#F0ECE4`, Coral `#D2825A`, Ink `#32343A` |
| **Typography** | Work Sans · Instrument Serif (Italic) · Geist Mono |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MetaMask** or **OKX Wallet** browser extension
- OKB for gas (X Layer Mainnet) or test OKB (Testnet)

### 1. Clone & Install

```bash
git clone https://github.com/mrnetwork0001/HatchAI.git
cd HatchAI
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_deployer_private_key
XLAYER_TESTNET_RPC=https://testrpc.xlayer.tech
XLAYER_MAINNET_RPC=https://rpc.xlayer.tech
```

### 3. Compile Contracts

```bash
npx hardhat compile
```

### 4. Launch Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Launch Backend (Optional)

```bash
cd backend
npm install
npm start
```

The backend API runs on [http://localhost:3001](http://localhost:3001) and provides global pool synchronization.

---

## Deployment

### Smart Contracts

#### Testnet (X Layer Testnet)

Deploys MockPoolManager, HatchHook, and mock tokens:

```bash
npx hardhat run scripts/deploy.js --network xlayer_testnet
```

#### Mainnet (X Layer Mainnet)

Deploys HatchHook via CREATE2 against the official Uniswap V4 PoolManager. The script mines a salt to produce an address whose lower 14 bits match the hook permission mask `0x10C0`:

```bash
npx hardhat run scripts/deploy_mainnet.js --network xlayer_mainnet
```

> **Note:** The mainnet deployment script automatically updates `frontend/src/deployments.json` with the new contract addresses.

### Frontend (Vercel)

The frontend is deployed to **Vercel** and automatically rebuilds on every push to `main`:

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `/frontend`
3. Add environment variable: `VITE_BACKEND_URL` = your Railway backend URL
4. Deploy

### Backend (Railway)

The backend API is deployed to **Railway** for global pool synchronization:

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Set **Root Directory** to `/backend`
3. Add environment variable: `PORT` = `3001`
4. Generate a public domain
5. The backend auto-starts with `npm start`

---

## Backend API

The backend provides two simple endpoints for global pool synchronization:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/pools` | Returns all registered pools as JSON |
| `POST` | `/pools` | Register a new pool (requires `poolId` and `chainId`) |
| `GET` | `/` | Health check - returns status and pool count |

### Example

```bash
# Get all pools
curl https://hatchai-production.up.railway.app/pools

# Register a new pool
curl -X POST https://hatchai-production.up.railway.app/pools \
  -H "Content-Type: application/json" \
  -d '{"poolId": "0x...", "chainId": 196, "symbol": "TOKEN"}'
```

---

## Testing

### Fork-Based E2E Test

Runs a full lifecycle simulation against a forked mainnet state - deploys HatchHook via CREATE2, initializes a pool on the official PoolManager, and configures launch parameters:

```bash
npx hardhat test test/SimulateInitialize.js
```

### Local Simulation

Deploys all contracts to a local Hardhat node and simulates the complete swap + fee decay lifecycle:

```bash
npx hardhat run scripts/simulate.js
```

---

## Usage Guide

### 1. Launch a Token Pool

1. Open the app and connect your wallet to **X Layer**
2. If your wallet doesn't have X Layer configured, the app will automatically prompt you to add the network and switch to it
3. Navigate to the **Hatch Pool Portal**
4. Click **+ Create Your Token Sale**
5. Enter your ERC20 token contract address
6. Configure launch parameters:
   - **Decay Duration** - How long the fee decay lasts (e.g., 24 hours)
   - **Start Fee** - Initial high fee to deter bots (e.g., 10%)
   - **End Fee** - Baseline fee after decay completes (e.g., 0.3%)
   - **Anti-Whale Cap** - Max tokens per swap during launch phase
   - **Cooldown** - Seconds between swaps per wallet
7. Click **Initialize Launch Pool** to deploy on-chain

### 2. Trade on a Protected Pool

1. Select a live pool from the **Pool Portal**
2. Click **Enter Swap Terminal**
3. Input the WETH amount and execute the swap
4. The dynamic fee is applied automatically based on time elapsed since launch

### 3. Claim Creator Yield

1. Navigate to the pool dashboard
2. Click **Claim Creator Yield & Trigger Buyback-Burn**
3. 50% of accumulated WETH fees are sent to your wallet
4. The remaining 50% buys back project tokens and burns them

### 4. Import an Existing Pool

1. Go to the **Token Launchpad** tab
2. Enter the project token's contract address
3. The app will detect if a HatchHook pool already exists for that token
4. Click **Import** to add it to your dashboard

---

## Project Structure

```
HatchAI/
├── contracts/                    # Solidity smart contracts
│   ├── HatchHook.sol            # Core hook: fees, caps, cooldowns, yield
│   ├── BaseHook.sol             # Abstract hook base with permission system
│   ├── UniswapV4Types.sol       # Uniswap V4 interfaces and types
│   ├── MockERC20.sol            # Mintable test token
│   └── mocks/
│       └── MockPoolManager.sol  # Testnet-only pool manager mock
│
├── scripts/                      # Deployment and utility scripts
│   ├── deploy.js                # Testnet full deployment
│   ├── deploy_mainnet.js        # Mainnet CREATE2 deployment
│   ├── simulate.js              # Local lifecycle simulation
│   └── simulate_fork.js         # Mainnet fork simulation
│
├── test/
│   └── SimulateInitialize.js    # E2E fork-based integration test
│
├── frontend/                     # React SPA (Vercel)
│   ├── src/
│   │   ├── App.jsx              # Main application UI
│   │   ├── WalletContext.jsx    # On-chain state management & wallet provider
│   │   ├── deployments.json     # Auto-updated contract addresses
│   │   ├── index.css            # Design system & theme tokens
│   │   └── lib/                 # Wallet connection & chain utilities
│   ├── .env.development         # Local backend URL
│   ├── .env.production          # Production backend URL (Railway)
│   └── package.json
│
├── backend/                      # Express API (Railway)
│   ├── index.js                 # Pool sync API server
│   ├── pools.json               # JSON file database
│   ├── railway.json             # Railway deployment config
│   └── package.json
│
├── hardhat.config.js             # Hardhat configuration (Solidity 0.8.24, viaIR)
├── package.json
└── README.md
```

---

## Roadmap: Fee Harvesting & Deflationary Buyback on Mainnet

The **Payout & Deflationary Buyback** mechanism is the economic engine of HatchAI. Below is the detailed architecture for how on-chain fee harvesting, creator yield distribution, and automated buyback-and-burn will be wired on mainnet.

### How Uniswap V4 Fees Work

In Uniswap V4, swap fees do **not** automatically land in the hook contract. Instead, fees accrue inside the PoolManager's internal accounting system against the **LP position** (represented as a Uniswap V4 LP NFT minted by the `PositionManager`). To collect accumulated fees, the LP NFT owner must call `collect()` on the `PositionManager`.

This means the **HatchHook** contract needs ownership of the LP position to autonomously harvest, split, and redistribute fees.

### Mainnet Wiring Plan

```
┌──────────────────────────────────────────────────────────────────┐
│                    Fee Harvesting Architecture                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Pool Creator launches token via HatchAI frontend        │
│          └─ Pool is initialized on PoolManager                   │
│          └─ Liquidity is seeded via PositionManager               │
│          └─ LP NFT is minted (ERC-721 tokenId)                   │
│                                                                  │
│  Step 2: Creator transfers LP NFT to the HatchHook contract     │
│          └─ HatchHook becomes the owner of the LP position       │
│          └─ This enables autonomous fee collection               │
│                                                                  │
│  Step 3: Anyone calls harvestAndSplit() on HatchHook             │
│          └─ HatchHook calls PositionManager.collect(tokenId)     │
│          └─ Accumulated WETH fees are withdrawn to HatchHook     │
│                                                                  │
│  Step 4: HatchHook splits the collected WETH on-chain            │
│          ├─ 50% → Creator Wallet (direct WETH transfer)          │
│          └─ 50% → Buyback & Burn                                 │
│              └─ Swap WETH → Project Token via PoolManager        │
│              └─ Burn received tokens (transfer to 0xdead)        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** — Hook Protections | Dynamic fee decay, anti-whale caps, wallet cooldowns enforced via `beforeSwap` / `afterSwap` hooks | ✅ Live on Mainnet |
| **Phase 2** — Pool Initialization | One-click token launch with full Uniswap V4 pool setup (initialize + seed liquidity + configure hook) | ✅ Live on Mainnet |
| **Phase 3** — Swap Execution | Protected WETH ↔ Token swaps via the custom `SwapRouter` with proper `sync` / `settle` / `take` settlement | ✅ Live on Mainnet |
| **Phase 4** — LP NFT Custody | Frontend prompts creator to transfer LP NFT to HatchHook. Hook stores `tokenId` per pool in a mapping | 🔨 Next Sprint |
| **Phase 5** — Fee Harvesting | `harvestAndSplit(PoolId)` function on HatchHook: calls `PositionManager.collect()`, splits WETH 50/50 | 🔨 Next Sprint |
| **Phase 6** — Automated Buyback | The 50% buyback portion triggers an internal swap (WETH → Project Token) and burns the output | 🔨 Next Sprint |
| **Phase 7** — Permissionless Crank | Allow anyone to call `harvestAndSplit()` with a small gas incentive (1% of harvest) to ensure continuous operation | 📋 Planned |

### Technical Details

#### LP NFT Transfer

The Uniswap V4 `PositionManager` is an ERC-721. Pool creators transfer their LP NFT to HatchHook via:

```solidity
// Creator calls this on the PositionManager (ERC-721)
positionManager.transferFrom(creator, hatchHookAddress, tokenId);
```

Once transferred, HatchHook records the `tokenId` in its storage:

```solidity
mapping(PoolId => uint256) public poolLpTokenId;
mapping(PoolId => address) public poolCreator;
```

#### Harvest & Split Function

```solidity
function harvestAndSplit(PoolId poolId) external {
    uint256 tokenId = poolLpTokenId[poolId];
    require(tokenId != 0, "No LP NFT deposited");

    // 1. Collect accrued fees from PositionManager
    (uint256 amount0, uint256 amount1) = positionManager.collect(
        tokenId, address(this), type(uint128).max, type(uint128).max
    );

    // 2. Identify WETH fees
    uint256 wethFees = /* amount from the WETH side */;

    // 3. Split 50/50
    uint256 creatorShare = wethFees / 2;
    uint256 buybackShare = wethFees - creatorShare;

    // 4. Send creator yield
    IWETH(weth).transfer(poolCreator[poolId], creatorShare);

    // 5. Buyback & burn
    _buybackAndBurn(poolId, buybackShare);
}

function _buybackAndBurn(PoolId poolId, uint256 wethAmount) internal {
    // Swap WETH → Project Token via PoolManager
    // Transfer received tokens to 0x000...dead (burn)
}
```

#### Why This Architecture?

| Design Choice | Rationale |
|---------------|-----------|
| **Hook holds LP NFT** | Enables trustless, autonomous fee collection without creator intervention |
| **Permissionless `harvestAndSplit()`** | Anyone can trigger the harvest — no centralized keeper required |
| **On-chain split** | 50/50 ratio is enforced in the smart contract, not off-chain |
| **Internal buyback swap** | Uses the same Uniswap V4 pool, creating genuine on-chain buy pressure |
| **Burn to 0xdead** | Verifiable on-chain deflation — not locked, truly destroyed |

### Current State (Hackathon Submission)

The HatchAI frontend already displays the **Payout & Deflationary Buyback** dashboard (Section 3 in the pool view) with:

- **Pool Creator Yield** — Shows accumulated WETH fees earmarked for the creator
- **Pool Tokens Burned** — Tracks total project tokens burned via buyback
- **Hook Fees (100%)** — Displays the total fee pool with 50/50 split visualization
- **LP NFT Transfer UI** — Provides the HatchHook address for LP NFT transfer
- **Harvest Button** — Triggers `harvestAndSplit()` when wired

The smart contract hooks (`beforeSwap` dynamic fee, `afterSwap` fee tracking) are live and enforcing fees on every swap. The fee revenue is accumulating inside the PoolManager's internal ledger against the LP position. The remaining work is connecting the `collect()` → `split()` → `burn()` pipeline, which requires no changes to the existing hook architecture.

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please ensure all contracts compile and tests pass before submitting.

---

## License

This project is licensed under the [ISC License](LICENSE).

---

<p align="center">
  Built on <strong>X Layer</strong> · Powered by <strong>Uniswap V4 Hooks</strong> · Secured by <strong><a href="https://flasp.sh">Flasp.sh</a></strong>
</p>
