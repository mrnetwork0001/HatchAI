// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager, PoolKey, IHooks, Hooks, BeforeSwapDelta, BeforeSwapDeltaLibrary, BalanceDelta, BalanceDeltaLibrary} from "./UniswapV4Types.sol";

abstract contract BaseHook is IHooks {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    modifier onlyPoolManager() {
        require(msg.sender == address(manager), "Only PoolManager can call");
        _;
    }

    function getHookPermissions() public pure virtual override returns (Hooks.Permissions memory);

    function beforeInitialize(
        address,
        PoolKey calldata,
        uint160,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }

    function afterInitialize(
        address,
        PoolKey calldata,
        uint160,
        int24,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }

    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        uint128,
        uint128,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        uint128,
        uint128,
        BalanceDelta,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4, BalanceDelta) {
        revert("Not implemented");
    }

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        uint128,
        uint128,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        uint128,
        uint128,
        BalanceDelta,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4, BalanceDelta) {
        revert("Not implemented");
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        revert("Not implemented");
    }

    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4, int128) {
        revert("Not implemented");
    }

    function beforeDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }

    function afterDonate(
        address,
        PoolKey calldata,
        uint256,
        uint256,
        bytes calldata
    ) external virtual override onlyPoolManager returns (bytes4) {
        revert("Not implemented");
    }
}
