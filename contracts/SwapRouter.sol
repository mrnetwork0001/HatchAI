// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager, PoolKey, BalanceDelta, BalanceDeltaLibrary} from "./UniswapV4Types.sol";
import "hardhat/console.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract SwapRouter {
    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    struct SwapCallbackData {
        PoolKey key;
        IPoolManager.SwapParams params;
        bytes hookData;
        address sender;
    }

    function swap(
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta delta) {
        // Unlock the PoolManager and perform the swap
        bytes memory result = manager.unlock(
            abi.encode(SwapCallbackData({
                key: key,
                params: params,
                hookData: hookData,
                sender: msg.sender
            }))
        );
        return abi.decode(result, (BalanceDelta));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager), "Only PoolManager");
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));

        BalanceDelta delta = manager.swap(
            callbackData.key,
            callbackData.params,
            callbackData.hookData
        );

        int128 amount0 = BalanceDeltaLibrary.amount0(delta);
        int128 amount1 = BalanceDeltaLibrary.amount1(delta);

        // Settle currency0
        console.log("Settle currency0:");
        console.logInt(int256(amount0));
        if (amount0 < 0) {
            console.log("  syncing and settling currency0...");
            manager.sync(callbackData.key.currency0);
            IERC20(callbackData.key.currency0).transferFrom(
                callbackData.sender,
                address(manager),
                uint256(int256(-amount0))
            );
            uint256 paid = manager.settle();
            console.log("  settle returned paid:");
            console.log(paid);
        } else if (amount0 > 0) {
            console.log("  taking currency0...");
            manager.take(
                callbackData.key.currency0,
                callbackData.sender,
                uint256(int256(amount0))
            );
            console.log("  take completed.");
        }

        // Settle currency1
        console.log("Settle currency1:");
        console.logInt(int256(amount1));
        if (amount1 < 0) {
            console.log("  syncing and settling currency1...");
            manager.sync(callbackData.key.currency1);
            IERC20(callbackData.key.currency1).transferFrom(
                callbackData.sender,
                address(manager),
                uint256(int256(-amount1))
            );
            uint256 paid = manager.settle();
            console.log("  settle returned paid:");
            console.log(paid);
        } else if (amount1 > 0) {
            console.log("  taking currency1...");
            manager.take(
                callbackData.key.currency1,
                callbackData.sender,
                uint256(int256(amount1))
            );
            console.log("  take completed.");
        }

        return abi.encode(delta);
    }
}
