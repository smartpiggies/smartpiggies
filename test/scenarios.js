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
  let piggyInstance;
  let resolverInstance;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let user03 = accounts[3];
  let user04 = accounts[4];
  let user05 = accounts[5];
  let feeAddress = accounts[6];
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
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner}))
      ])
    });
  });

  /* test balance of writer after multiple settlements */
  describe("Testing balance after multiple settlements for american call", function() {

    it("Should withdraw writer share correctly for american call", function () {
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]

      let originalBalance, erc20Balance
      let auctionProceeds = web3.utils.toBN(0)

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9], {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9], {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9], {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9], {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9], {from: owner})),

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[12]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[13]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[14]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[16]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[27]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalance = result[0]
        originalERC20Balance = result[1]
        auctionProceeds = auctionProceeds.add(result[12].logs[1].args.paidPremium)
          .add(result[13].logs[1].args.paidPremium).add(result[14].logs[1].args.paidPremium)
          .add(result[15].logs[1].args.paidPremium).add(result[16].logs[1].args.paidPremium)
        erc20Balance = result[27]
        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        assert.strictEqual(originalBalance.toString(), supply.toString(), "original token balance did not return correctly")
        assert.strictEqual(originalERC20Balance.toString(), "0", "original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(erc20Balance.toString(), collateral.mul(numOfTokens).toString(), "writer balance did not return correctly");
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20Balance, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
        ])
      })
      .then(result => {
        balanceBefore = web3.utils.toBN(result[0])
        balanceAfter = web3.utils.toBN(result[2])
        assert.strictEqual(balanceAfter.toString(), originalBalance.add(auctionProceeds).toString(), "final balance did not match original balance")
        assert.strictEqual(balanceAfter.toString(), balanceBefore.add(erc20Balance).toString(), "token balance did not update correctly")
      })
    }); //end test

    it("Should withdraw holder share correctly for american call", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(26500) // holder wins, i.e. all payout to holder
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPriceUser01, auctionPriceUser02, auctionPriceUser03,
        auctionPriceUser04, auctionPriceUser05

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

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[19]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[20]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[21]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[22]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[33]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[35]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[36]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[37]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[38]
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

        auctionPriceUser01 = result[18].logs[1].args.paidPremium
        auctionPriceUser02 = result[19].logs[1].args.paidPremium
        auctionPriceUser03 = result[20].logs[1].args.paidPremium
        auctionPriceUser04 = result[21].logs[1].args.paidPremium
        auctionPriceUser05 = result[22].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPriceUser01).add(auctionPriceUser02)
          .add(auctionPriceUser03).add(auctionPriceUser04).add(auctionPriceUser05)

        erc20BalanceOwner = result[33]
        erc20BalanceUser01 = result[34]
        erc20BalanceUser02 = result[35]
        erc20BalanceUser03 = result[36]
        erc20BalanceUser04 = result[37]
        erc20BalanceUser05 = result[38]

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

        // token balance at smartpiggies after settlement should be:
        // writer ERC20Balance is zero
        // collateral payout to holder minus service fee
        assert.strictEqual(erc20BalanceOwner.toString(), "0", "writer balance did not return correctly"); //auction proceeds get transferred in the token contract
        assert.strictEqual(erc20BalanceUser01.toString(), payout.sub(serviceFee).toString(), "user01's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser02.toString(), payout.sub(serviceFee).toString(), "user02's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser03.toString(), payout.sub(serviceFee).toString(), "user03's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser04.toString(), payout.sub(serviceFee).toString(), "user04's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser05.toString(), payout.sub(serviceFee).toString(), "user05's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[2]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[3]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[5]

          //ERC20Balance in smartpiggies contract for owner is zero, owner has auction proceeds transferred in token contract
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[6]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser02, {from: user02})), //[7]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser03, {from: user03})), //[8]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser04, {from: user04})), //[9]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser05, {from: user05})), //[10]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[11]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[12]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[13]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[14]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[15]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[16]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeUser02 = web3.utils.toBN(result[2])
        balanceBeforeUser03 = web3.utils.toBN(result[3])
        balanceBeforeUser04 = web3.utils.toBN(result[4])
        balanceBeforeUser05 = web3.utils.toBN(result[5])

        balanceAfterOwner = web3.utils.toBN(result[11])
        balanceAfterUser01 = web3.utils.toBN(result[12])
        balanceAfterUser02 = web3.utils.toBN(result[13])
        balanceAfterUser03 = web3.utils.toBN(result[14])
        balanceAfterUser04 = web3.utils.toBN(result[15])
        balanceAfterUser05 = web3.utils.toBN(result[16])

        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        totalCollateral = payout.mul(numOfTokens)

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(), originalBalanceOwner.add(auctionProceeds).sub(totalCollateral).toString(), "final balance did not match original balance")
        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(payout).sub(serviceFee).sub(auctionPriceUser01).toString(),
          "final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.toString(), "owner's token balance did not update correctly") // no change for owner
        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(payout).sub(serviceFee).toString(), "user01's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser02.toString(), balanceBeforeUser02.add(payout).sub(serviceFee).toString(), "user02's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser03.toString(), balanceBeforeUser03.add(payout).sub(serviceFee).toString(), "user03's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser04.toString(), balanceBeforeUser04.add(payout).sub(serviceFee).toString(), "user04's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser05.toString(), balanceBeforeUser05.add(payout).sub(serviceFee).toString(), "user05's token balance did not return correctly")
      })
    }); //end test

    it("Should withdraw writer and holder share correctly amer call for split payout", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(26950) // split payout
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length).sub(web3.utils.toBN(1))

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPriceUser01, auctionPriceUser02, auctionPriceUser03,
        auctionPriceUser04, auctionPriceUser05

      let totalCollateral = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)

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

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[19]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[20]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[21]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[22]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[33]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[35]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[36]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[37]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[38]
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

        auctionPriceUser01 = result[18].logs[1].args.paidPremium
        auctionPriceUser02 = result[19].logs[1].args.paidPremium
        auctionPriceUser03 = result[20].logs[1].args.paidPremium
        auctionPriceUser04 = result[21].logs[1].args.paidPremium
        auctionPriceUser05 = result[22].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPriceUser01).add(auctionPriceUser02)
          .add(auctionPriceUser03).add(auctionPriceUser04).add(auctionPriceUser05)

        erc20BalanceOwner = result[33]
        erc20BalanceUser01 = result[34]
        erc20BalanceUser02 = result[35]
        erc20BalanceUser03 = result[36]
        erc20BalanceUser04 = result[37]
        erc20BalanceUser05 = result[38]

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

        totalCollateral = collateral.mul(numOfTokens)
        totalPayout = payout.mul(numOfTokens)

        // token balance at smartpiggies after settlement should be:
        // writer ERC20Balance is zero
        // collateral payout to holder minus service fee
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly"); //auction proceeds get transferred in the token contract
        assert.strictEqual(erc20BalanceUser01.toString(), payout.sub(serviceFee).toString(), "user01's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser02.toString(), payout.sub(serviceFee).toString(), "user02's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser03.toString(), payout.sub(serviceFee).toString(), "user03's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser04.toString(), payout.sub(serviceFee).toString(), "user04's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser05.toString(), payout.sub(serviceFee).toString(), "user05's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[2]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[3]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[5]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[6]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[7]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser02, {from: user02})), //[8]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser03, {from: user03})), //[9]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser04, {from: user04})), //[10]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser05, {from: user05})), //[11]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[12]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[13]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[14]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[15]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[16]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[17]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeUser02 = web3.utils.toBN(result[2])
        balanceBeforeUser03 = web3.utils.toBN(result[3])
        balanceBeforeUser04 = web3.utils.toBN(result[4])
        balanceBeforeUser05 = web3.utils.toBN(result[5])

        balanceAfterOwner = web3.utils.toBN(result[12])
        balanceAfterUser01 = web3.utils.toBN(result[13])
        balanceAfterUser02 = web3.utils.toBN(result[14])
        balanceAfterUser03 = web3.utils.toBN(result[15])
        balanceAfterUser04 = web3.utils.toBN(result[16])
        balanceAfterUser05 = web3.utils.toBN(result[17])

        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        totalCollateral = payout.mul(numOfTokens)

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(payout).sub(serviceFee).sub(auctionPriceUser01).toString(),
          "final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner
        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(payout).sub(serviceFee).toString(), "user01's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser02.toString(), balanceBeforeUser02.add(payout).sub(serviceFee).toString(), "user02's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser03.toString(), balanceBeforeUser03.add(payout).sub(serviceFee).toString(), "user03's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser04.toString(), balanceBeforeUser04.add(payout).sub(serviceFee).toString(), "user04's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser05.toString(), balanceBeforeUser05.add(payout).sub(serviceFee).toString(), "user05's token balance did not return correctly")
      })
    }); //end test

  }); //end describe

  describe("Testing balance after multiple settlements for american put", function() {

    it("Should withdraw writer share correctly for american put", function () {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(26500) // writer wins, i.e. no payout
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]

      let originalBalance, erc20Balance
      let auctionProceeds = web3.utils.toBN(0)

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
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

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[12]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[13]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[14]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[15]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[16]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[27]
      ])
      .then(result => {
        // ERC20 balance accounting should be collateral from all piggies
        originalBalance = result[0]
        originalERC20Balance = result[1]
        auctionProceeds = auctionProceeds.add(result[12].logs[1].args.paidPremium)
          .add(result[13].logs[1].args.paidPremium).add(result[14].logs[1].args.paidPremium)
          .add(result[15].logs[1].args.paidPremium).add(result[16].logs[1].args.paidPremium)
        erc20Balance = result[27]
        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        assert.strictEqual(originalBalance.toString(), supply.toString(), "original token balance did not return correctly")
        assert.strictEqual(originalERC20Balance.toString(), "0", "original smartpiggies erc20 balance did not return zero")
        assert.strictEqual(erc20Balance.toString(), collateral.mul(numOfTokens).toString(), "writer balance did not return correctly");
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20Balance, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
        ])
      })
      .then(result => {
        balanceBefore = web3.utils.toBN(result[0])
        balanceAfter = web3.utils.toBN(result[2])
        assert.strictEqual(balanceAfter.toString(), originalBalance.add(auctionProceeds).toString(), "final balance did not match original balance")
        assert.strictEqual(balanceAfter.toString(), balanceBefore.add(erc20Balance).toString(), "token balance did not update correctly")
      })
    }); //end test

    it("Should withdraw holder share correctly for american put", function () {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(28000) // holder wins, i.e. all payout to holder
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPriceUser01, auctionPriceUser02, auctionPriceUser03,
        auctionPriceUser04, auctionPriceUser05

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

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[19]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[20]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[21]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[22]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[33]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[35]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[36]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[37]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[38]
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

        auctionPriceUser01 = result[18].logs[1].args.paidPremium
        auctionPriceUser02 = result[19].logs[1].args.paidPremium
        auctionPriceUser03 = result[20].logs[1].args.paidPremium
        auctionPriceUser04 = result[21].logs[1].args.paidPremium
        auctionPriceUser05 = result[22].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPriceUser01).add(auctionPriceUser02)
          .add(auctionPriceUser03).add(auctionPriceUser04).add(auctionPriceUser05)

        erc20BalanceOwner = result[33]
        erc20BalanceUser01 = result[34]
        erc20BalanceUser02 = result[35]
        erc20BalanceUser03 = result[36]
        erc20BalanceUser04 = result[37]
        erc20BalanceUser05 = result[38]

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

        // token balance at smartpiggies after settlement should be:
        // writer ERC20Balance is zero
        // collateral payout to holder minus service fee
        assert.strictEqual(erc20BalanceOwner.toString(), "0", "writer balance did not return correctly"); //auction proceeds get transferred in the token contract
        assert.strictEqual(erc20BalanceUser01.toString(), payout.sub(serviceFee).toString(), "user01's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser02.toString(), payout.sub(serviceFee).toString(), "user02's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser03.toString(), payout.sub(serviceFee).toString(), "user03's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser04.toString(), payout.sub(serviceFee).toString(), "user04's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser05.toString(), payout.sub(serviceFee).toString(), "user05's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[2]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[3]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[5]

          //ERC20Balance in smartpiggies contract for owner is zero, owner has auction proceeds transferred in token contract
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[6]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser02, {from: user02})), //[7]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser03, {from: user03})), //[8]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser04, {from: user04})), //[9]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser05, {from: user05})), //[10]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[11]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[12]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[13]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[14]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[15]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[16]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeUser02 = web3.utils.toBN(result[2])
        balanceBeforeUser03 = web3.utils.toBN(result[3])
        balanceBeforeUser04 = web3.utils.toBN(result[4])
        balanceBeforeUser05 = web3.utils.toBN(result[5])

        balanceAfterOwner = web3.utils.toBN(result[11])
        balanceAfterUser01 = web3.utils.toBN(result[12])
        balanceAfterUser02 = web3.utils.toBN(result[13])
        balanceAfterUser03 = web3.utils.toBN(result[14])
        balanceAfterUser04 = web3.utils.toBN(result[15])
        balanceAfterUser05 = web3.utils.toBN(result[16])

        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        totalCollateral = payout.mul(numOfTokens)

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(), originalBalanceOwner.add(auctionProceeds).sub(totalCollateral).toString(), "final balance did not match original balance")
        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(payout).sub(serviceFee).sub(auctionPriceUser01).toString(),
          "final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.toString(), "owner's token balance did not update correctly") // no change for owner
        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(payout).sub(serviceFee).toString(), "user01's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser02.toString(), balanceBeforeUser02.add(payout).sub(serviceFee).toString(), "user02's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser03.toString(), balanceBeforeUser03.add(payout).sub(serviceFee).toString(), "user03's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser04.toString(), balanceBeforeUser04.add(payout).sub(serviceFee).toString(), "user04's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser05.toString(), balanceBeforeUser05.add(payout).sub(serviceFee).toString(), "user05's token balance did not return correctly")
      })
    }); //end test

    it("Should withdraw writer and holder share correctly amer put for split payout", function () {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27050) // split payout
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length).sub(web3.utils.toBN(1))

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPriceUser01, auctionPriceUser02, auctionPriceUser03,
        auctionPriceUser04, auctionPriceUser05

      let totalCollateral = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)

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

        () => Promise.resolve(piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[2],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[3],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[4],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenIds[5],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], zeroNonce, {from: user01})), //[18]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], zeroNonce, {from: user02})), //[19]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], zeroNonce, {from: user03})), //[20]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], zeroNonce, {from: user04})), //[21]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[5], zeroNonce, {from: user05})), //[22]

        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[1], oracleFee, {from: user01})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[2], oracleFee, {from: user02})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[3], oracleFee, {from: user03})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[4], oracleFee, {from: user04})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenIds[5], oracleFee, {from: user05})),

        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[1], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[2], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[3], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[4], {from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenIds[5], {from: owner})),

        () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[33]
        () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[34]
        () => Promise.resolve(piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})), //[35]
        () => Promise.resolve(piggyInstance.getERC20Balance(user03, tokenInstance.address, {from: owner})), //[36]
        () => Promise.resolve(piggyInstance.getERC20Balance(user04, tokenInstance.address, {from: owner})), //[37]
        () => Promise.resolve(piggyInstance.getERC20Balance(user05, tokenInstance.address, {from: owner})), //[38]
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

        auctionPriceUser01 = result[18].logs[1].args.paidPremium
        auctionPriceUser02 = result[19].logs[1].args.paidPremium
        auctionPriceUser03 = result[20].logs[1].args.paidPremium
        auctionPriceUser04 = result[21].logs[1].args.paidPremium
        auctionPriceUser05 = result[22].logs[1].args.paidPremium

        auctionProceeds = auctionProceeds.add(auctionPriceUser01).add(auctionPriceUser02)
          .add(auctionPriceUser03).add(auctionPriceUser04).add(auctionPriceUser05)

        erc20BalanceOwner = result[33]
        erc20BalanceUser01 = result[34]
        erc20BalanceUser02 = result[35]
        erc20BalanceUser03 = result[36]
        erc20BalanceUser04 = result[37]
        erc20BalanceUser05 = result[38]

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

        totalCollateral = collateral.mul(numOfTokens)
        totalPayout = payout.mul(numOfTokens)

        // token balance at smartpiggies after settlement should be:
        // writer ERC20Balance is zero
        // collateral payout to holder minus service fee
        assert.strictEqual(erc20BalanceOwner.toString(), totalCollateral.sub(totalPayout).toString(), "writer balance did not return correctly"); //auction proceeds get transferred in the token contract
        assert.strictEqual(erc20BalanceUser01.toString(), payout.sub(serviceFee).toString(), "user01's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser02.toString(), payout.sub(serviceFee).toString(), "user02's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser03.toString(), payout.sub(serviceFee).toString(), "user03's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser04.toString(), payout.sub(serviceFee).toString(), "user04's balance did not return correctly");
        assert.strictEqual(erc20BalanceUser05.toString(), payout.sub(serviceFee).toString(), "user05's balance did not return correctly");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[2]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[3]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[5]

          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceOwner, {from: owner})), //[6]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser01, {from: user01})), //[7]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser02, {from: user02})), //[8]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser03, {from: user03})), //[9]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser04, {from: user04})), //[10]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, erc20BalanceUser05, {from: user05})), //[11]

          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[12]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[13]
          () => Promise.resolve(tokenInstance.balanceOf(user02, {from: owner})), //[14]
          () => Promise.resolve(tokenInstance.balanceOf(user03, {from: owner})), //[15]
          () => Promise.resolve(tokenInstance.balanceOf(user04, {from: owner})), //[16]
          () => Promise.resolve(tokenInstance.balanceOf(user05, {from: owner})), //[17]
        ])
      })
      .then(result => {
        balanceBeforeOwner = web3.utils.toBN(result[0])
        balanceBeforeUser01 = web3.utils.toBN(result[1])
        balanceBeforeUser02 = web3.utils.toBN(result[2])
        balanceBeforeUser03 = web3.utils.toBN(result[3])
        balanceBeforeUser04 = web3.utils.toBN(result[4])
        balanceBeforeUser05 = web3.utils.toBN(result[5])

        balanceAfterOwner = web3.utils.toBN(result[12])
        balanceAfterUser01 = web3.utils.toBN(result[13])
        balanceAfterUser02 = web3.utils.toBN(result[14])
        balanceAfterUser03 = web3.utils.toBN(result[15])
        balanceAfterUser04 = web3.utils.toBN(result[16])
        balanceAfterUser05 = web3.utils.toBN(result[17])

        numOfTokens = web3.utils.toBN(tokenIds.length-1)
        totalCollateral = payout.mul(numOfTokens)

        // test token balances in token contract after claiming payout
        assert.strictEqual(balanceAfterOwner.toString(),
          originalBalanceOwner.add(auctionProceeds).sub(totalPayout).toString(),
          "final balance did not match original balance")

        assert.strictEqual(balanceAfterUser01.toString(),
          originalBalanceUser01.add(payout).sub(serviceFee).sub(auctionPriceUser01).toString(),
          "final balance did not match original balance")

        // test token balance before and after claiming payout, receiving payout
        assert.strictEqual(balanceAfterOwner.toString(), balanceBeforeOwner.add(totalPayout).toString(), "owner's token balance did not update correctly") // no change for owner
        assert.strictEqual(balanceAfterUser01.toString(), balanceBeforeUser01.add(payout).sub(serviceFee).toString(), "user01's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser02.toString(), balanceBeforeUser02.add(payout).sub(serviceFee).toString(), "user02's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser03.toString(), balanceBeforeUser03.add(payout).sub(serviceFee).toString(), "user03's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser04.toString(), balanceBeforeUser04.add(payout).sub(serviceFee).toString(), "user04's token balance did not return correctly")
        assert.strictEqual(balanceAfterUser05.toString(), balanceBeforeUser05.add(payout).sub(serviceFee).toString(), "user05's token balance did not return correctly")
      })
    }); //end test

  }); //end describe

  describe("Test calling auction multiple times", function() {

    it("Should fail to auction a piggy more than once", function () {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27050) // split payout
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      tokenIds = [0,1,2,3,4,5]
      numOfTokens = web3.utils.toBN(tokenIds.length).sub(web3.utils.toBN(1))

      let originalBalanceOwner, originalBalanceUser01
      let auctionProceeds = web3.utils.toBN(0)
      let auctionPriceUser01, auctionPriceUser02, auctionPriceUser03,
        auctionPriceUser04, auctionPriceUser05

      let totalCollateral = web3.utils.toBN(0)
      let totalPayout = web3.utils.toBN(0)

      // create 5 piggies, auction, and settle
      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner}))
      ])
      .then(result => {
        assert.isTrue(result[0].receipt.status, "create status did not return true.")
        return piggyInstance.startAuction(tokenIds[1],startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "auction status did not return true.")
        return expectedExceptionPromise(
          () => piggyInstance.startAuction(
            tokenIds[1],startPrice,reservePrice,
            auctionLength,timeStep,priceStep,
            {from: owner, gas: 8000000 }),
            3000000);
      })
    }); //end test

  }); //end describe

}); //end test suite
