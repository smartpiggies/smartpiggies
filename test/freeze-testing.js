Promise = require("bluebird");
const StableToken = artifacts.require("./StableToken.sol");
const TestnetLINK = artifacts.require("./TestnetLINK.sol");
const PiggyHelper = artifacts.require("./PiggyHelper.sol");
const SmartPiggies = artifacts.require("./SmartPiggies.sol");
const Resolver = artifacts.require("./ResolverSelfReturn.sol");

const expectedExceptionPromise = require("../utils/expectedException.js");
const sequentialPromise = require("../utils/sequentialPromise.js");
web3.eth.makeSureHasAtLeast = require("../utils/makeSureHasAtLeast.js");
web3.eth.makeSureAreUnlocked = require("../utils/makeSureAreUnlocked.js");
web3.eth.getTransactionReceiptMined = require("../utils/getTransactionReceiptMined.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract ('SmartPiggies', function(accounts) {

  let tokenInstance;
  let linkInstance;
  let piggyInstance;
  let resolverInstance;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let addr00 = "0x0000000000000000000000000000000000000000";
  let decimal = 18;
  let decimals = web3.utils.toBN(Math.pow(10,decimal));
  let supply = web3.utils.toWei("1000", "ether");
  let approveAmount = web3.utils.toWei("100", "ether");
  let exchangeRate = 1;
  let dataSource = 'NASDAQ';
  let underlying = 'SPY';
  let oracleService = 'Self';
  let endpoint = 'https://www.nasdaq.com/symbol/spy';
  let path = '';
  let oracleTokenAddress;
  let oraclePrice = web3.utils.toBN(27000); //including hundreth of a cent

  beforeEach(function() {
    //console.log(JSON.stringify("symbol: " + result, null, 4));
    return StableToken.new({from: owner})
    .then(instance => {
      tokenInstance = instance;
      return TestnetLINK.new({from: owner});
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
      return PiggyHelper.new({from: owner});
    })
    .then(instance => {
      helperInstance = instance;
      return SmartPiggies.new(helperInstance.address, {from: owner, gas: 8000000, gasPrice: 1100000000});
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

  describe("Testing Freezeable functionality", function() {

    it("Should start not frozen", function() {
      return piggyInstance.notFrozen.call({from: owner})
      .then(result => {
        assert.isTrue(result, "contract did not start not frozen");
      });
    }); //end test block

    it("Should to able to freeze the notFrozen param", function() {
      return piggyInstance.freeze({from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "function did not return successfully");
        assert.strictEqual(result.logs[0].event, "Frozen", "event did not return correct name");
        assert.strictEqual(result.logs[0].args.from, owner,  "event did not return correct sender");

        return piggyInstance.notFrozen.call({from: user01}); // should be publicly visible
      })
      .then(result => {
        assert.isNotTrue(result, "contract did not start not frozen");
      });
    }); //end test block

    it("Should to able to freeze if an admin", function() {
      return sequentialPromise([
        () => Promise.resolve(piggyInstance.addAdministrator(user01, {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.isAdministrator(user01, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.freeze({from: user01})), // [2]
        () => Promise.resolve(piggyInstance.notFrozen.call({from: user01})), // [3]
      ])
      .then(result => {
        assert.isTrue(result[1], "isAdmin did not return true");
        assert.isNotTrue(result[3], "notFrozen did not return false");
      });
    }); //end test block

    it("Should be able to unfreeze the notFrozen param", function() {
      return piggyInstance.freeze({from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "function did not return successfully");
        return piggyInstance.notFrozen.call({from: user02}); // should be publicly visible
      })
      .then(result => {
        assert.isNotTrue(result, "notFrozen did not return false");
        /* unfreeze it */
        return piggyInstance.unfreeze({from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "function did not return successfully");
        assert.strictEqual(result.logs[0].event, "Unfrozen", "event did not return correct name");
        assert.strictEqual(result.logs[0].args.from, owner,  "event did not return correct sender");
        return piggyInstance.notFrozen.call({from: owner});
      })
      .then(result => {
        assert.isTrue(result, "notFrozen did not return true");
      });
    }); //end test block

    it("Should fail to change freeze if sender is not an admin", function() {
      /* transaction should revert if sender is an admin */
      return expectedExceptionPromise(
        () => piggyInstance.freeze(
          {from: user01, gas: 8000000 }),
          3000000);
    }); //end test block

    it("Should fail to change unfreeze if sender is not an admin", function() {
      /* transaction should revert if sender is an admin */
      return piggyInstance.freeze({from: owner})
      .then(() => {
      return expectedExceptionPromise(
        () => piggyInstance.unfreeze(
          {from: user01, gas: 8000000 }),
          3000000);
      });
    }); //end test block

    it("Should freeze create piggy functionality", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
      currentBlock = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.addAdministrator(user01, {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.isAdministrator(user01, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.freeze({from: user01})), // [2]
        () => Promise.resolve(piggyInstance.notFrozen.call({from: user01})), // [3]
      ])
      .then(result => {
        assert.isNotTrue(result[3], "notFrozen did not return false");

        /* this should revert */
        return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            params[0],params[1],params[2],params[3],
            params[4],params[5],params[6],params[7],
            params[8],params[9],
            {from: owner, gas: 8000000 }),
            3000000);
      });
    }); //end test block

    it("Should freeze split piggy functionality", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(10 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
      currentBlock = web3.utils.toBN(0)
      let splitAmount = collateral.sub(web3.utils.toBN(1 * decimals))

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.addAdministrator(user01, {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.isAdministrator(user01, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [3]
      ])
      .then(result => {
        assert.isTrue(result[2].receipt.status, "create status did not return true");
        assert.isTrue(result[3].receipt.status, "create status did not return true");

        tokenId01 = result[2].logs[0].args.ints[0];
        tokenId02 = result[3].logs[0].args.ints[0];

        return piggyInstance.splitPiggy(tokenId01, splitAmount, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "split status did not return true");
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.freeze({from: user01})), // [0]
          () => Promise.resolve(piggyInstance.notFrozen.call({from: user01})), // [1]
        ])
      })
      .then(result => {
        assert.isNotTrue(result[1], "notFrozen did not return false");

        // this should revert on frozen contract
        return expectedExceptionPromise(
          () => piggyInstance.splitPiggy(
            tokenId02,
            splitAmount,
            {from: owner, gas: 8000000 }),
            3000000);
      })
    }); //end test block

  }); //end describe block


}); // end test suite
