Promise = require("bluebird");
var StableToken = artifacts.require("./StableToken.sol");
var TestnetLINK = artifacts.require("./TestnetLINK.sol");
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
  //console.log(JSON.stringify(result, null, 4))

  var tokenInstance;
  var linkInstance;
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var addr00 = "0x0000000000000000000000000000000000000000";
  var decimal = 18;
  //multiply a BN
  //var aNum = web3.utils.toBN(decimals).mul(web3.utils.toBN('1000'))
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
  var oraclePrice = web3.utils.toBN(27000); //including hundreth of a cent

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



  //Test emergency functionality
  describe("Testing Emergency functionality, Create a piggy, auction, buy, emergency settle", function() {

      it("Should emergency settle a piggy", function() {
        collateralERC = tokenInstance.address
        dataResolver = resolverInstance.address
        collateral = web3.utils.toBN(100 * decimals)
        lotSize = 10
        strikePrice = 28000
        expiry = 5
        isEuro = false
        isPut = true
        isRequest = false

        startPrice = web3.utils.toBN(10000)
        reservePrice = web3.utils.toBN(100)
        auctionLength = 3
        timeStep = web3.utils.toBN(1)
        priceStep = web3.utils.toBN(100)

        startBlock = web3.utils.toBN(0)
        auctionPrice = web3.utils.toBN(0)

        ownerBalanceBefore = web3.utils.toBN(0)
        userBalanceBefore = web3.utils.toBN(0)

        return piggyInstance.createPiggy(
          collateralERC,
          dataResolver,
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
          assert.isTrue(result.receipt.status, "create did not return true")
          return piggyInstance.tokenId({from: owner});
        })
        .then(result => {
          //use last tokenId created
          tokenId = result
          return piggyInstance.startAuction(
            tokenId,
            startPrice,
            reservePrice,
            auctionLength,
            timeStep,
            priceStep,
            {from: owner}
          )
        })
        .then(() => {
          proposalAmount = web3.utils.toBN(50 * decimals)
          return sequentialPromise([
            () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
            () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
            () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, {from: user01})),
            // advance the block number to expire the token
            () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
            () => Promise.resolve(piggyInstance.proposeHolderShare(tokenId, proposalAmount, {from: owner})),
          ])
        })
        .then(result => {
          assert.isTrue(result[4].receipt.status)
          assert.lengthOf(result[4].logs, 0, "Event logs did not return zero")
          return piggyInstance.proposeHolderShare(tokenId, proposalAmount, {from: user01})
        })
        .then(result => {
          assert.isTrue(result.receipt.status)
          assert.strictEqual(result.logs[0].event, "SettlePiggy", "Event logs did not return correct event name")
          //assert.strictEqual(result[4].logs[0].args.from, owner, "Event log from transfer didn't return correct sender")
          //assert.strictEqual(result[4].logs[0].args.tokenId, tokenId, "Event log from transfer didn't return correct tokenId")
          //assert.strictEqual(result[3].logs[0].args.holderPayout.toString(), collateral.div(2).toString(), "Event log from transfer didn't return correct tokenId")
          //assert.strictEqual(result[3].logs[0].args.writerPayout.toString(), "0", "Event log from transfer didn't return correct tokenId")
        })

      }); //end test block

    }); // end describe



}); // end test suite
