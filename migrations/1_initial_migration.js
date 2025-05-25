const Migrations = artifacts.require("Migrations");

module.exports = async function(deployer) {
    try {
        console.log('Deploying Migrations contract...');
        await deployer.deploy(Migrations);
        const instance = await Migrations.deployed();
        console.log('Migrations deployed at:', instance.address);
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
};