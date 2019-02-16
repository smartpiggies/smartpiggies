const SmartPiggies = artifacts.require("SmartPiggies");
const StableToken = artifacts.require("StableToken");
const RopstenLINK = artifacts.require("RopstenLINK");

//StableToken: 0x288ee61F0bC2c4AccB18ab385cc20fFCeD5c4D4D
//SmartPiggies: 0x83B5789821e118c49A85Bf5e1bbDE022D356E8Fd
//RopstenLINK: 0x20fE562d797A42Dcb3399062AE9546cd06f63280
//Chainlink IEX SPY NOW: 0x3efa1b0060b7dda3fc91f7267653204181050f2e
//Chainlink CoinCap ETHUSD: 

module.exports = function(deployer) {
  deployer.deploy(SmartPiggies, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(StableToken, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(RopstenLINK, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
};
