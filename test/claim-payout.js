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

  var tokenInstance;
  var linkInstance;
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var feeAddress = accounts[3];
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
      return SmartPiggies.new({from: owner, gas: 8000000, gasPrice: 1100000000});
    })
    .then(instance => {
      piggyInstance = instance;

      /* setup housekeeping */
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user02, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner}))
      ])
    });
  });

  describe("Test claim payout functionality", function() {

    it("Should withdraw writer share correctly", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
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

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],params[8],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, {from: user01})), //[0]
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})), //[1]
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[3]
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[4]
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})) //[5]
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "settlePiggy did not return true")

        // Call payout:
        // if settlement price > strike | payout = settlement price - strike * lot size
        payout = web3.utils.toBN(0)
        if (oraclePrice.gt(strikePrice)) {
          delta = oraclePrice.sub(strikePrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION)
        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[3].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[3].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //call calculation for holder = payout
        assert.strictEqual(result[4].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[4].toString(), "0", "user01 balance did not return 0")
        assert.strictEqual(result[5].toString(), serviceFee.toString(), "feeAddress balance did not return 0")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, collateral, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[2]
        ]);
      })
      .then(result => {
        let balanceBefore = web3.utils.toBN(result[0]);
        let balanceAfter = web3.utils.toBN(result[2]);
        assert.isTrue(result[1].receipt.status, "claim payout did not return true");
        assert.strictEqual(balanceAfter.toString(), balanceBefore.add(collateral).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, balanceBefore.add(collateral).cmp(balanceAfter), "balance compare did not return equal");
      });
    }); //end test block

    it("Should withdraw holder share correctly", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26500) // holder wins
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

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],params[8],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, {from: user01})), //[0]
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})), //[1]
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[3]
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[4]
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})) //[5]
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "settlePiggy did not return true")
        // Call payout:
        // if settlement price > strike | payout = settlement price - strike * lot size
        payout = web3.utils.toBN(0)
        if (oraclePrice.gt(strikePrice)) {
          delta = oraclePrice.sub(strikePrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION)

        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[3].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        //call calculation for holder = payout
        assert.strictEqual(result[4].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[5].toString(), serviceFee.toString(), "feeAddress balance did not return 0")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, payout.sub(serviceFee), {from: user01})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, serviceFee, {from: feeAddress})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[6]
        ]);
      })
      .then(result => {
        let userBalanceBefore = web3.utils.toBN(result[1]);
        let feeBalanceBefore = web3.utils.toBN(result[2]);
        let userBalanceAfter = web3.utils.toBN(result[5]);
        let feeBalanceAfter = web3.utils.toBN(result[6]);

        assert.isTrue(result[3].receipt.status, "user01 payout did not return true");
        assert.isTrue(result[4].receipt.status, "fee payout did not return true");

        /* check user01 balance */
        assert.strictEqual(userBalanceAfter.toString(), userBalanceBefore.add(payout).sub(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, userBalanceBefore.add(payout).sub(serviceFee).cmp(userBalanceAfter), "balance compare did not return equal");
        /* check feeAddress balance */
        assert.strictEqual(feeBalanceAfter.toString(), feeBalanceBefore.add(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, feeBalanceBefore.add(serviceFee).cmp(feeBalanceAfter), "balance compare did not return equal");
      });
    }); //end test block

  }); //end describe block

}); //end test suite
