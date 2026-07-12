const { ethers } = require('ethers');

const targetHash = "0xd591d9baf744328d9400b923cb02c9474d367d591ca1ab24d8c4068be527599d";
const verifyingContract = "0x779ded0c9e1022225f8e0630b35a9b54be713736";

const names = ["Tether USD", "TetherToken", "USD₮0", "USDT"];
const versions = ["1", "2", "0", undefined];
const chainIds = [196, 1, 0, undefined];

for (const name of names) {
    for (const version of versions) {
        for (const cid of chainIds) {
            const domain = {
                name: name,
                verifyingContract: verifyingContract
            };
            if (version !== undefined) domain.version = version;
            if (cid !== undefined) domain.chainId = cid;

            try {
                const types = {
                    EIP712Domain: [
                        { name: "name", type: "string" },
                        { name: "version", type: "string" },
                        { name: "chainId", type: "uint256" },
                        { name: "verifyingContract", type: "address" }
                    ]
                };
                
                if (version === undefined) {
                    types.EIP712Domain = types.EIP712Domain.filter(t => t.name !== "version");
                }
                if (cid === undefined) {
                    types.EIP712Domain = types.EIP712Domain.filter(t => t.name !== "chainId");
                }

                const hash = ethers.TypedDataEncoder.hashDomain(domain);
                if (hash === targetHash) {
                    console.log("MATCH FOUND!");
                    console.log(domain);
                    process.exit(0);
                }
            } catch (e) {}
        }
    }
}
console.log("No match found");
