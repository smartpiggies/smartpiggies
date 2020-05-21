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
  let helperInstance;
  let piggyInstance;
  let resolverInstanceZero;
  let resolverInstanceBad;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let user03 = accounts[3];
  let user04 = accounts[4];
  let user05 = accounts[5];
  let arbiter = accounts[6];
  let feeAddress = accounts[7];
  let addr00 = "0x0000000000000000000000000000000000000000";
  let addr123 = "0x1230000000000000000000000000000000000000";
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
  let oraclePrice = web3.utils.toBN(0); // return price from oracle
  let one = web3.utils.toBN(1)
  let zeroNonce = web3.utils.toBN(0);
  let nonceOfOne = zeroNonce.add(one)

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
        () => Promise.resolve(piggyInstance.setCooldown(3, {from: owner}))
      ])
    });
  });

  describe("Test updateRFP during an auction", function() {
    // American Put RFP
    it("Should update an RFP during an auction for one writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      updateCollateral = web3.utils.toBN(20 * decimals)
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

      serviceFee = web3.utils.toBN(0)

      tokenIds = [1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length)

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPrice01,auctionPrice02,auctionPrice03,auctionPrice04,auctionPrice05
      let totalCollateral = web3.utils.toBN(0)
      let payout = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)
      let totalFees = web3.utils.toBN(0)

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
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[4]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[5]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[6]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[7]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[8]

        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[0],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[0],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[19]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[1],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[20]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[2],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[21]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[3],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[22]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[4],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[23]

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], nonceOfOne, {from: user01})), //[24]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], nonceOfOne, {from: user02})), //[25]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], nonceOfOne, {from: user03})), //[26]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], nonceOfOne, {from: user04})), //[27]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], nonceOfOne, {from: user05})), //[28]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: owner})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[34]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: arbiter})), //[35]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user02})), //[36]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: arbiter})), //[37]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user03})), //[38]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: arbiter})), //[39]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user04})), //[40]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: arbiter})), //[41]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user05})), //[42]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: arbiter})), //[43]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[49]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[50]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[51]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[52]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[53]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[54]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[55]
      ])
      .then(result => {

        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]
        originalERC20BalanceUser02 = result[4]
        originalERC20BalanceUser03 = result[5]
        originalERC20BalanceUser04 = result[6]
        originalERC20BalanceUser05 = result[7]
        originalERC20BalanceArbiter = result[8]

        //for RFP auction, only one event, as transfer doesn't take place
        auctionPrice01 = result[24].logs[0].args.paidPremium
        auctionPrice02 = result[25].logs[0].args.paidPremium
        auctionPrice03 = result[26].logs[0].args.paidPremium
        auctionPrice04 = result[27].logs[0].args.paidPremium
        auctionPrice05 = result[28].logs[0].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        erc20BalanceOwner = result[49]
        erc20BalanceUser01 = result[50]
        erc20BalanceUser02 = result[51]
        erc20BalanceUser03 = result[52]
        erc20BalanceUser04 = result[53]
        erc20BalanceUser05 = result[54]
        erc20BalanceArbiter = result[55]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser02.toString(), "0", "user02's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser03.toString(), "0", "user03's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser04.toString(), "0", "user04's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser05.toString(), "0", "user05's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceArbiter.toString(), "0", "arbiter's original smartpiggies erc20 balance did not return zero")

        // calculate put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        oneHundred = web3.utils.toBN(100)

        //users are now writers
        payouts.push(updateStrikePrice.sub(proposedPrices[0]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[0].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser01.toString(), updateCollateral.sub(payouts[0]).toString(), "user01's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[1]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[1].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser02.toString(), updateCollateral.sub(payouts[1]).toString(), "user02's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[2]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[2].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser03.toString(), updateCollateral.sub(payouts[2]).toString(), "user03's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[3]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[3].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser04.toString(), updateCollateral.sub(payouts[3]).toString(), "user04's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[4]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[4].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser05.toString(), updateCollateral.sub(payouts[4]).toString(), "user05's balance did not return correctly");

        //totalPayout = payouts[0].add(payouts[1]).add(payouts[2]).add(payouts[3]).add(payouts[4])
        payouts.forEach(e => totalPayout = totalPayout.add(e))
        serviceFees.forEach(e => totalFees = totalFees.add(e))
        assert.strictEqual(erc20BalanceOwner.toString(), totalPayout.sub(totalFees).toString(), "writer balance did not return correctly")

        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

      })
    }); //end test

    // American Put RFP
    it("Should update an RFP during an auction by many users", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      updateCollateral = web3.utils.toBN(20 * decimals)
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

      serviceFee = web3.utils.toBN(0)

      tokenIds = [1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length)

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPrice01,auctionPrice02,auctionPrice03,auctionPrice04,auctionPrice05
      let totalCollateral = web3.utils.toBN(0)
      let payout = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)
      let totalFees = web3.utils.toBN(0)

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
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[4]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[5]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[6]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[7]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[8]

        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user02})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user03})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user04})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user05})),

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[0],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user01})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user02})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user03})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user04})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user05})),

        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[0],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: user01})), //[19]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[1],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: user02})), //[20]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[2],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: user03})), //[21]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[3],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: user04})), //[22]
        () => Promise.resolve(piggyInstance.updateRFP(tokenIds[4],updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: user05})), //[23]

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], nonceOfOne, {from: owner})), //[24]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], nonceOfOne, {from: owner})), //[25]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], nonceOfOne, {from: owner})), //[26]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], nonceOfOne, {from: owner})), //[27]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], nonceOfOne, {from: owner})), //[28]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[34]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: arbiter})), //[35]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user02})), //[36]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: arbiter})), //[37]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user03})), //[38]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: arbiter})), //[39]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user04})), //[40]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: arbiter})), //[41]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user05})), //[42]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: arbiter})), //[43]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[49]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[50]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[51]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[52]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[53]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[54]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[55]
      ])
      .then(result => {

        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]
        originalERC20BalanceUser02 = result[4]
        originalERC20BalanceUser03 = result[5]
        originalERC20BalanceUser04 = result[6]
        originalERC20BalanceUser05 = result[7]
        originalERC20BalanceArbiter = result[8]

        //for RFP auction, only one event, as transfer doesn't take place
        auctionPrice01 = result[24].logs[0].args.paidPremium
        auctionPrice02 = result[25].logs[0].args.paidPremium
        auctionPrice03 = result[26].logs[0].args.paidPremium
        auctionPrice04 = result[27].logs[0].args.paidPremium
        auctionPrice05 = result[28].logs[0].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        erc20BalanceOwner = result[49]
        erc20BalanceUser01 = result[50]
        erc20BalanceUser02 = result[51]
        erc20BalanceUser03 = result[52]
        erc20BalanceUser04 = result[53]
        erc20BalanceUser05 = result[54]
        erc20BalanceArbiter = result[55]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser02.toString(), "0", "user02's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser03.toString(), "0", "user03's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser04.toString(), "0", "user04's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser05.toString(), "0", "user05's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceArbiter.toString(), "0", "arbiter's original smartpiggies erc20 balance did not return zero")

        // calculate put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        oneHundred = web3.utils.toBN(100)

        //users are now writers
        payouts.push(updateStrikePrice.sub(proposedPrices[0]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[0].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser01.toString(), payouts[0].sub(serviceFees[0]).toString(), "user01's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[1]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[1].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser02.toString(), payouts[1].sub(serviceFees[1]).toString(), "user02's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[2]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[2].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser03.toString(), payouts[2].sub(serviceFees[2]).toString(), "user03's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[3]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[3].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser04.toString(), payouts[3].sub(serviceFees[3]).toString().toString(), "user04's balance did not return correctly");

        payouts.push(updateStrikePrice.sub(proposedPrices[4]).mul(decimals).mul(updateLotSize).div(oneHundred))
        serviceFees.push(payouts[4].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser05.toString(), payouts[4].sub(serviceFees[4]).toString().toString(), "user05's balance did not return correctly");

        payouts.forEach(e => totalPayout = totalPayout.add(e))
        totalCollateral = updateCollateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")

        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

      })
    }); //end test

  }); //end describe

}); //end test suite
