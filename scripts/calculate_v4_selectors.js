import { ethers } from "ethers";

const signatures = [
  "initialize((address,address,uint24,int24,address),uint160,bytes)",
  "initialize((address,address,uint24,int24,address),uint160)",
  "initialize((address,address,uint24,int24,address),uint160,bytes,bytes)",
  "initialize(address,address,uint24,int24,address,uint160)",
  "initialize((address,address,uint24,int24,address),uint160,int24,bytes)",
];

const deployedSelectors = [
  '0x01ffc9a7', '0x095bcdb6', '0x0b0d9c09',
  '0x11da60b4', '0x156e29f6', '0x1e2eaeaf',
  '0x234266d7', '0x2d771389', '0x35fd631a',
  '0x3dd45adb', '0x426a8493', '0x48c89491',
  '0x52759651', '0x558a7297', '0x598af9e7',
  '0x5a6bcfda', '0x6276cbbe', '0x7e87ce7d',
  '0x80f0b44c', '0x8161b874', '0x8da5cb5b',
  '0x97e8cd4e', '0x9bf6645f', '0xa5841194',
  '0xb6363cf2', '0xdbd035ff', '0xf02de3b2',
  '0xf135baaa', '0xf2fde38b', '0xf3cd914c',
  '0xf5298aca', '0xfe99049a'
];

for (const sig of signatures) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(sig));
  const sel = hash.slice(0, 10);
  console.log(`Signature: ${sig} -> Selector: ${sel} -> Match: ${deployedSelectors.includes(sel)}`);
}
