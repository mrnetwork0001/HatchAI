// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager, PoolKey, IHooks, BeforeSwapDelta, BalanceDelta, BalanceDeltaLibrary, LPFeeLibrary, PoolIdLibrary} from "../UniswapV4Types.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MockPoolManager is IPoolManager {
    using PoolIdLibrary for PoolKey;

    struct PoolState {
        uint256 reserves0;
        uint256 reserves1;
        bool initialized;
    }

    mapping(bytes32 => PoolState) public pools;
    mapping(bytes32 => uint256) public hookFees0;
    mapping(bytes32 => uint256) public hookFees1;

    event PoolInitialized(bytes32 indexed poolId, address currency0, address currency1, uint24 fee);
    event SwapExecuted(bytes32 indexed poolId, address indexed sender, bool zeroForOne, uint256 amountIn, uint256 amountOut, uint256 fee);

    function initialize(
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata /* hookData */
    ) external override returns (int24 tick) {
        bytes32 poolId = key.toId();
        require(!pools[poolId].initialized, "Pool already initialized");

        pools[poolId] = PoolState({
            reserves0: 0,
            reserves1: 0,
            initialized: true
        });

        emit PoolInitialized(poolId, key.currency0, key.currency1, key.fee);

        if (key.hooks != address(0)) {
            IHooks(key.hooks).afterInitialize(msg.sender, key, sqrtPriceX96, 0);
        }

        return 0;
    }

    // Helper to seed reserves (simulate adding liquidity)
    function addLiquidityDirect(
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1
    ) external {
        bytes32 poolId = key.toId();
        require(pools[poolId].initialized, "Pool not initialized");

        pools[poolId].reserves0 += amount0;
        pools[poolId].reserves1 += amount1;

        IERC20(key.currency0).transferFrom(msg.sender, address(this), amount0);
        IERC20(key.currency1).transferFrom(msg.sender, address(this), amount1);
    }

    function swap(
        PoolKey memory key,
        IPoolManager.SwapParams memory params,
        bytes calldata hookData
    ) external override returns (BalanceDelta delta) {
        bytes32 poolId = key.toId();
        PoolState storage pool = pools[poolId];
        require(pool.initialized, "Pool not initialized");

        uint256 amountSpecified = params.amountSpecified < 0 
            ? uint256(-params.amountSpecified) 
            : uint256(params.amountSpecified);
        require(amountSpecified > 0, "Amount specified must be non-zero");

        uint24 fee = key.fee;

        // 1. Call beforeSwap Hook
        if (key.hooks != address(0)) {
            (bytes4 selector, , uint24 feeOverride) = IHooks(key.hooks).beforeSwap(
                msg.sender,
                key,
                params,
                hookData
            );
            require(selector == IHooks.beforeSwap.selector, "Invalid hook beforeSwap selector");
            
            // Check if fee override flag is present
            if ((feeOverride & LPFeeLibrary.OVERRIDE_FEE_FLAG) != 0) {
                fee = feeOverride & 0x7fffff; // Strip flag to get actual fee
            }
        }
        uint256 amountOut;
        uint256 feeAmount;

        if (params.zeroForOne) {
            // Swap Token0 -> Token1
            feeAmount = (amountSpecified * fee) / 1_000_000;
            uint256 amountInMinusFee = amountSpecified - feeAmount;
            
            require(pool.reserves0 > 0, "No reserves0");
            amountOut = (pool.reserves1 * amountInMinusFee) / (pool.reserves0 + amountInMinusFee);
            require(amountOut < pool.reserves1, "Insufficient liquidity output");

            pool.reserves0 += amountSpecified;
            pool.reserves1 -= amountOut;

            // Transfer tokens
            IERC20(key.currency0).transferFrom(msg.sender, address(this), amountSpecified);
            IERC20(key.currency1).transfer(msg.sender, amountOut);

            // Record fee
            hookFees0[poolId] += feeAmount;
            
            delta = BalanceDeltaLibrary.toBalanceDelta(
                int128(int256(amountSpecified)),
                -int128(int256(amountOut))
            );

            emit SwapExecuted(poolId, msg.sender, true, amountSpecified, amountOut, feeAmount);
        } else {
            // Swap Token1 -> Token0
            feeAmount = (amountSpecified * fee) / 1_000_000;
            uint256 amountInMinusFee = amountSpecified - feeAmount;

            require(pool.reserves1 > 0, "No reserves1");
            amountOut = (pool.reserves0 * amountInMinusFee) / (pool.reserves1 + amountInMinusFee);
            require(amountOut < pool.reserves0, "Insufficient liquidity output");

            pool.reserves1 += amountSpecified;
            pool.reserves0 -= amountOut;

            // Transfer tokens
            IERC20(key.currency1).transferFrom(msg.sender, address(this), amountSpecified);
            IERC20(key.currency0).transfer(msg.sender, amountOut);

            // Record fee
            hookFees1[poolId] += feeAmount;

            delta = BalanceDeltaLibrary.toBalanceDelta(
                -int128(int256(amountOut)),
                int128(int256(amountSpecified))
            );

            emit SwapExecuted(poolId, msg.sender, false, amountSpecified, amountOut, feeAmount);
        }

        // 2. Call afterSwap Hook
        if (key.hooks != address(0)) {
            (bytes4 selector, ) = IHooks(key.hooks).afterSwap(
                msg.sender,
                key,
                params,
                delta,
                hookData
            );
            require(selector == IHooks.afterSwap.selector, "Invalid hook afterSwap selector");
        }

        return delta;
    }

    function updateDynamicLPFee(PoolKey memory key, uint24) external override {
        // Mock method signature
    }

    function unlock(bytes calldata) external override returns (bytes memory) {
        revert("MockPoolManager: unlock not implemented");
    }

    function sync(address) external override {
        // Mock method signature
    }

    function settle() external payable override returns (uint256) {
        revert("MockPoolManager: settle not implemented");
    }

    function take(address, address, uint256) external override {
        revert("MockPoolManager: take not implemented");
    }

    function currencyDelta(address, address) external view override returns (int256) {
        return 0;
    }

    function claimHookFees(
        PoolKey calldata key,
        address recipient
    ) external returns (uint256 fee0, uint256 fee1) {
        bytes32 poolId = key.toId();
        
        fee0 = hookFees0[poolId];
        fee1 = hookFees1[poolId];

        hookFees0[poolId] = 0;
        hookFees1[poolId] = 0;

        if (fee0 > 0) {
            IERC20(key.currency0).transfer(recipient, fee0);
        }
        if (fee1 > 0) {
            IERC20(key.currency1).transfer(recipient, fee1);
        }
    }
}
