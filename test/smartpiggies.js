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

  //Test Create SmartPiggies
  describe("Create a SmartPiggies token", function() {

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

    //end describe block
  });

  //Test Create SmartPiggies fail cases
  describe("Fail to Create a SmartPiggies token", function() {
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

    //end describe block
  });

  //Test Create Request For Piggy (RFP)
  describe("Create a RFP SmartPiggies token", function() {

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

    //end describe block
  });

  //Test American Put
  describe("Create an American Put piggy", function() {

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

    //end describe block
  });

  //Test American Put with split payout
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



});
