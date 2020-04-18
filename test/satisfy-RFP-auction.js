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
  var resolverInstanceZero;
  var resolverInstanceBad;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var user03 = accounts[3];
  var user04 = accounts[4];
  var user05 = accounts[5];
  var arbiter = accounts[6];
  var feeAddress = accounts[7];
  var addr00 = "0x0000000000000000000000000000000000000000";
  var addr123 = "0x1230000000000000000000000000000000000000";
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
  var oraclePrice = web3.utils.toBN(0); // return price from oracle

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
        () => Promise.resolve(tokenInstance.mint(user03, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user04, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user05, supply, {from: owner})),

        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user02, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user03, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user04, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user05, supply, {from: owner})),

        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user03})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user04})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user05})),

        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user03})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user04})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user05})),

        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(piggyInstance.setCooldown(0, {from: owner}))
      ])
    });
  });

  describe("Test satisfy auction for an RFP with nonce", function() {
    // American Put RFP
    it("Should update an RFP during an auction for one writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      updateCollateral = web3.utils.toBN(50 * decimals)
      lotSize = 10
      updateLotSize = web3.utils.toBN(5)
      strikePrice = 28000
      updateStrikePrice = web3.utils.toBN(29000)
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = true //create RFP

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      let one = web3.utils.toBN(1)
      let tokenId = web3.utils.toBN(1)
      let rfpNonce = one.add(one).add(one).add(one).add(one)

      let originalBalanceOwner, originalBalanceUser01
      let payout = web3.utils.toBN(0)

      let proposedPrices = [
            web3.utils.toBN(28912),
            web3.utils.toBN(28929),
            web3.utils.toBN(28953),
            web3.utils.toBN(28976),
            web3.utils.toBN(28991)
          ]
      let payouts = []
      let serviceFees = []

      params = [collateralERC,addr123,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      updateParams = [addr00,dataResolver,arbiter,updateCollateral,
        updateLotSize,updateStrikePrice,expiry,isEuro,isPut]

      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[4]

        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})), //[5]

        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),//[6]

        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[7]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[8]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[9]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[10]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[11]

        () => Promise.resolve(web3.eth.getBlockNumber()), //[12]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[13]

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, rfpNonce, {from: user01})), //[14]
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: owner})), //[15]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrices[0], {from: user01})), //[16]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrices[0], {from: arbiter})), //[17]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), //[18]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[19]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[20]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[21]
      ])
      .then(result => {

        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]
        originalERC20BalanceArbiter = result[4]

        //for RFP auction, only one event, as transfer doesn't take place
        auctionPrice = result[14].logs[0].args.paidPremium

        erc20BalanceOwner = result[19]
        erc20BalanceUser01 = result[20]
        erc20BalanceArbiter = result[21]

        assert.strictEqual(result[7].logs[0].event, "UpdateRFP", "updateRFP event name did not return correctly")
        assert.strictEqual(result[7].logs[0].args.from, owner, "updateRFP event did not return from param correctly")
        assert.strictEqual(result[7].logs[0].args.tokenId.toString(), tokenId.toString(), "updateRFP event did not return tokenId param correctly")
        assert.strictEqual(result[7].logs[0].args.rfpNonce.toString(), one.toString(), "updateRFP event did not return rfpNonce param correctly")

        assert.strictEqual(result[8].logs[0].event, "UpdateRFP", "updateRFP event name did not return correctly")
        assert.strictEqual(result[8].logs[0].args.from, owner, "updateRFP event did not return from param correctly")
        assert.strictEqual(result[8].logs[0].args.tokenId.toString(), tokenId.toString(), "updateRFP event did not return tokenId param correctly")
        assert.strictEqual(result[8].logs[0].args.rfpNonce.toString(), one.add(one).toString(), "updateRFP event did not return rfpNonce param correctly")

        assert.strictEqual(result[9].logs[0].event, "UpdateRFP", "updateRFP event name did not return correctly")
        assert.strictEqual(result[9].logs[0].args.from, owner, "updateRFP event did not return from param correctly")
        assert.strictEqual(result[9].logs[0].args.tokenId.toString(), tokenId.toString(), "updateRFP event did not return tokenId param correctly")
        assert.strictEqual(result[9].logs[0].args.rfpNonce.toString(), one.add(one).add(one).toString(), "updateRFP event did not return rfpNonce param correctly")

        assert.strictEqual(result[10].logs[0].event, "UpdateRFP", "updateRFP event name did not return correctly")
        assert.strictEqual(result[10].logs[0].args.from, owner, "updateRFP event did not return from param correctly")
        assert.strictEqual(result[10].logs[0].args.tokenId.toString(), tokenId.toString(), "updateRFP event did not return tokenId param correctly")
        assert.strictEqual(result[10].logs[0].args.rfpNonce.toString(), one.add(one).add(one).add(one).toString(), "updateRFP event did not return rfpNonce param correctly")

        assert.strictEqual(result[11].logs[0].event, "UpdateRFP", "updateRFP event name did not return correctly")
        assert.strictEqual(result[11].logs[0].args.from, owner, "updateRFP event did not return from param correctly")
        assert.strictEqual(result[11].logs[0].args.tokenId.toString(), tokenId.toString(), "updateRFP event did not return tokenId param correctly")
        assert.strictEqual(result[11].logs[0].args.rfpNonce.toString(), one.add(one).add(one).add(one).add(one).toString(), "updateRFP event did not return rfpNonce param correctly")

        //check DetailAddresses
        assert.strictEqual(result[13][0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[13][0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[13][0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[13][0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[13][0].arbiter, arbiter, "Details should have correct arbiter address.")
        assert.strictEqual(result[13][0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[13][0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        let currentBlock = web3.utils.toBN(result[12])
        //check DetailUints
        assert.strictEqual(result[13][1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[13][1].lotSize, updateLotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[13][1].strikePrice, updateStrikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[13][1].expiry, currentBlock.add(expiry).toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[13][1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[13][1].reqCollateral, updateCollateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[13][1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[13][1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[13][1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[13][1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[13][1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")
        assert.strictEqual(result[13][1].rfpNonce.toString(), rfpNonce.toString(), "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[13][2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[13][2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[13][2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[13][2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[13][2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[13][2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[13][2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[13][2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[13][2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[13][2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceArbiter.toString(), "0", "arbiter's original smartpiggies erc20 balance did not return zero")

        // calculate put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        oneHundred = web3.utils.toBN(100)

        //users are now writers
        payout = updateStrikePrice.sub(proposedPrices[0]).mul(decimals).mul(updateLotSize).div(oneHundred)
        serviceFee= payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION)
        assert.strictEqual(erc20BalanceUser01.toString(), updateCollateral.sub(payout).toString(), "user01's balance did not return correctly");

        assert.strictEqual(erc20BalanceOwner.toString(), payout.sub(serviceFee).toString(), "writer balance did not return correctly")

        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

      })
    }); //end test

  }); //end describe
}); //end test suite
