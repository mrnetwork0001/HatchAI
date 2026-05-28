// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

library PoolIdLibrary {
    function toId(PoolKey memory key) internal pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }
}

library LPFeeLibrary {
    uint24 public constant DYNAMIC_FEE_FLAG = 0x800000;
    uint24 public constant OVERRIDE_FEE_FLAG = 0x800000;
}

type BalanceDelta is int256;

library BalanceDeltaLibrary {
    function toBalanceDelta(int128 _amount0, int128 _amount1) internal pure returns (BalanceDelta) {
        return BalanceDelta.wrap((int256(_amount0) << 128) | (int256(_amount1) & 0xffffffffffffffffffffffffffffffff));
    }

    function amount0(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta) >> 128);
    }

    function amount1(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta));
    }
}

type BeforeSwapDelta is int256;
library BeforeSwapDeltaLibrary {
    BeforeSwapDelta public constant ZERO_DELTA = BeforeSwapDelta.wrap(0);
}

library Hooks {
    struct Permissions {
        bool beforeInitialize;
        bool afterInitialize;
        bool beforeAddLiquidity;
        bool afterAddLiquidity;
        bool beforeRemoveLiquidity;
        bool afterRemoveLiquidity;
        bool beforeSwap;
        bool afterSwap;
        bool beforeDonate;
        bool afterDonate;
        bool beforeSwapReturnDelta;
        bool afterSwapReturnDelta;
        bool afterAddLiquidityReturnDelta;
        bool afterRemoveLiquidityReturnDelta;
    }
}

interface IHooks {
    function getHookPermissions() external pure returns (Hooks.Permissions memory);

    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (bytes4);

    function afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick
    ) external returns (bytes4);

    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        uint128 amount0Max,
        uint128 amount1Max,
        bytes calldata hookData
    ) external returns (bytes4);

    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        uint128 amount0Max,
        uint128 amount1Max,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (bytes4, BalanceDelta);

    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        uint128 amount0Min,
        uint128 amount1Min,
        bytes calldata hookData
    ) external returns (bytes4);

    function afterRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        uint128 amount0Min,
        uint128 amount1Min,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (bytes4, BalanceDelta);

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4, BeforeSwapDelta, uint24);

    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external returns (bytes4, int128);

    function beforeDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external returns (bytes4);

    function afterDonate(
        address sender,
        PoolKey calldata key,
        uint256 amount0,
        uint256 amount1,
        bytes calldata hookData
    ) external returns (bytes4);
}

interface IPoolManager {
    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function initialize(
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (int24 tick);

    function swap(
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) external returns (BalanceDelta delta);

    function updateDynamicLPFee(PoolKey calldata key, uint24 newDynamicLPFee) external;
}
