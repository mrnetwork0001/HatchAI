// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "./BaseHook.sol";
import {IPoolManager, PoolKey, Hooks, BeforeSwapDelta, BeforeSwapDeltaLibrary, BalanceDelta, BalanceDeltaLibrary, LPFeeLibrary, PoolIdLibrary} from "./UniswapV4Types.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract HatchHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    struct LaunchConfig {
        address creator;
        address projectToken;
        uint256 launchTime;
        uint256 decayDuration;
        uint24 startFee;      // e.g. 100000 for 10%
        uint24 endFee;        // e.g. 3000 for 0.3%
        uint256 maxSwapAmount; // max project token per swap during protection
        uint256 cooldownDuration; // swap cooldown per address (e.g., 60 seconds)
    }

    mapping(bytes32 => LaunchConfig) public poolConfigs;
    mapping(bytes32 => mapping(address => uint256)) public lastSwapTimestamp;
    
    // Track stats for display on frontend
    mapping(bytes32 => uint256) public totalCreatorFeesClaimed;
    mapping(bytes32 => uint256) public totalTokensBurned;

    event LaunchInitialized(bytes32 indexed poolId, address indexed creator, address projectToken, uint256 launchTime);
    event FeesDistributed(bytes32 indexed poolId, uint256 creatorShare, uint256 buybackAmount, uint256 tokensBurned);

    constructor(IPoolManager _manager) BaseHook(_manager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true, // Needed to set up launch config
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,  // Needed for fee override & cooldown
            afterSwap: true,   // Needed for anti-whale check
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function afterInitialize(
        address,
        PoolKey calldata key,
        uint160,
        int24,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4) {
        (
            address creator,
            address projectToken,
            uint256 decayDuration,
            uint24 startFee,
            uint24 endFee,
            uint256 maxSwapAmount,
            uint256 cooldownDuration
        ) = abi.decode(hookData, (address, address, uint256, uint24, uint24, uint256, uint256));

        bytes32 poolId = key.toId();
        poolConfigs[poolId] = LaunchConfig({
            creator: creator,
            projectToken: projectToken,
            launchTime: block.timestamp,
            decayDuration: decayDuration,
            startFee: startFee,
            endFee: endFee,
            maxSwapAmount: maxSwapAmount,
            cooldownDuration: cooldownDuration
        });

        emit LaunchInitialized(poolId, creator, projectToken, block.timestamp);
        return this.afterInitialize.selector;
    }

    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        bytes32 poolId = key.toId();
        LaunchConfig memory config = poolConfigs[poolId];

        // Check if pool has been configured
        if (config.creator == address(0)) {
            return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        uint24 currentFee = config.endFee;

        // Apply launch protections if within decay duration
        if (block.timestamp < config.launchTime + config.decayDuration) {
            // 1. Enforce cooldown using tx.origin to bypass contract proxy bypasses
            require(
                block.timestamp - lastSwapTimestamp[poolId][tx.origin] >= config.cooldownDuration,
                "Hatch: swap cooldown active"
            );
            lastSwapTimestamp[poolId][tx.origin] = block.timestamp;

            // 2. Calculate dynamic fee based on linear decay
            uint256 elapsedTime = block.timestamp - config.launchTime;
            uint256 feeRange = config.startFee - config.endFee;
            currentFee = uint24(config.startFee - ((elapsedTime * feeRange) / config.decayDuration));
        }

        // Return selector, zero delta, and fee with override flag
        return (
            this.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            currentFee | LPFeeLibrary.OVERRIDE_FEE_FLAG
        );
    }

    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4, int128) {
        bytes32 poolId = key.toId();
        LaunchConfig memory config = poolConfigs[poolId];

        // If protection is active, enforce anti-whale limits
        if (config.creator != address(0) && block.timestamp < config.launchTime + config.decayDuration) {
            // Get amount of project token swapped in this transaction
            uint256 projectTokenAmount;
            if (key.currency0 == config.projectToken) {
                int128 amount0 = BalanceDeltaLibrary.amount0(delta);
                projectTokenAmount = amount0 > 0 ? uint256(int256(amount0)) : uint256(int256(-amount0));
            } else if (key.currency1 == config.projectToken) {
                int128 amount1 = BalanceDeltaLibrary.amount1(delta);
                projectTokenAmount = amount1 > 0 ? uint256(int256(amount1)) : uint256(int256(-amount1));
            }

            require(
                projectTokenAmount <= config.maxSwapAmount,
                "Hatch: swap amount exceeds anti-whale limit"
            );
        }

        return (this.afterSwap.selector, 0);
    }

    /**
     * @notice Claim accrued swap fees, sending 50% to the creator and using 50% to buyback & burn the project token.
     * @param key The Uniswap V4 PoolKey
     */
    function claimFees(PoolKey calldata key) external {
        bytes32 poolId = key.toId();
        LaunchConfig memory config = poolConfigs[poolId];
        require(config.creator != address(0), "Pool not configured");

        // 1. Harvest accrued fees from the PoolManager
        (uint256 fee0, uint256 fee1) = manager.claimHookFees(key, address(this));

        address baseToken = (key.currency0 == config.projectToken) ? key.currency1 : key.currency0;
        uint256 baseFeeAmount = (key.currency0 == config.projectToken) ? fee1 : fee0;
        uint256 projectFeeAmount = (key.currency0 == config.projectToken) ? fee0 : fee1;

        // Handle any project tokens directly collected as fees by burning them
        if (projectFeeAmount > 0) {
            IERC20(config.projectToken).transfer(address(0x000000000000000000000000000000000000dEaD), projectFeeAmount);
            totalTokensBurned[poolId] += projectFeeAmount;
        }

        if (baseFeeAmount > 0) {
            uint256 creatorShare = baseFeeAmount / 2;
            uint256 buybackShare = baseFeeAmount - creatorShare;

            // 2. Transfer 50% base fee to creator
            IERC20(baseToken).transfer(config.creator, creatorShare);
            totalCreatorFeesClaimed[poolId] += creatorShare;

            // 3. Swap 50% base fee to buyback project token
            IERC20(baseToken).approve(address(manager), buybackShare);
            
            // Execute swap on PoolManager: baseToken -> projectToken
            bool zeroForOne = (baseToken == key.currency0);
            
            // We call manager swap which sends the output projectToken to the Hook
            BalanceDelta swapDelta = manager.swap(
                key,
                IPoolManager.SwapParams({
                    zeroForOne: zeroForOne,
                    amountSpecified: int256(buybackShare),
                    sqrtPriceLimitX96: zeroForOne ? 4295128739 + 1 : 1461446703485210103287273052203988822378723970342 - 1
                }),
                new bytes(0)
            );

            // Get amount of projectToken bought (which is the output)
            uint256 boughtAmount;
            if (zeroForOne) {
                int128 amount1 = BalanceDeltaLibrary.amount1(swapDelta);
                boughtAmount = amount1 < 0 ? uint256(int256(-amount1)) : 0;
            } else {
                int128 amount0 = BalanceDeltaLibrary.amount0(swapDelta);
                boughtAmount = amount0 < 0 ? uint256(int256(-amount0)) : 0;
            }

            // 4. Burn the bought project tokens
            if (boughtAmount > 0) {
                IERC20(config.projectToken).transfer(address(0x000000000000000000000000000000000000dEaD), boughtAmount);
                totalTokensBurned[poolId] += boughtAmount;
            }

            emit FeesDistributed(poolId, creatorShare, buybackShare, boughtAmount);
        }
    }
}
