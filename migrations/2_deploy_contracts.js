const PiggyHelper = artifacts.require("./PiggyHelper.sol");
const SmartPiggies = artifacts.require('SmartPiggies');
const StableToken = artifacts.require('StableToken');
const TestnetLINK = artifacts.require('TestnetLINK');
const StableTokenFaucet = artifacts.require('StableTokenFaucet');
const ResolverSelfReturn = artifacts.require('ResolverSelfReturn');


var dataSource = 'NASDAQ'
var underlying = 'SPY'
var oracleService = 'Self'
var endpoint = 'https://www.nasdaq.com/symbol/spy'
var path = ''
var oracleTokenAddress
var oraclePrice = 27000

module.exports = function(deployer) {
  deployer.deploy(StableToken, {gas: 3000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(StableTokenFaucet, {gas: 3000000, gasPrice: 1100000000, overwrite: false});

  deployer.deploy(PiggyHelper, {gas: 8000000, gasPrice: 1100000000, overwrite: false})
  .then(() => {
    return deployer.deploy(SmartPiggies, PiggyHelper.address, {gas: 8000000, gasPrice: 1100000000, overwrite: false});
  });
  
  deployer.deploy(TestnetLINK, {gas: 3000000, gasPrice: 1100000000, overwrite: false})
  .then(() => {
    return deployer.deploy(ResolverSelfReturn,
        dataSource,
        underlying,
        oracleService,
        endpoint,
        path,
        TestnetLINK.address,
        oraclePrice,
        {gas: 3000000, gasPrice: 1100000000, overwrite: false}
      );
  });
};
