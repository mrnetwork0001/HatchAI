const http = require('http');

async function runTests() {
    console.log("🏃 Starting ASP Server Integration Tests...");

    // Test 1: Health Check
    try {
        const res = await fetch("http://127.0.0.1:3000/health");
        const data = await res.json();
        if (data.status === 'ok') {
            console.log("✅ Test 1 Passed: /health endpoint is responsive.");
        } else {
            console.log("❌ Test 1 Failed: /health returned unexpected data.", data);
        }
    } catch (e) {
        console.log("❌ Test 1 Failed: Server unreachable.", e.message);
        return;
    }

    // Test 2: Missing Payment Header -> 402
    try {
        const res = await fetch("http://127.0.0.1:3000/api/v1/launch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                tokenName: "Test Coin",
                tokenSymbol: "TEST",
                totalSupply: "1000000"
            })
        });
        
        if (res.status === 402) {
            const data = await res.json();
            if (data.error === "Payment Required" && data.x402Version) {
                console.log("✅ Test 2 Passed: Missing payment header correctly rejected with HTTP 402.");
            } else {
                console.log("❌ Test 2 Failed: 402 payload malformed.", data);
            }
        } else {
            console.log(`❌ Test 2 Failed: Expected 402, got ${res.status}`);
        }
    } catch (e) {
        console.log("❌ Test 2 Failed:", e.message);
    }

    // Test 3: Invalid Cryptographic Signature -> 403
    try {
        const fakePayload = Buffer.from(JSON.stringify({ voucher: "fake", signature: "0x1234" })).toString('base64');
        const res = await fetch("http://localhost:3000/api/v1/launch", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "ok-web3-openapi-pay": fakePayload
            },
            body: JSON.stringify({
                tokenName: "Test Coin",
                tokenSymbol: "TEST",
                totalSupply: "1000000"
            })
        });
        
        if (res.status === 403) {
            console.log("✅ Test 3 Passed: Invalid payment signature correctly rejected with HTTP 403.");
        } else {
            console.log(`❌ Test 3 Failed: Expected 403, got ${res.status}`);
        }
    } catch (e) {
        console.log("❌ Test 3 Failed:", e.message);
    }

    console.log("🏁 Tests Completed.");
}

runTests();
