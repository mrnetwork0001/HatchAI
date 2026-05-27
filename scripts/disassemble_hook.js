import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const hookAddress = "0x29b7f2A8a328066D070a9fC08A013e49F04a90c0";

  console.log("Fetching HatchHook bytecode...");
  const code = await provider.getCode(hookAddress);
  const bytes = ethers.getBytes(code);
  console.log(`Bytecode length: ${bytes.length} bytes`);

  console.log("Analyzing Hook dispatcher...");
  const selectors = [];
  
  let i = 0;
  while (i < Math.min(bytes.length, 5000)) {
    const op = bytes[i];
    if (op === 0x63) {
      const selectorBytes = bytes.slice(i + 1, i + 5);
      const selector = ethers.hexlify(selectorBytes);
      
      let isSelector = false;
      for (let j = i + 5; j < Math.min(i + 15, bytes.length); j++) {
        if (bytes[j] === 0x14 || bytes[j] === 0x11 || bytes[j] === 0x10 || bytes[j] === 0x56) {
          isSelector = true;
          break;
        }
      }
      
      if (isSelector && !selectors.includes(selector)) {
        selectors.push(selector);
      }
      i += 5;
    } else if (op >= 0x60 && op <= 0x7f) {
      i += (op - 0x60 + 2);
    } else {
      i += 1;
    }
  }

  console.log("Found selectors in Hook dispatcher:");
  console.log(selectors);
}

main().catch(console.error);
