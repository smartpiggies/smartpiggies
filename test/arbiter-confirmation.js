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

  var tokenInstance;
  var linkInstance;
  let helperInstance
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var user03 = accounts[3];
  var user04 = accounts[4];
  var arbiter = accounts[5];
  var feeAddress = accounts[6];
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

  /* default feePercent param = 50 */
  const DEFAULT_FEE_PERCENT = web3.utils.toBN(50);
  /* default feePercent param = 10,000 */
  const DEFAULT_FEE_RESOLUTION = web3.utils.toBN(10000);

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

      /* setup housekeeping */
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(piggyInstance.setCooldown(0, {from: owner})),
      ])
    });
  });

  describe("Test arbiter confirmation functionality", function() {

    it("Should set arbiter confirmation flag", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest]

      tokenId = web3.utils.toBN(0)

      return piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
              params[4],params[5],params[6],params[7],params[8],params[9],{from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create piggy tx did not return true")
        tokenId = result.logs[0].args.ints[0]
        return piggyInstance.updateArbiter(tokenId, arbiter, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "setArbiter did not return true")
        return piggyInstance.confirmArbiter(tokenId, {from: arbiter})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "confirmArbiter did not return true")
        assert.strictEqual(result.logs[0].args.arbiter, arbiter, "arbiter address did not return correctly")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "tokenId did not return correctly")
        return piggyInstance.getDetails(tokenId)
      })
      .then(result => {
        assert.isTrue(result.flags.arbiterHasConfirmed, "arbiterHasConfirmed parameter did not return true")
      })

    }); //end test

    it("Should reset arbiter confirmation flag after settlement", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest]

      tokenId = web3.utils.toBN(1) // first token created will be id: 1

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})), //[0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, arbiter, {from: owner})), //[1]
        () => Promise.resolve(piggyInstance.confirmArbiter(tokenId, {from: arbiter})), //[2]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, "0", {from: user01})), //[5]
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})), //[6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), //[7]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[8]
      ])
      .then(result => {
        assert.isTrue(result[3].flags.arbiterHasConfirmed, "arbiterHasConfirmed did not return true")
        assert.isNotTrue(result[8].flags.arbiterHasConfirmed, "arbiterHasConfirmed did not get reset")
      })

    }); //end test

  }); //end describe

}); //end test suite
