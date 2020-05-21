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
  let resolverInstance;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let user03 = accounts[3];
  let user04 = accounts[4];
  let user05 = accounts[5];
  let arbiter = accounts[6];
  let feeAddress = accounts[7];
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
  let oraclePrice = web3.utils.toBN(27000); // return price from oracle
  let zeroNonce = web3.utils.toBN(0)

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

  describe("Testing arbiter on createPiggy", function() {

    it("Should settle normally if arbiter is set on creation", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(26953) // split below 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,arbiter,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      tokenIds = [1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length)

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPrice01,auctionPrice02,auctionPrice03,auctionPrice04,auctionPrice05
      let totalCollateral = web3.utils.toBN(0)
      let payout = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)
      let totalFees = web3.utils.toBN(0)

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[4]

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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], zeroNonce, {from: user01})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[16]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user01})), //[17]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user01})), //[19]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user01})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[30]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[31]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[32]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]
        originalERC20BalanceArbiter = result[4]

        auctionPrice01 = result[15].logs[1].args.paidPremium
        auctionPrice02 = result[16].logs[1].args.paidPremium
        auctionPrice03 = result[17].logs[1].args.paidPremium
        auctionPrice04 = result[18].logs[1].args.paidPremium
        auctionPrice05 = result[19].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        erc20BalanceOwner = result[30]
        erc20BalanceUser01 = result[31]
        erc20BalanceArbiter = result[32]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceArbiter.toString(), "0", "arbiter's original smartpiggies erc20 balance did not return zero")

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)
        payout = oraclePrice.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred)
        totalPayout = payout.mul(numOfTokens)
        totalFees = payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION).mul(numOfTokens)

        assert.strictEqual(erc20BalanceUser01.toString(), totalPayout.sub(totalFees).toString(), "user01's balance did not return correctly");

        totalCollateral = collateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")

        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[2]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[4]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[6]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[7]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeArbiter = web3.utils.toBN(result[2])

        balanceAfterOwner = web3.utils.toBN(result[5])
        balanceAfterUser01 = web3.utils.toBN(result[6])
        balanceAfterArbiter = web3.utils.toBN(result[7])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "owner's final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(totalPayout).sub(totalFees).sub(auctionProceeds).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalCollateral).sub(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner

        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(totalPayout).sub(totalFees).toString(), "user01's token balance did not return correctly")

        assert.strictEqual(balanceAfterArbiter.toString(), balanceBeforeArbiter.toString(), "arbiter's token balance did not return correctly")
      })
    }); //end test

    it("Should settle via arbitration if arbiter is set on creation", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // split above 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,arbiter,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

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
            web3.utils.toBN(27012),
            web3.utils.toBN(27029),
            web3.utils.toBN(27053),
            web3.utils.toBN(27076),
            web3.utils.toBN(27091)
          ]
      let payouts = []
      let serviceFees = []

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[4]

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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], zeroNonce, {from: user01})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[16]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user01})), //[17]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user01})), //[19]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user01})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[25]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: arbiter})), //[26]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user01})), //[27]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: arbiter})), //[28]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user01})), //[29]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: arbiter})), //[30]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user01})), //[31]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: arbiter})), //[32]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user01})), //[33]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: arbiter})), //[34]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[40]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[41]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[42]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]
        originalERC20BalanceArbiter = result[4]

        auctionPrice01 = result[15].logs[1].args.paidPremium
        auctionPrice02 = result[16].logs[1].args.paidPremium
        auctionPrice03 = result[17].logs[1].args.paidPremium
        auctionPrice04 = result[18].logs[1].args.paidPremium
        auctionPrice05 = result[19].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        erc20BalanceOwner = result[40]
        erc20BalanceUser01 = result[41]
        erc20BalanceArbiter = result[42]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceArbiter.toString(), "0", "arbiter's original smartpiggies erc20 balance did not return zero")

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)

        let payouts = proposedPrices.map(e => e.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        let feeAmounts = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))

        payouts.forEach(e => totalPayout = totalPayout.add(e))
        feeAmounts.forEach(e => totalFees = totalFees.add(e))
        assert.strictEqual(erc20BalanceUser01.toString(), totalPayout.sub(totalFees).toString(), "user01's balance did not return correctly");

        totalCollateral = collateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")

        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[2]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[4]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[6]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[7]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeArbiter = web3.utils.toBN(result[2])

        balanceAfterOwner = web3.utils.toBN(result[5])
        balanceAfterUser01 = web3.utils.toBN(result[6])
        balanceAfterArbiter = web3.utils.toBN(result[7])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "owner's final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(totalPayout).sub(totalFees).sub(auctionProceeds).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalCollateral).sub(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner

        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(totalPayout).sub(totalFees).toString(), "user01's token balance did not return correctly")

        assert.strictEqual(balanceAfterArbiter.toString(), balanceBeforeArbiter.toString(), "arbiter's token balance did not return correctly")
      })
    }); //end test

    it("Should settle via arbiter on creation between multiple parties", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // split above 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,arbiter,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      tokenIds = [1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length)

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPrice01,auctionPrice02,auctionPrice03,auctionPrice04,auctionPrice05
      let totalCollateral = web3.utils.toBN(0)
      let payout = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)

      let proposedPrices = [
            web3.utils.toBN(27020),
            web3.utils.toBN(27050),
            web3.utils.toBN(27075),
            web3.utils.toBN(27080),
            web3.utils.toBN(27095)
          ]
      let payouts = []
      let serviceFees = []

      // create 5 piggies, auction, and settle
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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], zeroNonce, {from: user01})), //[19]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user02})), //[20]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user03})), //[21]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user04})), //[22]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user05})), //[23]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[29]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: arbiter})), //[30]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user02})), //[31]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: arbiter})), //[32]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user03})), //[33]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: arbiter})), //[34]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user04})), //[35]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: arbiter})), //[36]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user05})), //[37]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: arbiter})), //[38]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[44]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[45]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[46]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[47]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[48]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[49]
        () => Promise.resolve(piggyInstance.getERC20Balance(arbiter, tokenInstance.address, {from: owner})), //[50]
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

        auctionPrice01 = result[19].logs[1].args.paidPremium
        auctionPrice02 = result[20].logs[1].args.paidPremium
        auctionPrice03 = result[21].logs[1].args.paidPremium
        auctionPrice04 = result[22].logs[1].args.paidPremium
        auctionPrice05 = result[23].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        erc20BalanceOwner = result[44]
        erc20BalanceUser01 = result[45]
        erc20BalanceUser02 = result[46]
        erc20BalanceUser03 = result[47]
        erc20BalanceUser04 = result[48]
        erc20BalanceUser05 = result[49]
        erc20BalanceArbiter = result[50]

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

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)

        payouts.push(proposedPrices[0].sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees.push(payouts[0].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser01.toString(), payouts[0].sub(serviceFees[0]).toString(), "user01's balance did not return correctly");

        payouts.push(proposedPrices[1].sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees.push(payouts[1].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser02.toString(), payouts[1].sub(serviceFees[1]).toString(), "user02's balance did not return correctly");

        payouts.push(proposedPrices[2].sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees.push(payouts[2].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser03.toString(), payouts[2].sub(serviceFees[2]).toString(), "user03's balance did not return correctly");

        payouts.push(proposedPrices[3].sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees.push(payouts[3].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser04.toString(), payouts[3].sub(serviceFees[3]).toString(), "user04's balance did not return correctly");

        payouts.push(proposedPrices[4].sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees.push(payouts[4].mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        assert.strictEqual(erc20BalanceUser05.toString(), payouts[4].sub(serviceFees[4]).toString(), "user05's balance did not return correctly");


        totalCollateral = collateral.mul(numOfTokens)
        totalPayout = payouts[0].add(payouts[1]).add(payouts[2]).add(payouts[3]).add(payouts[4])
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")


        assert.strictEqual(erc20BalanceArbiter.toString(), "0", "arbiter's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[2]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[3]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[6]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[7]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[8]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser02, {from: user02})), //[9]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser03, {from: user03})), //[10]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser04, {from: user04})), //[11]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser05, {from: user05})), //[12]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[13]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[14]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[15]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[16]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[17]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[18]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[19]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeUser02 = web3.utils.toBN(result[2])
        balanceBeforeUser03 = web3.utils.toBN(result[3])
        balanceBeforeUser04 = web3.utils.toBN(result[4])
        balanceBeforeUser05 = web3.utils.toBN(result[5])
        balanceBeforeArbiter = web3.utils.toBN(result[6])

        balanceAfterOwner = web3.utils.toBN(result[13])
        balanceAfterUser01 = web3.utils.toBN(result[14])
        balanceAfterUser02 = web3.utils.toBN(result[15])
        balanceAfterUser03 = web3.utils.toBN(result[16])
        balanceAfterUser04 = web3.utils.toBN(result[17])
        balanceAfterUser05 = web3.utils.toBN(result[18])
        balanceAfterArbiter = web3.utils.toBN(result[19])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "owner's final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(payouts[0]).sub(serviceFees[0]).sub(auctionPrice01).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalCollateral).sub(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner

        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(payouts[0]).sub(serviceFees[0]).toString(), "user01's token balance did not return correctly")

        assert.strictEqual(balanceAfterUser02.toString(), balanceBeforeUser02.add(payouts[1]).sub(serviceFees[1]).toString(), "user02's token balance did not return correctly")

        assert.strictEqual(balanceAfterUser03.toString(), balanceBeforeUser03.add(payouts[2]).sub(serviceFees[2]).toString(), "user03's token balance did not return correctly")

        assert.strictEqual(balanceAfterUser04.toString(), balanceBeforeUser04.add(payouts[3]).sub(serviceFees[3]).toString(), "user04's token balance did not return correctly")

        assert.strictEqual(balanceAfterUser05.toString(), balanceBeforeUser05.add(payouts[4]).sub(serviceFees[4]).toString(), "user05's token balance did not return correctly")

        assert.strictEqual(balanceAfterArbiter.toString(), balanceBeforeArbiter.toString(), "arbiter's token balance did not return correctly")
      })
    }); //end test

  }); //end describe

  describe("Test arbitration when all parties are the same account address", function() {

    it("Should settle via arbitration if arbiter is writer", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // split above 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,owner,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

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
            web3.utils.toBN(27012),
            web3.utils.toBN(27029),
            web3.utils.toBN(27053),
            web3.utils.toBN(27076),
            web3.utils.toBN(27091)
          ]
      let payouts = []
      let serviceFees = []

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[3]

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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], zeroNonce, {from: user01})), //[14]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user01})), //[16]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user01})), //[17]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user01})), //[18]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user01})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: owner})), //[24]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: owner})), //[25]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: owner})), //[26]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: owner})), //[27]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: owner})), //[28]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[35]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]

        auctionPrice01 = result[14].logs[1].args.paidPremium
        auctionPrice02 = result[15].logs[1].args.paidPremium
        auctionPrice03 = result[16].logs[1].args.paidPremium
        auctionPrice04 = result[17].logs[1].args.paidPremium
        auctionPrice05 = result[18].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        //token 1
        assert.strictEqual(result[24].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[24].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[24].logs[0].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[24].logs[0].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[24].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[24].logs[1].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[24].logs[1].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[24].logs[1].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[24].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[24].logs[2].args.from, owner, "event param did not return correct address for sender");
        assert.strictEqual(result[24].logs[2].args.arbiter, owner, "event param did not return correct address for arbiter");
        assert.strictEqual(result[24].logs[2].args.tokenId.toString(), tokenIds[0].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[24].logs[2].args.exercisePrice.toString(), proposedPrices[0].toString(), "event param did not return correct share amount");

        //token 2
        assert.strictEqual(result[25].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[25].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[25].logs[0].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[25].logs[0].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[25].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[25].logs[1].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[25].logs[1].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[25].logs[1].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[25].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[25].logs[2].args.from, owner, "event param did not return correct address for sender");
        assert.strictEqual(result[25].logs[2].args.arbiter, owner, "event param did not return correct address for arbiter");
        assert.strictEqual(result[25].logs[2].args.tokenId.toString(), tokenIds[1].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[25].logs[2].args.exercisePrice.toString(), proposedPrices[1].toString(), "event param did not return correct share amount");

        //token 3
        assert.strictEqual(result[26].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[26].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[26].logs[0].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[26].logs[0].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[26].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[26].logs[1].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[26].logs[1].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[26].logs[1].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[26].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[26].logs[2].args.from, owner, "event param did not return correct address for sender");
        assert.strictEqual(result[26].logs[2].args.arbiter, owner, "event param did not return correct address for arbiter");
        assert.strictEqual(result[26].logs[2].args.tokenId.toString(), tokenIds[2].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[26].logs[2].args.exercisePrice.toString(), proposedPrices[2].toString(), "event param did not return correct share amount");

        //token 4
        assert.strictEqual(result[27].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[27].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[27].logs[0].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[27].logs[0].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[27].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[27].logs[1].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[27].logs[1].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[27].logs[1].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[27].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[27].logs[2].args.from, owner, "event param did not return correct address for sender");
        assert.strictEqual(result[27].logs[2].args.arbiter, owner, "event param did not return correct address for arbiter");
        assert.strictEqual(result[27].logs[2].args.tokenId.toString(), tokenIds[3].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[27].logs[2].args.exercisePrice.toString(), proposedPrices[3].toString(), "event param did not return correct share amount");

        //token 5
        assert.strictEqual(result[28].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[28].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[28].logs[0].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[28].logs[0].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[28].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[28].logs[1].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[28].logs[1].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[28].logs[1].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[28].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[28].logs[2].args.from, owner, "event param did not return correct address for sender");
        assert.strictEqual(result[28].logs[2].args.arbiter, owner, "event param did not return correct address for arbiter");
        assert.strictEqual(result[28].logs[2].args.tokenId.toString(), tokenIds[4].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[28].logs[2].args.exercisePrice.toString(), proposedPrices[4].toString(), "event param did not return correct share amount");

        erc20BalanceOwner = result[34]
        erc20BalanceUser01 = result[35]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)

        let payouts = proposedPrices.map(e => e.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        let feeAmounts = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))

        payouts.forEach(e => totalPayout = totalPayout.add(e))
        feeAmounts.forEach(e => totalFees = totalFees.add(e))
        assert.strictEqual(erc20BalanceUser01.toString(), totalPayout.sub(totalFees).toString(), "user01's balance did not return correctly");

        totalCollateral = collateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[3]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])

        balanceAfterOwner = web3.utils.toBN(result[4])
        balanceAfterUser01 = web3.utils.toBN(result[5])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "owner's final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(totalPayout).sub(totalFees).sub(auctionProceeds).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalCollateral).sub(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner

        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(totalPayout).sub(totalFees).toString(), "user01's token balance did not return correctly")
      })
    }); //end test

    it("Should settle via arbitration if arbiter is holder", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // split above 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,user01,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

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
            web3.utils.toBN(27012),
            web3.utils.toBN(27029),
            web3.utils.toBN(27053),
            web3.utils.toBN(27076),
            web3.utils.toBN(27091)
          ]
      let payouts = []
      let serviceFees = []

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[3]

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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], zeroNonce, {from: user01})), //[14]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user01})), //[16]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user01})), //[17]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user01})), //[18]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user01})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[24]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user01})), //[25]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user01})), //[26]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user01})), //[27]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user01})), //[28]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: user01})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[35]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceOwner = result[0]
        originalBalanceUser01 = result[1]

        originalERC20BalanceOwner = result[2]
        originalERC20BalanceUser01 = result[3]

        auctionPrice01 = result[14].logs[1].args.paidPremium
        auctionPrice02 = result[15].logs[1].args.paidPremium
        auctionPrice03 = result[16].logs[1].args.paidPremium
        auctionPrice04 = result[17].logs[1].args.paidPremium
        auctionPrice05 = result[18].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPrice01).add(auctionPrice02)
          .add(auctionPrice03).add(auctionPrice04).add(auctionPrice05)

        //token 1
        assert.strictEqual(result[24].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[24].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[24].logs[0].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[24].logs[0].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[24].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[24].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[24].logs[1].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[24].logs[1].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[24].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[24].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[24].logs[2].args.arbiter, user01, "event param did not return correct address for arbiter");
        assert.strictEqual(result[24].logs[2].args.tokenId.toString(), tokenIds[0].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[24].logs[2].args.exercisePrice.toString(), proposedPrices[0].toString(), "event param did not return correct share amount");

        //token 2
        assert.strictEqual(result[25].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[25].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[25].logs[0].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[25].logs[0].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[25].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[25].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[25].logs[1].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[25].logs[1].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[25].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[25].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[25].logs[2].args.arbiter, user01, "event param did not return correct address for arbiter");
        assert.strictEqual(result[25].logs[2].args.tokenId.toString(), tokenIds[1].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[25].logs[2].args.exercisePrice.toString(), proposedPrices[1].toString(), "event param did not return correct share amount");

        //token 3
        assert.strictEqual(result[26].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[26].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[26].logs[0].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[26].logs[0].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[26].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[26].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[26].logs[1].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[26].logs[1].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[26].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[26].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[26].logs[2].args.arbiter, user01, "event param did not return correct address for arbiter");
        assert.strictEqual(result[26].logs[2].args.tokenId.toString(), tokenIds[2].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[26].logs[2].args.exercisePrice.toString(), proposedPrices[2].toString(), "event param did not return correct share amount");

        //token 4
        assert.strictEqual(result[27].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[27].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[27].logs[0].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[27].logs[0].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[27].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[27].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[27].logs[1].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[27].logs[1].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[27].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[27].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[27].logs[2].args.arbiter, user01, "event param did not return correct address for arbiter");
        assert.strictEqual(result[27].logs[2].args.tokenId.toString(), tokenIds[3].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[27].logs[2].args.exercisePrice.toString(), proposedPrices[3].toString(), "event param did not return correct share amount");

        //token 5
        assert.strictEqual(result[28].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[28].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[28].logs[0].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[28].logs[0].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[28].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[28].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[28].logs[1].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[28].logs[1].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[28].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[28].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[28].logs[2].args.arbiter, user01, "event param did not return correct address for arbiter");
        assert.strictEqual(result[28].logs[2].args.tokenId.toString(), tokenIds[4].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[28].logs[2].args.exercisePrice.toString(), proposedPrices[4].toString(), "event param did not return correct share amount");

        erc20BalanceOwner = result[34]
        erc20BalanceUser01 = result[35]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceOwner.toString(), supply.toString(), "owner's original token balance did not return correctly")
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceOwner.toString(), "0", "owner's original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)

        let payouts = proposedPrices.map(e => e.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        let feeAmounts = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))

        payouts.forEach(e => totalPayout = totalPayout.add(e))
        feeAmounts.forEach(e => totalFees = totalFees.add(e))
        assert.strictEqual(erc20BalanceUser01.toString(), totalPayout.sub(totalFees).toString(), "user01's balance did not return correctly");

        totalCollateral = collateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[3]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])

        balanceAfterOwner = web3.utils.toBN(result[4])
        balanceAfterUser01 = web3.utils.toBN(result[5])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "owner's final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(totalPayout).sub(totalFees).sub(auctionProceeds).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalCollateral).sub(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner

        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(totalPayout).sub(totalFees).toString(), "user01's token balance did not return correctly")
      })
    }); //end test

    it("Should settle via arbitration if writer is holder", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // split above 27000
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

      serviceFee = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      tokenIds = [1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length)

      let originalBalanceUser01
      let totalCollateral = web3.utils.toBN(0)
      let payout = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)
      let totalFees = web3.utils.toBN(0)

      let proposedPrices = [
            web3.utils.toBN(27012),
            web3.utils.toBN(27029),
            web3.utils.toBN(27053),
            web3.utils.toBN(27076),
            web3.utils.toBN(27091)
          ]
      let payouts = []
      let serviceFees = []

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})), //[0]

        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01})), //[1]

        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[0], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user01})),

        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[0], proposedPrices[0], {from: user01})), //[12]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[1], proposedPrices[1], {from: user01})), //[13]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[2], proposedPrices[2], {from: user01})), //[14]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[3], proposedPrices[3], {from: user01})), //[15]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenIds[4], proposedPrices[4], {from: user01})), //[16]

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[0], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: user01})),

        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01})), //22]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalanceUser01 = result[0]

        originalERC20BalanceUser01 = result[1]

        //token 1
        assert.strictEqual(result[12].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[12].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[12].logs[0].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[12].logs[0].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[12].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[12].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[12].logs[1].args.tokenId.toString(), tokenIds[0].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[12].logs[1].args.proposedPrice.toString(), proposedPrices[0].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[12].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[12].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[12].logs[2].args.arbiter, addr00, "event param did not return correct address for arbiter");
        assert.strictEqual(result[12].logs[2].args.tokenId.toString(), tokenIds[0].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[12].logs[2].args.exercisePrice.toString(), proposedPrices[0].toString(), "event param did not return correct share amount");

        //token 2
        assert.strictEqual(result[13].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[13].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[13].logs[0].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[13].logs[0].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[13].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[13].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[13].logs[1].args.tokenId.toString(), tokenIds[1].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[13].logs[1].args.proposedPrice.toString(), proposedPrices[1].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[13].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[13].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[13].logs[2].args.arbiter, addr00, "event param did not return correct address for arbiter");
        assert.strictEqual(result[13].logs[2].args.tokenId.toString(), tokenIds[1].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[13].logs[2].args.exercisePrice.toString(), proposedPrices[1].toString(), "event param did not return correct share amount");

        //token 3
        assert.strictEqual(result[14].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[14].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[14].logs[0].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[14].logs[0].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[14].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[14].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[14].logs[1].args.tokenId.toString(), tokenIds[2].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[14].logs[1].args.proposedPrice.toString(), proposedPrices[2].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[14].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[14].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[14].logs[2].args.arbiter, addr00, "event param did not return correct address for arbiter");
        assert.strictEqual(result[14].logs[2].args.tokenId.toString(), tokenIds[2].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[14].logs[2].args.exercisePrice.toString(), proposedPrices[2].toString(), "event param did not return correct share amount");

        //token 4
        assert.strictEqual(result[15].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[15].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[15].logs[0].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[15].logs[0].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[15].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[15].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[15].logs[1].args.tokenId.toString(), tokenIds[3].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[15].logs[1].args.proposedPrice.toString(), proposedPrices[3].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[15].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[15].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[15].logs[2].args.arbiter, addr00, "event param did not return correct address for arbiter");
        assert.strictEqual(result[15].logs[2].args.tokenId.toString(), tokenIds[3].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[15].logs[2].args.exercisePrice.toString(), proposedPrices[3].toString(), "event param did not return correct share amount");

        //token 5
        assert.strictEqual(result[16].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[16].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[16].logs[0].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[16].logs[0].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[16].logs[1].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[16].logs[1].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[16].logs[1].args.tokenId.toString(), tokenIds[4].toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[16].logs[1].args.proposedPrice.toString(), proposedPrices[4].toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[16].logs[2].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[16].logs[2].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[16].logs[2].args.arbiter, addr00, "event param did not return correct address for arbiter");
        assert.strictEqual(result[16].logs[2].args.tokenId.toString(), tokenIds[4].toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[16].logs[2].args.exercisePrice.toString(), proposedPrices[4].toString(), "event param did not return correct share amount");

        erc20BalanceUser01 = result[22]

        // token balance at token contract should be initial supply minted for user
        assert.strictEqual(originalBalanceUser01.toString(), supply.toString(), "user01's original token balance did not return correctly")

        // token balance at smartpiggies contract should start at zero
        assert.strictEqual(originalERC20BalanceUser01.toString(), "0", "user01's original smartpiggies erc20 balance did not return zero")

        // calculate call payouts:
        // if settlement price > strike | payout = settlement price - strike * lot size
        oneHundred = web3.utils.toBN(100)

        let payouts = proposedPrices.map(e => e.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        let feeAmounts = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))

        payouts.forEach(e => totalPayout = totalPayout.add(e))
        feeAmounts.forEach(e => totalFees = totalFees.add(e))
        totalCollateral = collateral.mul(numOfTokens)
        assert.strictEqual(erc20BalanceUser01.toString(), totalCollateral.sub(totalFees).toString(), "writer's balance did not return correctly")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[0]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[2]
        ])
      })
      .then(result => {
        balanceBeforeUser01 = web3.utils.toBN(result[0])
        balanceAfterUser01 = web3.utils.toBN(result[2])

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.sub(totalFees).toString(),
          "user01's final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(totalCollateral).sub(totalFees).toString(), "user01's token balance did not return correctly")
      })
    }); //end test

  }); //end describe
}); //end test suite
