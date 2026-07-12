const run = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/v1/launch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ok-web3-openapi-pay': 'paid'
            },
            body: JSON.stringify({
                tokenName: "ProductionToken",
                tokenSymbol: "PTKN",
                totalSupply: "500000"
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
};
run();
