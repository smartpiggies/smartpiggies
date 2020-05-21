//Promise = require("bluebird");
//Promise.promisifyAll(web3.eth, { suffix: "Promise"});
//var expectedExceptionPromise = require("./utils/expectedException.js");

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

  let tokenInstance
  let linkInstance
  let helperInstance
  let piggyInstance
  let resolverInstance
  let owner = accounts[0]
  let user01 = accounts[1]
  let user02 = accounts[2]
  let feeAddress = accounts[3]
  let addr00 = "0x0000000000000000000000000000000000000000"
  let decimal = 18
  let decimals = web3.utils.toBN(Math.pow(10,decimal))
  let supply = web3.utils.toWei("1000", "ether")
  let approveAmount = web3.utils.toWei("100", "ether")
  let exchangeRate = 1
  let dataSource = 'NASDAQ'
  let underlying = 'SPY'
  let oracleService = 'Self'
  let endpoint = 'https://www.nasdaq.com/symbol/spy'
  let path = ''
  let oracleTokenAddress
  let oraclePrice = web3.utils.toBN(27000) //including hundreth of a cent
  let tokenId = web3.utils.toBN(0)

  const DEFAULT_FEE_PERCENT = web3.utils.toBN(50)
  const DEFAULT_FEE_RESOLUTION = web3.utils.toBN(10000)

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
      resolverInstance = instance;
      return PiggyHelper.new({from: owner});
    })
    .then(instance => {
      helperInstance = instance;
      return SmartPiggies.new(helperInstance.address, {from: owner, gas: 8000000, gasPrice: 1100000000});
    })
    .then(instance => {
      piggyInstance = instance
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user02, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user02, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner}))
      ])
    });
  });

  //Test American Put
  describe("Create and Settle Piggies", function() {
    const count = 200
    let strike = 26500
    for (let i = 1; i <= count; i++) {
      it("Should create an American Put piggy with strike: " + (strike + (i*5)), function() {
        collateralERC = tokenInstance.address
        dataResolver = resolverInstance.address
        collateral = web3.utils.toBN(100 * decimals)
        lotSize = web3.utils.toBN(10)
        strikePrice = web3.utils.toBN((strike + (i*5)))
        expiry = web3.utils.toBN(500)
        isEuro = false
        isPut = true
        isRequest = false
        oracleFee = web3.utils.toBN('1000000000000000000')
        strikePriceBN = web3.utils.toBN(strikePrice)
        settlementPriceBN = web3.utils.toBN('0')
        user01BalanceBefore = web3.utils.toBN('0')
        user02BalanceBefore = web3.utils.toBN('0')
        feeBalanceBefore = web3.utils.toBN('0')

        serviceFee = web3.utils.toBN('0')

        params = [collateralERC,dataResolver,addr00,collateral,
          lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

        return piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: user01}
        )
        .then(result => {
          assert.isTrue(result.receipt.status, "create did not return true")
          assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
          assert.strictEqual(result.logs[0].args.addresses[0], user01, "Event log from create didn't return correct sender")
          assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return correct sender")
          assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
          assert.strictEqual(result.logs[0].args.ints[0].toString(), "1", "Event log from create didn't return correct tokenId")
          assert.strictEqual(result.logs[0].args.ints[1].toString(), collateral.toString(), "Event log from create didn't return correct collateral")
          assert.strictEqual(result.logs[0].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lot size")
          assert.strictEqual(result.logs[0].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
          assert.isNotTrue(result.logs[0].args.bools[0], "Event log from create didn't return false for is European")
          assert.isTrue(result.logs[0].args.bools[1], "Event log from create didn't return true for is put")
          assert.isNotTrue(result.logs[0].args.bools[2], "Event log from create didn't return false for RFP")
          web3.eth.getBlockNumberPromise()
          .then(block => {
            currentBlock = web3.utils.toBN(block)
            assert.strictEqual(result.logs[0].args.ints[4].toString(), expiry.add(currentBlock).toString(), "Event log from create didn't return correct expiry block")
          })
          return piggyInstance.tokenId({from: owner});
        })
        .then(result => {
          //use last tokenId created
          tokenId = result

          return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01});
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "transfer function did not return true")
          assert.strictEqual(result.logs[0].event, "TransferPiggy", "Event log from create didn't return correct event name")
          assert.strictEqual(result.logs[0].args.from, user01, "Event log from create didn't return correct sender")
          assert.strictEqual(result.logs[0].args.to, user02, "Event log from create didn't return correct recipient")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from create didn't return correct tokenId")

          //clear piggy (request the price from the oracle)
          return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02})
        })
        .then(result => {
          assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
          //Oracle Event
          assert.strictEqual(result.logs[0].event, "OracleReturned", "Event log from oracle didn't return correct event name")
          assert.strictEqual(result.logs[0].args.resolver, dataResolver, "Event log from oracle didn't return correct sender")
          assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from oracle didn't return correct tokenId")
          assert.strictEqual(result.logs[0].args.price.toString(), oraclePrice.toString(), "Event log from oracle didn't return correct price")

          //Satisfy Event
          assert.strictEqual(result.logs[1].event, "RequestSettlementPrice", "Event log from request didn't return correct event name")
          assert.strictEqual(result.logs[1].args.feePayer, user02, "Event log from request didn't return correct sender")
          assert.strictEqual(result.logs[1].args.tokenId.toString(), tokenId.toString(), "Event log from request didn't return correct tokenId")
          assert.strictEqual(result.logs[1].args.oracleFee.toString(), oracleFee.toString(), "Event log from request didn't return correct tokenId")
          assert.strictEqual(result.logs[1].args.dataResolver.toString(), dataResolver, "Event log from request didn't return correct resolver")

          return piggyInstance.getDetails(tokenId, {from: user01})
        })
        .then(result => {
          settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
          assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly")

          return sequentialPromise([
            () => Promise.resolve(piggyInstance.getERC20Balance(user01, collateralERC, {from: owner})),
            () => Promise.resolve(piggyInstance.getERC20Balance(user02, collateralERC, {from: owner})),
            () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner}))
          ])
        })
        .then(result => {
          assert.isTrue(result[2].receipt.status, "settlePiggy function did not return true")

          user01BalanceBefore = result[0]
          user02BalanceBefore = result[1]

          //Settle Event
          assert.strictEqual(result[2].logs[0].event, "SettlePiggy", "Event log from settlement didn't return correct event name")
          assert.strictEqual(result[2].logs[0].args.from, owner, "Event log from settlement didn't return correct sender")
          assert.strictEqual(result[2].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from settlement didn't return correct tokenId")

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
          serviceFee = payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION)
          assert.strictEqual(result[2].logs[0].args.holderPayout.toString(), payout.sub(serviceFee).toString(), "Event log from settlement didn't return correct holder payout")
          assert.strictEqual(result[2].logs[0].args.writerPayout.toString(), collateral.sub(payout).toString(), "Event log from settlement didn't return correct writer payout")

          return sequentialPromise([
            () => Promise.resolve(piggyInstance.getERC20Balance(user01, collateralERC, {from: owner})),
            () => Promise.resolve(piggyInstance.getERC20Balance(user02, collateralERC, {from: owner})),
            () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, collateralERC, {from: owner}))
          ])
        })
        .then(result => {
          lotSizeBN = web3.utils.toBN(lotSize)

          assert.strictEqual(result[0].toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "user01 balance did not return correctly")
          assert.strictEqual(result[1].toString(), user02BalanceBefore.add(payout).sub(serviceFee).toString(), "user02 balance did not return correctly")
          assert.strictEqual(result[2].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
        });

        //end test block
      });

    }

    //end describe
  });

});
