const SmartPiggies = artifacts.require("SmartPiggies");
const StableToken = artifacts.require("StableToken");
const RopstenLINK = artifacts.require("RopstenLINK");
const ResolverSelfReturn = artifacts.require("ResolverSelfReturn");

//StableToken: "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
//SmartPiggies: "0x39C8D13072B3D5e54D3425257157eF8C0213A825"
//RopstenLINK: "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
//Chainlink IEX SPY NOW: "0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8"
//Chainlink CoinCap ETHUSD: 0x02a77167324c0ab1cc3b29646a965027f63a449f

var dataSource = 'NASDAQ'
var underlying = 'SPY'
var oracleService = 'Self'
var endpoint = 'https://www.nasdaq.com/symbol/spy'
var path = ''
var oracleTokenAddress
var oraclePrice = 27000

module.exports = function(deployer) {
  deployer.deploy(SmartPiggies, {gas: 8000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(StableToken, {gas: 3000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(RopstenLINK, {gas: 3000000, gasPrice: 1100000000, overwrite: false})
  .then(() => {
    return deployer.deploy(ResolverSelfReturn,
        dataSource,
        underlying,
        oracleService,
        endpoint,
        path,
        RopstenLINK.address,
        27000,
        {gas: 3000000, gasPrice: 1100000000, overwrite: false}
      );
  });
};
