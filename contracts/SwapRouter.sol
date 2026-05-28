// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager, PoolKey, BalanceDelta, BalanceDeltaLibrary} from "./UniswapV4Types.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
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

        // Transfer input token from the user to the PoolManager
        address inputToken = callbackData.params.zeroForOne ? callbackData.key.currency0 : callbackData.key.currency1;
        uint256 amountIn = uint256(callbackData.params.amountSpecified);

        // Perform the transfer from user to PoolManager
        require(
            IERC20(inputToken).transferFrom(callbackData.sender, address(manager), amountIn),
            "Transfer in failed"
        );

        // Perform swap
        BalanceDelta delta = manager.swap(callbackData.key, callbackData.params, callbackData.hookData);

        // Settle the balance changes with the PoolManager
        // If amount is negative, the PoolManager owes us (meaning we get tokens).
        // If amount is positive, we owe the PoolManager (meaning we must pay).
        
        if (callbackData.params.zeroForOne) {
            // zeroForOne = true: input is currency0, output is currency1
            int128 amount1 = BalanceDeltaLibrary.amount1(delta);
            
            // Settle currency0
            manager.settle(callbackData.key.currency0);
            
            // Take currency1 (transfer from PoolManager to user)
            uint256 amountOut = uint256(int256(-amount1));
            manager.take(callbackData.key.currency1, callbackData.sender, amountOut);
        } else {
            // zeroForOne = false: input is currency1, output is currency0
            int128 amount0 = BalanceDeltaLibrary.amount0(delta);
            
            // Settle currency1
            manager.settle(callbackData.key.currency1);
            
            // Take currency0 (transfer from PoolManager to user)
            uint256 amountOut = uint256(int256(-amount0));
            manager.take(callbackData.key.currency0, callbackData.sender, amountOut);
        }

        return abi.encode(delta);
    }
}
