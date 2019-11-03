//Promise = require("bluebird");
//Promise.promisifyAll(web3.eth, { suffix: "Promise"});
//var expectedExceptionPromise = require("./utils/expectedException.js");

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

  var tokenInstance
  var linkInstance
  var piggyInstance
  var resolverInstance
  var owner = accounts[0]
  var user01 = accounts[1]
  var user02 = accounts[2]
  var addr00 = "0x0000000000000000000000000000000000000000"
  var decimal = 18
  //multiply a BN
  //var aNum = web3.utils.toBN(decimals).mul(web3.utils.toBN('1000'))
  var decimals = web3.utils.toBN(Math.pow(10,decimal))
  var supply = web3.utils.toWei("1000", "ether")
  var approveAmount = web3.utils.toWei("100", "ether")
  var exchangeRate = 1
  var dataSource = 'NASDAQ'
  var underlying = 'SPY'
  var oracleService = 'Self'
  var endpoint = 'https://www.nasdaq.com/symbol/spy'
  var path = ''
  var oracleTokenAddress
  var oraclePrice = web3.utils.toBN(27000) //including hundreth of a cent

  beforeEach(function() {
    //console.log(JSON.stringify("symbol: " + result, null, 4));
    return StableToken.new({from: owner})
    .then(instance => {
      tokenInstance = instance
      return TestnetLINK.new({from: owner})
    })
    .then(instance => {
      linkInstance = instance
      oracleTokenAddress = linkInstance.address
      return Resolver.new(
        dataSource,
        underlying,
        oracleService,
        endpoint,
        path,
        oracleTokenAddress,
        oraclePrice,
        {from: owner}
      )
    })
    .then(instance => {
      resolverInstance = instance
      return SmartPiggies.new({from: owner, gas: 8000000, gasPrice: 1100000000})
    })
    .then(instance => {
      piggyInstance = instance
      return tokenInstance.mint(owner, supply, {from: owner})
    })
    .then(() => {
      return linkInstance.mint(owner, supply, {from: owner})
    })
    .then(() => {
      return tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})
    })
    .then(() => {
      return linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})
    });
  });

  //Test American Put
  describe("Create and Settle Piggies", function() {
    const count = 200
    let strike = 26500
    for (let i = 0; i < count; i++) {
      it("Should create an American Put piggy with strike: " + (strike + (i*5)), function() {
        collateralERC = tokenInstance.address
        premiumERC = tokenInstance.address
        dataResolverNow = resolverInstance.address
        collateral = web3.utils.toBN(100 * decimals)
        lotSize = web3.utils.toBN(10)
        strikePrice = web3.utils.toBN((strike + (i*5)))
        expiry = web3.utils.toBN(500)
        isEuro = false
        isPut = true
        isRequest = false
        tokenId = 0
        oracleFee = web3.utils.toBN('1000000000000000000')
        strikePriceBN = web3.utils.toBN(strikePrice)
        settlementPriceBN = web3.utils.toBN('0')
        ownerBalanceBefore = web3.utils.toBN('0')
        userBalanceBefore = web3.utils.toBN('0')

        return piggyInstance.createPiggy(
          collateralERC,
          premiumERC,
          dataResolverNow,
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
          assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
          assert.strictEqual(result.logs[0].args.from, owner, "Event log from create didn't return correct sender")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from create didn't return correct tokenId")
          assert.strictEqual(result.logs[0].args.collateral.toString(), collateral.toString(), "Event log from create didn't return correct collateral")
          assert.strictEqual(result.logs[0].args.lotSize.toString(), lotSize.toString(), "Event log from create didn't return correct lot size")
          assert.strictEqual(result.logs[0].args.strike.toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
          assert.isNotTrue(result.logs[0].args.isEuro, "Event log from create didn't return false for is European")
          assert.isTrue(result.logs[0].args.isPut, "Event log from create didn't return true for is put")
          assert.isNotTrue(result.logs[0].args.RFP, "Event log from create didn't return false for RFP")
          web3.eth.getBlockNumberPromise()
          .then(block => {
            currentBlock = web3.utils.toBN(block)
            assert.strictEqual(result.logs[0].args.expiryBlock.toString(), expiry.add(currentBlock).toString(), "Event log from create didn't return correct expiry block")
          })
          return piggyInstance.tokenId({from: owner});
        })
        .then(result => {
          //use last tokenId created
          tokenId = result
          return piggyInstance.transferFrom(owner, user01, tokenId, {from: owner});
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "transfer function did not return true")
          assert.strictEqual(result.logs[0].event, "TransferPiggy", "Event log from create didn't return correct event name")
          assert.strictEqual(result.logs[0].args.from, owner, "Event log from create didn't return correct sender")
          assert.strictEqual(result.logs[0].args.to, user01, "Event log from create didn't return correct recipient")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from create didn't return correct tokenId")

          //mint link tokens for user01
          return linkInstance.mint(user01, supply, {from: owner})
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "mint function did not return true")
          //approve LINK transfer on behalf of the new holder (user01)
          return linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "approve function did not return true")
          //clear piggy (request the price from the oracle)
          return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
          //Oracle Event
          assert.strictEqual(result.logs[0].event, "OracleReturned", "Event log from oracle didn't return correct event name")
          assert.strictEqual(result.logs[0].args.resolver, dataResolverNow, "Event log from oracle didn't return correct sender")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from oracle didn't return correct tokenId")
          assert.strictEqual(result.logs[0].args.price.toString(), oraclePrice.toString(), "Event log from oracle didn't return correct tokenId")

          //Satisfy Event
          assert.strictEqual(result.logs[1].event, "RequestSettlementPrice", "Event log from request didn't return correct event name")
          assert.strictEqual(result.logs[1].args.feePayer, user01, "Event log from request didn't return correct sender")
          assert.strictEqual(result.logs[1].args.tokenId.toString(), tokenId.toString(), "Event log from request didn't return correct tokenId")
          assert.strictEqual(result.logs[1].args.oracleFee.toString(), oracleFee.toString(), "Event log from request didn't return correct tokenId")
          assert.strictEqual(result.logs[1].args.dataResolver.toString(), dataResolverNow, "Event log from request didn't return correct tokenId")

          return piggyInstance.getDetails(tokenId, {from: user01})
        })
        .then(result => {
          settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
          assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly")
          //get the ERC20 balance for the owner
          return piggyInstance.getERC20balance(owner, collateralERC, {from: owner})
        })
        .then(result => {
          ownerBalanceBefore = result
          //get the ERC20 balance for user01
          return piggyInstance.getERC20balance(user01, collateralERC, {from: owner})
        })
        .then(result => {
          userBalanceBefore = result
          return piggyInstance.settlePiggy(tokenId, {from: owner})
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "settlePiggy function did not return true")
          //Settle Event
          assert.strictEqual(result.logs[0].event, "SettlePiggy", "Event log from settlement didn't return correct event name")
          assert.strictEqual(result.logs[0].args.from, owner, "Event log from settlement didn't return correct sender")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from settlement didn't return correct tokenId")

          // Put payout:
            // if strike > settlement price | payout = strike - settlement price * lot size
            payout = web3.utils.toBN(0)
            if (strikePrice.gt(oraclePrice)) {
              delta = strikePrice.sub(oraclePrice)
              payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
            }
            if (payout.gt(collateral)) {
              payout = collateral
            }

          assert.strictEqual(result.logs[0].args.holderPayout.toString(), payout.toString(), "Event log from settlement didn't return correct holder payout")
          assert.strictEqual(result.logs[0].args.writerPayout.toString(), collateral.sub(payout).toString(), "Event log from settlement didn't return correct writer payout")

          return piggyInstance.getERC20balance(owner, collateralERC, {from: owner})
        })
        .then(balance => {
          lotSizeBN = web3.utils.toBN(lotSize)
          //console.log(JSON.stringify(strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).toString(), null, 4))
          if (strikePriceBN.gt(settlementPriceBN)) {
            payout = strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).idivn(100)
          } else {
            payout = web3.utils.toBN('0')
          }

          assert.strictEqual(balance.toString(), collateral.sub(payout).toString(), "owner balance did not return correctly")
          return piggyInstance.getERC20balance(user01, collateralERC, {from: owner})
        })
        .then(balance => {
          assert.strictEqual(balance.toString(), payout.toString(), "user balance did not return correctly")
        });
        //end test block
      });

    }

    //end describe
  });

