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
      resolverInstanceZero = instance;
      return Resolver.new(
        dataSource,
        underlying,
        oracleService,
        endpoint,
        path,
        oracleTokenAddress,
        "-1",
        {from: owner});
      })
      .then(instance => {
        resolverInstanceBad = instance;
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

        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: user01})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: user03})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: user04})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceZero.address, approveAmount, {from: user05})),

        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: user01})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: user03})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: user04})),
        () => Promise.resolve(linkInstance.approve(resolverInstanceBad.address, approveAmount, {from: user05})),

        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(piggyInstance.setCooldown(3, {from: owner}))
      ])
    });
  });

  describe("Test zero oracle value", function() {

    it("Settle an American call when oracle returns zero", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstanceZero.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // oracle returns zero, holder loses
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

        //holder loses contract, all collateral to the writer
        //payout = oraclePrice.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred)
        payout = web3.utils.toBN(0)
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

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[6]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeArbiter = web3.utils.toBN(result[2])

        balanceAfterOwner = web3.utils.toBN(result[4])
        balanceAfterUser01 = web3.utils.toBN(result[5])
        balanceAfterArbiter = web3.utils.toBN(result[6])

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

    it("Settle an American put when oracle returns zero", function() {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstanceZero.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // oracle returns zero, writer loses
      expiry = 500
      isEuro = false
      isPut = true
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

        //writer loses contract, payout is all collateral to the holder
        //payout = oraclePrice.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred)
        payout = collateral
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

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[3]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(arbiter, {from: owner})), //[6]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeArbiter = web3.utils.toBN(result[2])

        balanceAfterOwner = web3.utils.toBN(result[4])
        balanceAfterUser01 = web3.utils.toBN(result[5])
        balanceAfterArbiter = web3.utils.toBN(result[6])

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

  }); //end describe

  describe("Test bad oracle value", function() {

    it("Settle an American call when oracle returns overflow value", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstanceBad.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // oracle returns bad value, settle will fail
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

        //calculate payout for call
        //oracle price - strike price
        payouts = proposedPrices.map(e => e.sub(strikePrice).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        payouts.forEach(e => totalPayout = totalPayout.add(e))
        serviceFees.forEach(e => totalFees = totalFees.add(e))

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

    it("Settle an American put when oracle returns overflow value", function() {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstanceBad.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27000) // oracle returns bad value, settle will fail
      expiry = 500
      isEuro = false
      isPut = true
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
            web3.utils.toBN(26912),
            web3.utils.toBN(26929),
            web3.utils.toBN(26953),
            web3.utils.toBN(26976),
            web3.utils.toBN(26991)
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

        // calculate payout for a put
        // strike - exercise price
        payouts = proposedPrices.map(e => strikePrice.sub(e).mul(decimals).mul(lotSize).div(oneHundred))
        serviceFees = payouts.map(e => e.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION))
        payouts.forEach(e => totalPayout = totalPayout.add(e))
        serviceFees.forEach(e => totalFees = totalFees.add(e))

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

  }); //end describe
}); //end test suite
