const Web3 = require('web3');

async function testConnection() {
    try {
        const web3 = new Web3('http://127.0.0.1:7545');
        
        console.log('Testing connection to Ganache...');
        
        const accounts = await web3.eth.getAccounts();
        console.log('Connected successfully!');
        console.log('Available accounts:', accounts);
        
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        const balance = await web3.eth.getBalance(accounts[0]);
        console.log('First account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
    } catch (error) {
        console.error('Connection failed:', error.message);
    }
}

testConnection();