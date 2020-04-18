const path = require("path");

module.exports = {
  contracts_build_directory: path.join(__dirname, "app/src/contracts"),
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 8000000,
      gasPrice: 1100000000,
      network_id: "*" // Match any network id
    },
    ropsten: {
      network_id: 3,
      host: "localhost",
      port: 8545,
      gas: 8000000,
      gasPrice: 1100000000,
    },
    rinkeby: {
      network_id: 4,
      host: "localhost",
      port: 8545,
      gas: 8000000,
      gasPrice: 1100000000,
    }
  },
  compilers: {
    solc: {
      version: "0.5.17",
      parser: "solcjs",
      settings: {
        optimizer: {
          enabled: true,
          runs: 5 //500
        },
        evmVersion: "istanbul"
      }
    }
  }
};
