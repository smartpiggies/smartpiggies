//Promise = require("bluebird");
//Promise.promisifyAll(web3.eth, { suffix: "Promise"});
//var expectedExceptionPromise = require("./utils/expectedException.js");

Promise = require("bluebird");
var StableToken = artifacts.require("./StableToken.sol");
var RopstenLINK = artifacts.require("./RopstenLINK.sol");
var SmartPiggies = artifacts.require("./SmartPiggies.sol");
var Resolver = artifacts.require("./ResolverSelfReturn.sol");

const expectedExceptionPromise = require("../utils/expectedException.js");
const sequentialPromise = require("../utils/sequentialPromise.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract ('SmartPiggies', function(accounts) {

  var tokenInstance;
  var linkInstance;
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var addr00 = "0x0000000000000000000000000000000000000000";
  var decimal = 18;
  var decimals = web3.utils.toBN(Math.pow(10,decimal));
  var supply = web3.utils.toWei("1000", "ether");
  var approveAmount = web3.utils.toWei("100", "ether");
  var exchangeRate = 1;
  var dataSource = 'NASDAQ';
  var underlying = 'SPY';
  var oracleService = 'Self';
  var endpoint = 'https://www.nasdaq.com/symbol/spy';
  var path = '';
  var oracleTokenAddress;
  var oraclePrice = 27000; //including hundreth of a cent

  beforeEach(function() {
    //console.log(JSON.stringify("symbol: " + result, null, 4));
    return StableToken.new({from: owner})
    .then(instance => {
      tokenInstance = instance;
      return RopstenLINK.new({from: owner});
    })
    .then(instance => {
      linkInstance = instance;
      oracleTokenAddress = linkInstance.address;
      return Resolver.new(
        dataSource,
        underlying,
        oracleService,
        endpoint,
        path,
        oracleTokenAddress,
        oraclePrice,
        {from: owner});
    })
    .then(instance => {
      resolverInstance = instance;
      return SmartPiggies.new({from: owner, gas: 8000000, gasPrice: 1100000000});
    })
    .then(instance => {
      piggyInstance = instance;
      return tokenInstance.mint(owner, supply, {from: owner});
    })
    .then(() => {
      return linkInstance.mint(owner, supply, {from: owner});
    })
    .then(() => {
      return tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner});
    })
    .then(() => {
      return linkInstance.approve(resolverInstance.address, approveAmount, {from: owner});
    });
  });

  //test default values
  it("Should have correct default values", function() {
    return resolverInstance.getOwner({from: owner})
    .then(result => {
      assert.strictEqual(result.toString(), owner, "Contract did not return correct owner.");
      return resolverInstance.dataSource({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), dataSource, "Contract did not return correct datasource.");
      return resolverInstance.underlying({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), underlying, "Contract should have correct underlying.");
      return resolverInstance.oracleService({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), oracleService, "Contract should have correct oracle service.");
      return resolverInstance.endpoint({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), endpoint, "Contract should have correct endpoint.");
      return resolverInstance.path({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), path, "Contract should have correct path.");
      return resolverInstance.oracleTokenAddress({from: owner});
    })
    .then(result => {
      assert.strictEqual(result.toString(), oracleTokenAddress, "Contract should have correct oracle token address.");
      return resolverInstance.price({from: owner});
    })
    .then(result => {
      //oracle returns a default static price for testing locally
      assert.strictEqual(result.toNumber(), oraclePrice, "Contract should have correct oracle price.");
      return tokenInstance.balanceOf(owner, {from: owner});
    })
    .then(balance => {
      assert.strictEqual(balance.toString(), supply.toString(), "Contract should have correct balance for owner.");
      return tokenInstance.allowance(owner, piggyInstance.address, {from: owner});
    })
    .then(allowance => {
      assert.strictEqual(allowance.toString(), approveAmount.toString(), "Contract should have correct allowance for owner.");
      return linkInstance.balanceOf(owner, {from: owner});
    })
    .then(balance => {
      assert.strictEqual(balance.toString(), supply.toString(), "Contract should have correct balance for owner.");
      return linkInstance.allowance(owner, resolverInstance.address, {from: owner});
    })
    .then(allowance => {
      assert.strictEqual(allowance.toString(), approveAmount.toString(), "Contract should have correct allowance for owner.");
    });
    //end test
  });

  //Test Create SmartPiggies
  describe("Create a SmartPiggies token", function() {

    it("Should create a token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false

      return piggyInstance.createPiggy(
        collateralERC,
        premiumERC,
        dataResolverNow,
        dataResolverAtExpiry,
        collateral,
        lotSize,
        strikePrice,
        expiry,
        isEuro,
        isPut,
        isRequest,
        {from: owner}
      )
      .then(result => {
        //console.log(JSON.stringify(result, null, 4));
        return piggyInstance.getDetails(1, {from: owner});
      })
      .then(result => {
        //console.log(JSON.stringify(result, null, 4));

        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].premiumERC, premiumERC, "Details should have correct premiumERC address.");
        assert.strictEqual(result[0].dataResolverNow, dataResolverNow, "Details should have correct dataResolverNow address.");
        assert.strictEqual(result[0].dataResolverAtExpiry, dataResolverAtExpiry, "Details should have correct dataResolverAtExpiry address.");
        //check DetailUints
        assert.strictEqual(result[1].collateral, collateral.toString(), "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
      });
      //end test block
    });
    //end describe block
  });
/*
  //Test Ownable
  describe("Ownable Contract functionality", function() {
    it("Should have correct Owner", function() {
      return shopInstance.owner({from: owner})
      .then(result => {
        assert.strictEqual(result, owner, "Owner param did not return correctly");
      });
      //end test
    });

    it("Should return true for isOwner", function() {
      return shopInstance.isOwner({from: owner})
      .then(result => {
        assert.isTrue(result, "isOwner param did not return correctly");
      });
      //end test
    });

    it("Should return renounce ownership", function() {
      return shopInstance.renounceOwnership({from: owner})
      .then(txObj => {
        assert.strictEqual(txObj.logs[0].event, "OwnershipRenounced", "Logs did not return correctly");
        assert.strictEqual(txObj.logs[0].args.previousOwner, owner, "Logs did not return correctly");
        return shopInstance.owner({from: owner});
      })
      .then(result => {
        assert.strictEqual(result, "0x0000000000000000000000000000000000000000", "Owner did not return correctly");
      });
      //end test
    });

    it("Should return transfer ownership", function() {
      return shopInstance.transferOwnership(user01, {from: owner})
      .then(txObj => {
        assert.strictEqual(txObj.logs[0].event, "OwnershipTransferred", "Logs did not return correctly");
        assert.strictEqual(txObj.logs[0].args.previousOwner, owner, "Logs did not return correctly");
        assert.strictEqual(txObj.logs[0].args.newOwner, user01, "Logs did not return correctly");
        return shopInstance.owner({from: owner});
      })
      .then(result => {
        assert.strictEqual(result, user01, "Owner did not return correctly");
      });
      //end test
    });

    //end describe
  });
*/

});
