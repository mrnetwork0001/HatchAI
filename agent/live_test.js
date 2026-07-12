require('dotenv').config({ path: '../.env' });
const { ethers } = require('ethers');

const run = async () => {
    try {
        console.log("1. Fetching 402 Challenge from HatchAI ASP...");
        let response = await fetch('http://localhost:3000/api/v1/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenName: "HatchInu",
                tokenSymbol: "HIN",
                totalSupply: "1000000000"
            })
        });

        if (response.status !== 402) {
            console.error("Expected 402, got", response.status);
            console.log(await response.text());
            return;
        }

        const authHeader = response.headers.get('www-authenticate');
        const x402Base64 = authHeader.replace('Payment ', '');
        const challengeJson = Buffer.from(x402Base64, 'base64').toString('utf8');
        console.log("2. Received Challenge:", challengeJson);
        const challengeData = JSON.parse(challengeJson);

        // Simulate OKX MCP Facilitator Payment Signing
        const privateKey = process.env.BUYER_PRIVATE_KEY;
        if (!privateKey) throw new Error("BUYER_PRIVATE_KEY not found in .env");

        const buyerWallet = new ethers.Wallet(privateKey);
        console.log("3. Buyer Wallet Address:", buyerWallet.address);

        // Construct EIP-712 Domain from challenge
        const domain = {
            name: challengeData.accepts[0].extra.name,
            version: challengeData.accepts[0].extra.version,
            chainId: 196, // X Layer Mainnet
            verifyingContract: challengeData.accepts[0].asset
        };

        const types = {
            TransferWithAuthorization: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "validAfter", type: "uint256" },
                { name: "validBefore", type: "uint256" },
                { name: "nonce", type: "bytes32" },
            ],
        };

        const authorization = {
            from: buyerWallet.address,
            to: challengeData.accepts[0].payTo,
            value: challengeData.accepts[0].amount,
            validAfter: 0,
            validBefore: Math.floor(Date.now() / 1000) + 3600,
            nonce: ethers.hexlify(ethers.randomBytes(32))
        };

        const signature = await buyerWallet.signTypedData(domain, types, authorization);

        const paymentPayload = {
            x402Version: challengeData.x402Version,
            resource: challengeData.resource,
            accepted: challengeData.accepts[0],
            payload: {
                signature,
                authorization
            }
        };
        
        const paymentHeaderBase64 = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
        console.log("4. Generated EIP-3009 Payment Signature!");

        console.log("5. Resubmitting Request with Cryptographic Payment Header...");
        response = await fetch('http://localhost:3000/api/v1/launch', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ok-web3-openapi-pay': paymentHeaderBase64
            },
            body: JSON.stringify({
                tokenName: "HatchInu",
                tokenSymbol: "HIN",
                totalSupply: "1000000000"
            })
        });

        const data = await response.json();
        console.log("\n--- 6. Final Result ---");
        console.log(JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
};

run();
