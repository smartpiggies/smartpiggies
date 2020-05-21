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
        () => Promise.resolve(piggyInstance.setCooldown(0, {from: owner}))
      ])
    });
  });

  describe("Test satisfy auction for an RFP with nonce", function() {

    it("Should set the RFP Nonce during update", function() {
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

      let zero = web3.utils.toBN(0)
      let one = web3.utils.toBN(1)
      let tokenId = web3.utils.toBN(1)
      let rfpNonce = one.add(one)

      params = [collateralERC,addr123,addr00,collateral, // dataResolver starts out as junk, i.e. 0x123...
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      updateParams = [addr00,dataResolver,arbiter,updateCollateral, // sending zero value will not update param
        updateLotSize,updateStrikePrice,zero,isEuro,isPut]

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})), //[0]
        () => Promise.resolve(web3.eth.getBlockNumber()), //[1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[2]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[3]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4].add(one),updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[5]
      ])
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[2][0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[2][0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[2][0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[2][0].dataResolver, addr123, "Details should have correct dataResolver address.")
        assert.strictEqual(result[2][0].arbiter, addr00, "Details should have correct arbiter address.")
        assert.strictEqual(result[2][0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[2][0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        currentBlock = web3.utils.toBN(result[1])
        //check DetailUints
        assert.strictEqual(result[2][1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[2][1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[2][1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[2][1].expiry, currentBlock.add(expiry).toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[2][1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[2][1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[2][1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[2][1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[2][1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[2][1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[2][1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")
        assert.strictEqual(result[2][1].rfpNonce.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2][2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2][2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2][2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2][2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2][2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2][2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2][2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2][2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2][2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2][2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        //check details after updateRFP
        //check DetailAddresses
        assert.strictEqual(result[5][0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[5][0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[5][0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[5][0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[5][0].arbiter, arbiter, "Details should have correct arbiter address.")
        assert.strictEqual(result[5][0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[5][0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[5][1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[5][1].lotSize, updateLotSize.add(one).toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[5][1].strikePrice, updateStrikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[5][1].expiry, currentBlock.add(expiry).toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[5][1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[5][1].reqCollateral, updateCollateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[5][1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[5][1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[5][1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[5][1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[5][1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")
        assert.strictEqual(result[5][1].rfpNonce.toString(), rfpNonce.toString(), "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[5][2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[5][2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[5][2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[5][2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[5][2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[5][2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[5][2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[5][2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[5][2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[5][2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")
      })
    }); //end test

    // American Put RFP
    it("Should reset rfpNonce after settlement", function() {
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

      let one = web3.utils.toBN(1)
      let tokenId = web3.utils.toBN(1)
      let rfpNonce = one

      let originalBalanceOwner, originalBalanceUser01
      let payout = web3.utils.toBN(0)

      params = [collateralERC,addr123,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      updateParams = [addr00,dataResolver,arbiter,updateCollateral,
        updateLotSize,updateStrikePrice,expiry,isEuro,isPut]

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[0]

        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})), //[1]
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),//[2]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[3]

        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[4]

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, rfpNonce, {from: user01})), //[5]
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: owner})), //[6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), //[7]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), //[8]
      ])
      .then(result => {
        // Check rfpNonce starts false
        assert.strictEqual(result[0][1].rfpNonce.toString(), "0", "updateRFP event did not return rfpNonce param correctly")
        assert.strictEqual(result[4][1].rfpNonce.toString(), rfpNonce.toString(), "updateRFP event did not return rfpNonce param correctly")
        assert.strictEqual(result[8][1].rfpNonce.toString(), "0", "updateRFP event did not return rfpNonce param correctly")

      })
    }); //end test

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

    // American Put RFP
    it("Should update an RFP during an auction for many users", function() {
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

      let one = web3.utils.toBN(1)
      let tokenId = web3.utils.toBN(1)
      let rfpNonce = one

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

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[0], rfpNonce, {from: owner})), //[24]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[1], rfpNonce, {from: owner})), //[25]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[2], rfpNonce, {from: owner})), //[26]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[3], rfpNonce, {from: owner})), //[27]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenIds[4], rfpNonce, {from: owner})), //[28]

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

    // American Put RFP
    it("Should fail to purchase if rfpNonce doesn't match", function() {
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
      let invalidNonce = one
      params = [collateralERC,addr123,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      updateParams = [addr00,dataResolver,arbiter,updateCollateral,
        updateLotSize,updateStrikePrice,expiry,isEuro,isPut]

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})), //[0]

        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),//[1]

        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[2]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[3]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[5]
        () => Promise.resolve(piggyInstance.updateRFP(tokenId,updateParams[0],updateParams[1],
                updateParams[2],updateParams[3],updateParams[4],updateParams[5],updateParams[6],
                updateParams[7],updateParams[8],{from: owner})), //[6]
      ])
      .then(result => {
          // should fail to satisfy
          return expectedExceptionPromise(
              () => piggyInstance.satisfyAuction(
                tokenId,
                invalidNonce,
                {from: owner, gas: 8000000 }),
              3000000);

      })
    }); //end test

  }); //end describe
}); //end test suite
