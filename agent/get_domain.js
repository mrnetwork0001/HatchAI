const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('https://rpc.xlayer.tech');
    const usdtAddress = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
    
    // We will try several common EIP-712 view functions
    const abi = [
        "function name() view returns (string)",
        "function version() view returns (string)",
        "function eip712Domain() view returns (bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
        "function DOMAIN_SEPARATOR() view returns (bytes32)"
    ];
    
    const usdt = new ethers.Contract(usdtAddress, abi, provider);
    
    try {
        console.log("Name:", await usdt.name());
    } catch (e) { console.log("name() failed"); }

    try {
        console.log("Version:", await usdt.version());
    } catch (e) { console.log("version() failed"); }

    try {
        console.log("eip712Domain:", await usdt.eip712Domain());
    } catch (e) { console.log("eip712Domain() failed"); }

    try {
        console.log("DOMAIN_SEPARATOR:", await usdt.DOMAIN_SEPARATOR());
    } catch (e) { console.log("DOMAIN_SEPARATOR() failed"); }
}

main();
