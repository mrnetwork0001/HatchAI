import { ethers } from "ethers";

const weth = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
const hook = "0xb2DaAC3Fc51E958f89A6346f92eF7542805150c0";
const fee = 8388608;
const tickSpacing = 60;

function computePoolId(projectToken) {
    const currency0 = projectToken.toLowerCase() < weth.toLowerCase() ? projectToken : weth;
    const currency1 = projectToken.toLowerCase() < weth.toLowerCase() ? weth : projectToken;
    
    const abiCoder = new ethers.AbiCoder();
    const encoded = abiCoder.encode(
        ["address", "address", "uint24", "int24", "address"],
        [currency0, currency1, fee, tickSpacing, hook]
    );
    return ethers.keccak256(encoded);
}

const hai = "0xef3a51df4761feab2ed21424f5123a793aea46dc";
const ntu = "0x27f2373d532b94cd060da9303e8aeb1794a58d61";

console.log("HAI Pool ID:", computePoolId(hai));
console.log("NTU Pool ID:", computePoolId(ntu));
