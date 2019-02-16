const SmartPiggies = artifacts.require("SmartPiggies");
const TableToken = artifacts.require("TableToken");
const StableLink = artifacts.require("StableLink");

module.exports = function(deployer) {
  deployer.deploy(SmartPiggies, {gas: 6000000, gasPrice: 1100000000});
  deployer.deploy(TableToken, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
  deployer.deploy(StableLink, {gas: 6000000, gasPrice: 1100000000, overwrite: false});
};
