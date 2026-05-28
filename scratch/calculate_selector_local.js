import { ethers } from "ethers";

function check(sig) {
  const selector = ethers.dataSlice(ethers.id(sig), 0, 4);
  console.log(`Signature: ${sig}`);
  console.log(`  Selector: ${selector}`);
}

// 1. IPoolManager swap with struct SwapParams
check("swap((address,address,uint24,int24,address),(bool,int256,uint160),bytes)");

// 2. swap with individual params instead of struct
check("swap((address,address,uint24,int24,address),bool,int256,uint160,bytes)");

// 3. swap with alternative SwapParams layout (amountSpecified first)
check("swap((address,address,uint24,int24,address),(int256,bool,uint160),bytes)");

// 4. swap with different parameter names or types? The type signature only cares about types.

