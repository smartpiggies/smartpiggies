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
  //console.log(JSON.stringify(result, null, 4))

  //conditional testing
  condition = true

  var tokenInstance;
  var linkInstance;
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
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
  var oraclePrice = 27000; //including hundreth of a cent

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
      return tokenInstance.mint(owner, supply, {from: owner});
    })
    .then(() => {
      return linkInstance.mint(owner, supply, {from: owner});
    })
    .then(() => {
      return tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner});
    })
    .then(() => {
      return linkInstance.approve(resolverInstance.address, approveAmount, {from: owner});
    });
  });

  (condition ? describe : describe.skip)("Testing default parameters", function() {
    //test default values
    it("Should have correct default values", function() {
      return resolverInstance.getOwner({from: owner})
      .then(result => {
        assert.strictEqual(result.toString(), owner, "Contract did not return correct owner.");
        return resolverInstance.dataSource({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), dataSource, "Contract did not return correct datasource.");
        return resolverInstance.underlying({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), underlying, "Contract should have correct underlying.");
        return resolverInstance.oracleService({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), oracleService, "Contract should have correct oracle service.");
        return resolverInstance.endpoint({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), endpoint, "Contract should have correct endpoint.");
        return resolverInstance.path({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), path, "Contract should have correct path.");
        return resolverInstance.oracleTokenAddress({from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), oracleTokenAddress, "Contract should have correct oracle token address.");
        return resolverInstance.price({from: owner});
      })
      .then(result => {
        //oracle returns a default static price for testing locally
        assert.strictEqual(result.toNumber(), oraclePrice, "Contract should have correct oracle price.");
        return tokenInstance.balanceOf(owner, {from: owner});
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), supply.toString(), "Contract should have correct balance for owner.");
        return tokenInstance.allowance(owner, piggyInstance.address, {from: owner});
      })
      .then(allowance => {
        assert.strictEqual(allowance.toString(), approveAmount.toString(), "Contract should have correct allowance for owner.");
        return linkInstance.balanceOf(owner, {from: owner});
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), supply.toString(), "Contract should have correct balance for owner.");
        return linkInstance.allowance(owner, resolverInstance.address, {from: owner});
      })
      .then(allowance => {
        assert.strictEqual(allowance.toString(), approveAmount.toString(), "Contract should have correct allowance for owner.");
      });
      //end test
    });
  //end describe Default block
  });

  //Test Create SmartPiggies
  describe("Test Create functionality for a SmartPiggies token", function() {

    it("Should create a token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0

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
        //console.log(JSON.stringify(result, null, 4));
        return piggyInstance.getDetails(1, {from: owner});
      })
      .then(result => {
        //console.log(JSON.stringify(result, null, 4));

        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].premiumERC, premiumERC, "Details should have correct premiumERC address.");
        assert.strictEqual(result[0].dataResolverNow, dataResolverNow, "Details should have correct dataResolverNow address.");
        assert.strictEqual(result[0].dataResolverAtExpiry, dataResolverAtExpiry, "Details should have correct dataResolverAtExpiry address.");
        //check DetailUints
        assert.strictEqual(result[1].collateral, collateral.toString(), "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), '1', "getOwnedPiggies did not return correct piggies")
      })
      //end test block
    });

    //end describe Create block
  });

  //Test Create SmartPiggies fail cases
  describe("Test Failure cases for Creating SmartPiggies tokens", function() {
    before(function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false
    })

    it("Should fail to create a token if collateralERC is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            addr00,
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
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if premiumERC is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            addr00,
            dataResolverNow,
            dataResolverAtExpiry,
            collateral,
            lotSize,
            strikePrice,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if dataResolverNow is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            addr00,
            dataResolverAtExpiry,
            collateral,
            lotSize,
            strikePrice,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if dataResolverAtExpiry is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            dataResolverNow,
            addr00,
            collateral,
            lotSize,
            strikePrice,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if collateral is 0", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            dataResolverNow,
            dataResolverAtExpiry,
            zeroParam,
            lotSize,
            strikePrice,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if lotSize is 0", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            dataResolverNow,
            dataResolverAtExpiry,
            collateral,
            zeroParam,
            strikePrice,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if strikePrice is 0", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            dataResolverNow,
            dataResolverAtExpiry,
            collateral,
            lotSize,
            zeroParam,
            expiry,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if expiry is 0", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            premiumERC,
            dataResolverNow,
            dataResolverAtExpiry,
            collateral,
            lotSize,
            strikePrice,
            zeroParam,
            isEuro,
            isPut,
            isRequest,
            {from: owner, gas: 8000000 }),
          3000000);
      //end test
    });

    it("Should fail to create if approval payment transfer fails", function() {
      return tokenInstance.decreaseAllowance(piggyInstance.address, approveAmount, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return tokenInstance.allowance(owner, piggyInstance.address, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), '0', "Allowance did not return 0")
        return expectedExceptionPromise(
            () => piggyInstance.createPiggy(
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
              {from: owner, gas: 8000000 }),
            3000000)
      })
      //end test
    });

  //end describe Failure block
  });

  //Test Create Request For Piggy (RFP)
  describe("Test RFP functionality", function() {

    it("Should create an RFP token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = true //create RFP

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
        //console.log(JSON.stringify(result, null, 4));
        return piggyInstance.getDetails(1, {from: owner});
      })
      .then(result => {

        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].premiumERC, premiumERC, "Details should have correct premiumERC address.");
        assert.strictEqual(result[0].dataResolverNow, dataResolverNow, "Details should have correct dataResolverNow address.");
        assert.strictEqual(result[0].dataResolverAtExpiry, dataResolverAtExpiry, "Details should have correct dataResolverAtExpiry address.");
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.");
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), '1', "getOwnedPiggies didn't return correct piggies")
      })
      //end test block
    });

  //end describe RFP block
  });

  //Test American Put
  describe("Test American Put functionality", function() {

    it("Should create an American Put piggy", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
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
        return piggyInstance.getERC20balance(owner, tokenInstance.address, {from: owner})
      })
      .then(result => {
        ownerBalanceBefore = result
        //get the ERC20 balance for user01
        return piggyInstance.getERC20balance(user01, tokenInstance.address, {from: owner})
      })
      .then(result => {
        userBalanceBefore = result
        return piggyInstance.settlePiggy(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true")
        return piggyInstance.getERC20balance(owner, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize)
        //console.log(JSON.stringify(strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).toString(), null, 4))
        //console.log(payout.idivn(100).toString())
        //we are 100x off because of the cents inclusion in the price
        payout = strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).idivn(100)
        //console.log(collateral.sub(payout).toString())
        assert.strictEqual(balance.toString(), collateral.sub(payout).toString(), "owner balance did not return 0")
        return piggyInstance.getERC20balance(user01, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), payout.toString(), "owner balance did not return 0")
      });
      //end test block
    });

  //end describe American Put block
  });

  //Test American Put with split payout
  describe("Test an American Put piggy with split payout", function() {

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

  //Test transferFrom function
  describe("Test transfer functionality, Create an American Put piggy and transfer it", function() {

    it("Should transfer an American Put piggy", function() {
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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})
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
        //console.log(JSON.stringify(result[2].hasBeenCleared, null, 4))
        assert.isTrue(result[2].hasBeenCleared, "getDetails did not return hasBeenCleared flag correctly")
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        return piggyInstance.transferFrom(user02, owner, tokenId, {from: user02})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
      })

      //end test block
    });

    it("Should transfer an RFP", function() {
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
      isRequest = true //create RFP
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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result[2].isRequest, "getDetails did not return true for isRequest")
        assert.strictEqual(result[0].holder, owner, "getDetails did not return correct holder")
        return piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct holder")
      })

      //end test block
    });

    it("Should transfer a piggy after settlement", function() {
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
        return piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct owner")
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user02, "getDetails did not return correct owner")
        return piggyInstance.transferFrom(user02, owner, tokenId, {from: user02})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, owner, "getDetails did not return correct owner")
      })
      //end test block
    });

    it("Should fail to transfer when not owner", function() {
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
        return expectedExceptionPromise(
            () => piggyInstance.transferFrom(
              owner,
              user01,
              tokenId,
              {from: user01, gas: 8000000 }), //transaction from user01 rather than owner
            3000000);
      })
      //end test
    });

  //end describe Transfer block
  });

  //Test Auctioning SmartPiggies
  describe("Testing Auction functionality", function() {

    it("Should auction a token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = web3.utils.toBN(100)
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)
      startBlock = web3.utils.toBN(0)
      balanceBefore = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        web3.eth.getBlockNumberPromise()
        .then(block => {
          startBlock = web3.utils.toBN(block).add(web3.utils.toBN(1)) // will be mined in next block
        })

        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, startPrice, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, startPrice, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balance => {
        balanceBefore = balance
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock

        assert.strictEqual(result.startBlock.toString(), startBlock.toString(), "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), startBlock.add(auctionLength).toString(), "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), startPrice.toString(), "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), timeStep.toString(), "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), priceStep.toString(), "getAuctionDetails did not return the correct price step")
        assert.isTrue(result.auctionActive, "getAuctionDetails did not return true for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        web3.eth.getBlockNumberPromise()
        .then(blockNumber => {
          if (blockNumber < expiryBlock) {
            currentBlock = web3.utils.toBN(blockNumber)
            delta = currentBlock.sub(startBlock).mul(priceStep).div(timeStep)
            auctionPrice = startPrice.sub(delta)
          } else {
              auctionPrice = reservePrice
          }
        })
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct holder")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balanceNow => {
        assert.strictEqual(balanceNow.toString(), balanceBefore.sub(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should auction for the reserve price", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0

      startPrice = web3.utils.toBN(3000)
      reservePrice = web3.utils.toBN(1000)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(1000)
      startBlock = web3.utils.toBN(0)
      balanceBefore = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, startPrice, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, startPrice, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balance => {
        balanceBefore = balance
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        //console.log("start: ", result.startBlock)
        //console.log("end: ", result.expiryBlock)
        expiryBlock = result.expiryBlock
        startBlock = web3.utils.toBN(result.startBlock)

        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        web3.eth.getBlockNumberPromise()
        .then(blockNumber => {
          //console.log("check block: ", blockNumber)
          if (blockNumber < expiryBlock) {
            //console.log("active")
            currentBlock = web3.utils.toBN(blockNumber)
            delta = currentBlock.sub(startBlock).mul(priceStep).div(timeStep)
            auctionPrice = startPrice.sub(delta)
          } else {
              //console.log("expired")
              auctionPrice = reservePrice
          }
        })
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct holder")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balanceNow => {
        //console.log("balance now: ", balanceNow.toString())
        //console.log("balance before: ", balanceBefore.toString())
        //console.log("diff: ", balanceBefore.sub(auctionPrice).toString())
        //console.log("price: ", auctionPrice.toString())
        assert.strictEqual(balanceNow.toString(), balanceBefore.sub(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should auction an RFP token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = true // create RFP
      zeroParam = 0

      startPrice = web3.utils.toBN(1000)
      reservePrice = web3.utils.toBN(10000)
      auctionLength = web3.utils.toBN(100)
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)
      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      balanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return tokenInstance.balanceOf(owner, {from: owner})
      })
      .then(balance => {
        balanceBefore = web3.utils.toBN(balance)
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        web3.eth.getBlockNumberPromise()
        .then(block => {
          startBlock = web3.utils.toBN(block).add(web3.utils.toBN(1)) // will be mined in next block
        })

        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.balanceOf(owner, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), balanceBefore.sub(reservePrice).toString(), "premium balance did not return correctly")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balance => {
        balanceBefore = web3.utils.toBN(balance)
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock

        assert.strictEqual(result.startBlock.toString(), startBlock.toString(), "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), startBlock.add(auctionLength).toString(), "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), startPrice.toString(), "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), timeStep.toString(), "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), priceStep.toString(), "getAuctionDetails did not return the correct price step")
        assert.isTrue(result.auctionActive, "getAuctionDetails did not return true for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        web3.eth.getBlockNumberPromise()
        .then(blockNumber => {
          if (blockNumber < expiryBlock) {
            currentBlock = web3.utils.toBN(blockNumber)
            delta = currentBlock.sub(startBlock).mul(priceStep).div(timeStep)
            auctionPrice = startPrice.add(delta)
          } else {
              auctionPrice = reservePrice
          }
        })
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        assert.strictEqual(result[0].writer, user01, "getDetails did not return correct writer")
        return tokenInstance.balanceOf(user01, {from: user01})
      })
      .then(balanceNow => {
        assert.strictEqual(balanceNow.toString(), balanceBefore.sub(collateral).add(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should auction and transfer a token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, startPrice, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, startPrice, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transferFrom did not return true")
        return piggyInstance.getDetails(tokenId, {from: user02})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user02, "getDetails did not return correct holder")
        return  piggyInstance.getOwnedPiggies(user02, {from: user02})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "1", "getOwnedPiggies for user02 did not return correctly")
        return  piggyInstance.getOwnedPiggies(user01, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "", "getOwnedPiggies for user01 did not return correctly")
        return  piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "", "getOwnedPiggies for owner did not return correctly")
      })
      //end test block
    });

    it("Should fail to auction when not the owner", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: user01, gas: 8000000 }), //transaction from user01 rather than owner
            3000000);
      })
      //end test
    });

    it("Should fail to auction if piggy is expired", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 1 //piggy will be expired when auction is attempted
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if auction will expire after piggy", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 50
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if piggy has been cleared", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      oracleFee = web3.utils.toBN('1000000000000000000')

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice did not return true")
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result[2].hasBeenCleared, "getDetails did not return true for hasBeenCleared ")

        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if already on auction", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.auctionActive, "getAuctionDetails did not return true for auctionActive")

        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if RFP premium transfer fails", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = true

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(web3.utils.toWei("1001", "ether"))
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        //clear piggy (request the price from the oracle)
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result[2].isRequest, "isRequest did not return true")

        return tokenInstance.balanceOf(owner, {from: owner})

      })
      .then(balance => {
        assert.isTrue(reservePrice.gt(balance), "balance did not return lower than reservePrice")

        return expectedExceptionPromise(
            () => piggyInstance.startAuction(
              tokenId,
              startPrice,
              reservePrice,
              auctionLength,
              timeStep,
              priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    })

  //end describe Auction block
  });

  describe("Testing End Auction functionality", function() {

    it("Should end an auction", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.balanceOf(owner, {from: owner})
      })
      .then(balance => {
        balanceBefore = balance
        return piggyInstance.endAuction(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "endAuction did not return true")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.startBlock.toString(), "0", "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), "0", "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), "0", "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), "0", "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), "0", "getAuctionDetails did not return the correct price step")
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")
      })
      //end test block
    });

    it("Should end an auction for an RFP token", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = true // create RFP

      startPrice = web3.utils.toBN(1000)
      reservePrice = web3.utils.toBN(10000)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)
      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      balanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.balanceOf(owner, {from: owner})
      })
      .then(balance => {
        balanceBefore = web3.utils.toBN(balance)
        return piggyInstance.endAuction(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "endAuction did not return true")

        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.startBlock.toString(), "0", "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), "0", "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), "0", "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), "0", "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), "0", "getAuctionDetails did not return the correct price step")
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        return tokenInstance.balanceOf(owner, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), balanceBefore.add(reservePrice).toString(), "Balance after endAuction did not return correctly")
      })
      //end test block
    });

    it("Should fail to end auction when not the owner", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return expectedExceptionPromise(
            () => piggyInstance.endAuction(
              tokenId,
              {from: user01, gas: 8000000 }), //transaction from user01 rather than owner
            3000000);
      })
      //end test
    });

    it("Should fail to end auction when not active", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return expectedExceptionPromise(
            () => piggyInstance.endAuction(
              tokenId,
              {from: owner, gas: 8000000 }), //transaction from user01 rather than owner
            3000000);
      })
      //end test
    });

  //end describe End Auction block
  });

  describe("Testing Satisfy Auction functionality", function() {

    it("Should satisfy an auction", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
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

      ownerBalanceBefore = web3.utils.toBN(0)
      userBalanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(() => {
        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
        .then(result => {
          ownerBalanceBefore = web3.utils.toBN(result[0])
          userBalanceBefore = web3.utils.toBN(result[1])
        })
      })
      .then(() => {
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock
        startBlock = web3.utils.toBN(result.startBlock)
        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        web3.eth.getBlockNumberPromise()
        .then(blockNumber => {
          if (blockNumber < expiryBlock) {
            currentBlock = web3.utils.toBN(blockNumber)
            delta = currentBlock.sub(startBlock).mul(priceStep).div(timeStep)
            auctionPrice = startPrice.sub(delta)
          } else {
              auctionPrice = reservePrice
          }
        })
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct holder")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check that auction reset was triggered
        assert.strictEqual(result.startBlock.toString(), "0", "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), "0", "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), "0", "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), "0", "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), "0", "getAuctionDetails did not return the correct price step")
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[0].toString(), ownerBalanceBefore.add(auctionPrice).toString(), "Owner balance did not return correctly")
        assert.strictEqual(result[1].toString(), userBalanceBefore.sub(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should satisfy an RFP auction", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = true // create RFP

      startPrice = web3.utils.toBN(1000)
      reservePrice = web3.utils.toBN(10000)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)
      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      ownerBalanceBefore = web3.utils.toBN(0)
      userBalanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(() => {
        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
        .then(result => {
          ownerBalanceBefore = web3.utils.toBN(result[0])
          userBalanceBefore = web3.utils.toBN(result[1])
        })
      })
      .then(() => {
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock
        startBlock = web3.utils.toBN(result.startBlock)
        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        web3.eth.getBlockNumberPromise()
        .then(blockNumber => {
          if (blockNumber < expiryBlock) {
            currentBlock = web3.utils.toBN(blockNumber)
            delta = currentBlock.sub(startBlock).mul(priceStep).div(timeStep)
            auctionPrice = startPrice.add(delta)
          } else {
              auctionPrice = reservePrice
          }
        })
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].writer, user01, "getDetails did not return correct holder")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check that auction reset was triggered
        assert.strictEqual(result.startBlock.toString(), "0", "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), "0", "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), "0", "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), "0", "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), "0", "getAuctionDetails did not return the correct price step")
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
      })
      .then(result => {
        //console.log("price: ", auctionPrice.toString())
        //console.log("Owner bal before: ", ownerBalanceBefore.toString())
        //console.log("Owner bal now:    ", result[0].toString())
        //console.log("Owner bal diff:   ", ownerBalanceBefore.add(reservePrice).sub(auctionPrice).toString())

        //console.log("User bal before: ", userBalanceBefore.toString())
        //console.log("User bal:        ", result[1].toString())
        //console.log("User bal diff:   ", userBalanceBefore.sub(collateral).add(auctionPrice).toString())

        assert.strictEqual(result[0].toString(), ownerBalanceBefore.add(reservePrice).sub(auctionPrice).toString(), "Owner balance did not return correctly")
        assert.strictEqual(result[1].toString(), userBalanceBefore.sub(collateral).add(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should reset auction params if auction is expired for satisfy", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = false
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = web3.utils.toBN(1)
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

         web3.eth.getBlockNumberPromise()
         .then(block => {
           startBlock = web3.utils.toBN(block).add(web3.utils.toBN(1)) // will be mined in next block
         })

        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = web3.utils.toBN(result.expiryBlock)

        assert.strictEqual(result.startBlock.toString(), startBlock.toString(), "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), startBlock.add(auctionLength).toString(), "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), startPrice.toString(), "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), timeStep.toString(), "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), priceStep.toString(), "getAuctionDetails did not return the correct price step")
        assert.isTrue(result.auctionActive, "getAuctionDetails did not return true for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {

        //console.log("expiry: ", expiryBlock.toString())
        //web3.eth.getBlockNumberPromise()
        //.then(block => {
        //  console.log("current: ", block)
        //})
        //console.log("tx status: ", result.receipt.status)

        //Why does this return true when the solidity clause returns false???
        //test against emitted events
        //assert.isNotTrue(result.receipt.status, "satisfyAuction did not return false")
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")

        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //holder should fall back to owner, auction did not go through
        assert.strictEqual(result[0].holder, owner, "getDetails did not return correct holder")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check that auction reset was triggered
        assert.strictEqual(result.startBlock.toString(), "0", "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result.expiryBlock.toString(), "0", "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result.startPrice.toString(), "0", "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result.timeStep.toString(), "0", "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result.priceStep.toString(), "0", "getAuctionDetails did not return the correct price step")
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        assert.isNotTrue(result.satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")
      })
      //end test block
    });

    it("Should fail to satisfy an auction if satisfied by holder", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
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

      ownerBalanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(owner, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return tokenInstance.allowance(owner, piggyInstance.address, {from: owner})
      })
      .then(allowance => {
        assert.isTrue(allowance.gte(reservePrice), "allowance did not return greater than or equal to reservePrice")
      })
      .then(() => {
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, owner, "getDetails did not return correct holder")
        return expectedExceptionPromise(
            () => piggyInstance.satisfyAuction(
              tokenId,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it("Should fail to satisfy an auction that has already been satisfied", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
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

      ownerBalanceBefore = web3.utils.toBN(0)
      userBalanceBefore = web3.utils.toBN(0)

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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")
        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "getDetails did not return correct holder")
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        assert.isNotTrue(result.auctionActive, "getAuctionDetails did not return false for auction active")
        return tokenInstance.mint(user02, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user02})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve did not return true")

        return expectedExceptionPromise(
            () => piggyInstance.satisfyAuction(
              tokenId,
              {from: user02, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

  //end describe Satisfy Auction block
  });

  describe("Testing the Clearing process for piggies", function() {

    it("Should clear an American Put piggy", function() {
      collateralERC = tokenInstance.address
      premiumERC = tokenInstance.address
      dataResolverNow = resolverInstance.address
      dataResolverAtExpiry = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
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
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.startAuction(
          tokenId,
          startPrice,
          reservePrice,
          auctionLength,
          timeStep,
          priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return tokenInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return tokenInstance.approve(piggyInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return piggyInstance.satisfyAuction(tokenId, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user01})
      })
      .then(result => {
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice did not return true")
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
        assert.strictEqual(result[1].settlementPrice, oraclePrice.toString(), "settlementPrice did not return correctly")

      })
      //end test block
    });

  //end describe Clearing block
  })


});