/*
  //Test American Put
  describe("Create an American Put piggy with split payout", function() {

    it("Should create an American Put piggy", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 27850
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false
      tokenId = 0
      oracleFee = web3.utils.toBN('1000000000000000000')
      strikePriceBN = web3.utils.toBN(strikePrice)
      settlementPriceBN = web3.utils.toBN('0')
      ownerBalanceBefore = web3.utils.toBN('0')
      userBalanceBefore = web3.utils.toBN('0')

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
        //console.log(JSON.stringify(result.receipt.status, null, 4));
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.transferFrom(owner, user01, tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        //mint link tokens for user01
        return linkInstance.mint(user01, supply, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint function did not return true")
        //approve LINK transfer on behalf of the new holder (user01)
        return linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve function did not return true")
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
        assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly")
        //get the ERC20 balance for the owner
        return piggyInstance.getERC20balance(owner, collateralERC, {from: owner})
      })
      .then(result => {
        ownerBalanceBefore = result
        //get the ERC20 balance for user01
        return piggyInstance.getERC20balance(user01, collateralERC, {from: owner})
      })
      .then(result => {
        userBalanceBefore = result
        return piggyInstance.settlePiggy(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true")
        return piggyInstance.getERC20balance(owner, collateralERC, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize)
        //console.log(JSON.stringify(strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).toString(), null, 4))
        payout = strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).idivn(100)
        assert.strictEqual(balance.toString(), collateral.sub(payout).toString(), "owner balance did not return 0")
        return piggyInstance.getERC20balance(user01, collateralERC, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), payout.toString(), "owner balance did not return 0")
      });
      //end test block
    });

    //end describe block
  });
*/

});
