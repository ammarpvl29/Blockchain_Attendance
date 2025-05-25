require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      gas: 6721975,
      gasPrice: 20000000000,
      timeoutBlocks: 50,
      networkCheckTimeout: 10000,
      deploymentPollingInterval: 1000
    }
  },
  compilers: {
    solc: {
      version: "0.8.30",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "london"
      }
    }
  }
};