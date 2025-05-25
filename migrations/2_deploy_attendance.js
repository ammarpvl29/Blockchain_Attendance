const AttendanceSystem = artifacts.require("AttendanceSystem");

module.exports = async function(deployer, network, accounts) {
    try {
        console.log('Starting AttendanceSystem deployment...');
        console.log('Network:', network);
        console.log('Deployer account:', accounts[0]);

        // Deploy AttendanceSystem
        await deployer.deploy(AttendanceSystem);
        const instance = await AttendanceSystem.deployed();
        
        console.log('AttendanceSystem deployed at:', instance.address);
        
        // Add test teachers in development
        if (network === 'development') {
            console.log('Adding test teachers...');
            
            await instance.addTeacher(accounts[1], "John Smith", { from: accounts[0] });
            await instance.addTeacher(accounts[2], "Jane Doe", { from: accounts[0] });
            
            console.log('Test teachers added:');
            console.log('- Teacher 1:', accounts[1], '(John Smith)');
            console.log('- Teacher 2:', accounts[2], '(Jane Doe)');
        }
    } catch (error) {
        console.error('Deployment failed:', error);
        throw error;
    }
};