import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const pmAddress = "0x360e68faccca8ca495c1b759fd9eee466db9fb32";

  console.log("Fetching PoolManager bytecode...");
  const code = await provider.getCode(pmAddress);
  const bytes = ethers.getBytes(code);
  console.log(`Bytecode length: ${bytes.length} bytes`);

  // Let's disassemble the first 1000 bytes or up to the revert
  console.log("Analyzing dispatcher in bytecode...");
  const selectors = [];
  
  let i = 0;
  while (i < Math.min(bytes.length, 2000)) {
    const op = bytes[i];
    
    // Check for PUSH4 (0x63)
    if (op === 0x63) {
      const selectorBytes = bytes.slice(i + 1, i + 5);
      const selector = ethers.hexlify(selectorBytes);
      
      // Look ahead for EQ (0x14), GT (0x11), or LT (0x10) within next 10 bytes
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
      // PUSH1 to PUSH32
      i += (op - 0x60 + 2);
    } else {
      i += 1;
    }
  }

  console.log("Found selectors in dispatcher (first 2000 bytes):");
  console.log(selectors);
}

main().catch(console.error);
