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
  let helperInstance
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

  describe("Testing ownership functionality", function() {

    it("Should have correct owner", function() {
      return piggyInstance.owner.call({from: owner})
      .then(result => {
        assert.strictEqual(result, owner, "owner did not return correctly");
      });
    }); //end test block

    it("Should change owner", function() {
      return piggyInstance.changeOwner(user01, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "changeOwner function did not return successfully");
        assert.strictEqual(result.logs[0].event, "ChangedOwner", "Event logs did not return correct event name");
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from changeOwner didn't return correct sender");
        assert.strictEqual(result.logs[0].args.newOwner, user01, "Event log from changeOwner didn't return correct sender");
        return piggyInstance.owner.call({from: owner});
      })
      .then(result => {
        assert.strictEqual(result, user01, "new owner did not return correctly");
      });
    }); // end test block

    it("Should fail to change owner if sender is not owner", function() {

      /* transaction should revert if sender is not owner */
      return expectedExceptionPromise(
        () => piggyInstance.changeOwner(
          user01,
          {from: user01, gas: 8000000 }),
          3000000);

    }); //end test block

  }); //end describe block

  describe("Testing admin controls", function() {

    it("Should save owner as an admin", function() {
      return piggyInstance.isAdministrator(owner, {from: owner})
      .then(result => {
        assert.isTrue(result, "owner did not get set as admin");
      });
    }); //end test block

    if("Should be possible to add an admin", function() {
      /* owner or adming should be able to add administrators */
      return piggyInstance.addAdministrator(user01, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "add did not return successfully");
        assert.strictEqual(result.logs[0].event, "AddedAdmin", "Event logs did not return correct event name");
        assert.strictEqual(result.logs[0].args.from, owner, "Event did not return correct sender");
        assert.strictEqual(result.logs[0].args.newAdmin, user01, "Event did not return correct newAdmin param");

        return piggyInstance.isAdministrator(user01, {from: user01});
      })
      .then(result => {
        assert.isTrue(result, "Admin did not return true");

        /* add a new admin from newly added admin*/
        return piggyInstance.addAdministrator(user02, {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "add did not return successfully");
        assert.strictEqual(result.logs[0].event, "AddedAdmin", "Event logs did not return correct event name");
        assert.strictEqual(result.logs[0].args.from, user01, "Event did not return correct sender");
        assert.strictEqual(result.logs[0].args.newAdmin, user02, "Event did not return correct newAdmin param");

        return piggyInstance.isAdministrator(user02, {from: user02});
      })
      .then(result => {
        assert.isTrue(result, "Admin did not return true");
      });
    }); //end test block

    it("Should be possible to delete admins", function() {
      return sequentialPromise([
        () => Promise.resolve(piggyInstance.addAdministrator(user01, {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.addAdministrator(user02, {from: user01})), // [1]
        () => Promise.resolve(piggyInstance.deleteAdministrator(user02, {from: user01})), // [2]
        () => Promise.resolve(piggyInstance.deleteAdministrator(user01, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.deleteAdministrator(owner, {from: owner})), // [4]
        () => Promise.resolve(piggyInstance.isAdministrator(owner, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.isAdministrator(user01, {from: owner})), // [6]
        () => Promise.resolve(piggyInstance.isAdministrator(user02, {from: owner})), // [7]
        () => Promise.resolve(piggyInstance.addAdministrator(owner, {from: owner})), // [8]
        () => Promise.resolve(piggyInstance.isAdministrator(owner, {from: owner})) // 9
      ])
      .then(result => {

        /* check delete of user02 by user01 */
        assert.strictEqual(result[2].logs[0].event, "DeletedAdmin", "delete event did not return correct name");
        assert.strictEqual(result[2].logs[0].args.from, user01, "delete event did not return correct sender");
        assert.strictEqual(result[2].logs[0].args.oldAdmin, user02, "delete event did not return correct oldAdmin param");

        /* check delete of user01 by owner */
        assert.strictEqual(result[3].logs[0].event, "DeletedAdmin", "delete event did not return correct name");
        assert.strictEqual(result[3].logs[0].args.from, owner, "delete event did not return correct sender");
        assert.strictEqual(result[3].logs[0].args.oldAdmin, user01, "delete event did not return correct oldAdmin param");

        /* check delete of owner by owner */
        assert.strictEqual(result[4].logs[0].event, "DeletedAdmin", "delete event did not return correct name");
        assert.strictEqual(result[4].logs[0].args.from, owner, "delete event did not return correct sender");
        assert.strictEqual(result[4].logs[0].args.oldAdmin, owner, "delete event did not return correct oldAdmin param");

        /* check users are not admin */
        assert.isNotTrue(result[5], "isAdmin did not return correctly");
        assert.isNotTrue(result[6], "isAdmin did not return correctly");
        assert.isNotTrue(result[7], "isAdmin did not return correctly");

        /* check owner is restored as admin */
        assert.isTrue(result[9], "isAdmin did not return correctly");
      });
    }); //end test block

    it("Should fail to add admin if sender is not the owner", function() {
      /* transaction should revert if sender is not an admin */

      return piggyInstance.isAdministrator(user01, {from: owner})
      .then(result => {
        assert.isNotTrue(result, "isAdmin did not return false");
        return expectedExceptionPromise(
          () => piggyInstance.addAdministrator(
            user01,
            {from: user01, gas: 8000000 }),
            3000000);
      });
    }); //end test block

    it("Should fail to delete admin if sender is not an admin", function() {
      /* transaction should revert if sender is and admin */
      return piggyInstance.isAdministrator(user01, {from: owner})
      .then(result => {
        assert.isNotTrue(result, "isAdmin did not return false");
        return expectedExceptionPromise(
          () => piggyInstance.deleteAdministrator(
            owner,
            {from: user01, gas: 8000000 }),
            3000000);
        })
    }); //end test block

  }); //end describe block

}); // end test suite
