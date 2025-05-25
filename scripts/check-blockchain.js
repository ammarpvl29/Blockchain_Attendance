const Web3 = require('web3');
const AttendanceSystemArtifact = require('../build/contracts/AttendanceSystem.json');

async function checkBlockchain() {
    try {
        console.log('Checking blockchain connection...');
        
        const web3 = new Web3('http://127.0.0.1:7545');
        await web3.eth.net.isListening();
        
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        const accounts = await web3.eth.getAccounts();
        console.log('Available accounts:', accounts);
        
        if (AttendanceSystemArtifact.networks[networkId]) {
            const address = AttendanceSystemArtifact.networks[networkId].address;
            console.log('Contract found at:', address);
            
            const code = await web3.eth.getCode(address);
            if (code.length > 2) {
                console.log('✅ Contract verified');
            } else {
                console.log('❌ No contract code found');
            }
        } else {
            console.log('❌ Contract not deployed to this network');
        }
        
    } catch (error) {
        console.error('Check failed:', error);
    }
}

checkBlockchain();