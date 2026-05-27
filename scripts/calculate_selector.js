import { ethers } from "ethers";

const sig5 = "afterInitialize(address,(address,address,uint24,int24,address),uint160,int24,bytes)";
const sig4 = "afterInitialize(address,(address,address,uint24,int24,address),uint160,int24)";

const h5 = ethers.keccak256(ethers.toUtf8Bytes(sig5)).slice(0, 10);
const h4 = ethers.keccak256(ethers.toUtf8Bytes(sig4)).slice(0, 10);

console.log("5-param selector:", h5);
console.log("4-param selector:", h4);
