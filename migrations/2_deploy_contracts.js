const SmartPiggies = artifacts.require("SmartPiggies");
const StableToken = artifacts.require("StableToken");
const RopstenLINK = artifacts.require("RopstenLINK");

//StableToken: "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
//SmartPiggies: "0x39C8D13072B3D5e54D3425257157eF8C0213A825"
//RopstenLINK: "0x01BE23585060835E02B77ef475b0Cc51aA1e0709"
//Chainlink IEX SPY NOW: "0x749b61357Cf4BbeC0fc876cD87eF52e80D29E7D8"
//Chainlink CoinCap ETHUSD: 0x02a77167324c0ab1cc3b29646a965027f63a449f

module.exports = function(deployer) {
  deployer.deploy(SmartPiggies, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(StableToken, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(RopstenLINK, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
};
