const path = require("path");

module.exports = {
  contracts_build_directory: path.join(__dirname, "app/src/contracts"),
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas:6000000,
      gasPrice: 1100000000,
      network_id: "*" // Match any network id
    },
    ropsten: {
      network_id: 3,
      host: "localhost",
      port: 8545,
      gas:6000000,
      gasPrice: 1100000000,
    }
  },
  compilers: {
    solc: {
      version: "0.5.2",
      settings: {
        optimizer: {
          enabled: true,
          runs: 500
        }
      }
    }
  }
};
