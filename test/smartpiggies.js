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
  //console.log(JSON.stringify(result, null, 4))

  //conditional testing
  condition = true

  let tokenInstance;
  let linkInstance;
  let helperInstance;
  let piggyInstance;
  let resolverInstance;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let feeAddress = accounts[3];
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
  let one = web3.utils.toBN(1)
  let three = web3.utils.toBN(3)

  const DEFAULT_FEE_PERCENT = web3.utils.toBN(50)
  const DEFAULT_FEE_RESOLUTION = web3.utils.toBN(10000)

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
        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner}))
      ])
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
        assert.strictEqual(result.toString(), oraclePrice.toString(), "Contract should have correct oracle price.");
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
  describe("Testing Create functionality for a SmartPiggies token", function() {

    it("Should create a token", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
      currentBlock = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {

        assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver address")
        assert.strictEqual(result.logs[0].args.addresses[3], addr00, "Event log from create didn't return correct arbiter address")

        assert.strictEqual(result.logs[0].args.ints[0].toString(), "1", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.ints[1].toString(), collateral.toString(), "Event log from create didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
        assert.isNotTrue(result.logs[0].args.bools[0], isEuro, "Event log from create didn't return correct isEuro")
        assert.isTrue(result.logs[0].args.bools[1], isPut, "Event log from create didn't return correct isPut")
        assert.isNotTrue(result.logs[0].args.bools[2], "Event log from create didn't return false for RFP")

        /* syncronous promise */
        web3.eth.getBlockNumberPromise()
        .then(block => {
          currentBlock = web3.utils.toBN(block)
          assert.strictEqual(result.logs[0].args.ints[4].toString(), expiry.add(currentBlock).toString(), "Event log from create didn't return correct expiry block")
        }); // end syncronous call

        let thisToken = result.logs[0].args.ints[0]

        return piggyInstance.getDetails(thisToken, {from: owner});
      })
      .then(result => {

        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details should have correct arbiter address.")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, collateral.toString(), "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, currentBlock.add(expiry).toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), '1', "getOwnedPiggies did not return correct piggies")
      });

    }); //end test block
  }); //end describe Create block

  //Test Create SmartPiggies fail cases
  describe("Testing Failure cases for Creating SmartPiggies tokens", function() {
    beforeEach(function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
    })

    it("Should fail to create a token if collateralERC is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            addr00,
            dataResolver,
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
    })

    it("Should fail to create if dataResolver is address(0)", function() {
      return expectedExceptionPromise(
          () => piggyInstance.createPiggy(
            collateralERC,
            addr00,
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
            dataResolver,
            addr00,
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
            dataResolver,
            addr00,
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
            dataResolver,
            addr00,
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
            dataResolver,
            addr00,
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
              dataResolver,
              addr00,
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

  //Test Splitting SmartPiggies
  describe("Testing Split functionality for a SmartPiggies token", function() {

    it("Should split a token", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
      currentBlock = web3.utils.toBN(0)
      origExpiry = web3.utils.toBN(0)
      let origToken, tokenSplit1, tokenSplit2
      let splitAmount = web3.utils.toBN(1 * decimals)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        origExpiry = result.logs[0].args.ints[4]
        origToken = result.logs[0].args.ints[0]
        return piggyInstance.splitPiggy(origToken, splitAmount, {from: owner})
      })
      .then(result => {
        //console.log(result.logs[0].args)

        //test first create event
        assert.isTrue(result.receipt.status, "create did not return true")
        assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
        assert.strictEqual(result.logs[0].args.addresses[3], addr00, "Event log from create didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.ints[0].toString(), "2", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.ints[1].toString(), collateral.sub(splitAmount).toString(), "Event log from create didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
        assert.strictEqual(result.logs[0].args.ints[4].toString(), origExpiry.toString(), "Event log from create didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.bools[0], "Event log from create didn't return false for isEuro")
        assert.isTrue(result.logs[0].args.bools[1], "Event log from create didn't return false for isPut")
        assert.isNotTrue(result.logs[0].args.bools[2], "Event log from create didn't return false for RFP")

        //test second create event
        assert.strictEqual(result.logs[1].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[1].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
        assert.strictEqual(result.logs[0].args.addresses[3], addr00, "Event log from create didn't return correct arbiter")
        assert.strictEqual(result.logs[1].args.ints[0].toString(), "3", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.ints[1].toString(), splitAmount.toString(), "Event log from create didn't return correct collateral")
        assert.strictEqual(result.logs[1].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lotSize")
        assert.strictEqual(result.logs[1].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
        assert.strictEqual(result.logs[1].args.ints[4].toString(), origExpiry.toString(), "Event log from create didn't return correct expiry")
        assert.isNotTrue(result.logs[1].args.bools[0], "Event log from create didn't return false for isEuro")
        assert.isTrue(result.logs[1].args.bools[1], "Event log from create didn't return false for isPut")
        assert.isNotTrue(result.logs[1].args.bools[2], "Event log from create didn't return false for RFP")

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].toString(), "2", "getOwnedPiggies did not return correct piggies")
        assert.strictEqual(result[1].toString(), "3", "getOwnedPiggies did not return correct piggies")

        tokenSplit1 = result[0]
        tokenSplit2 = result[1]

        return piggyInstance.getDetails(tokenSplit1, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolverNow address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, collateral.sub(splitAmount).toString(), "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, origExpiry.toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getDetails(tokenSplit2, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, splitAmount.toString(), "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, origExpiry.toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getDetails(origToken, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, addr00, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, addr00, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, addr00, "Details should have correct dataResolverNow address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, "0", "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, "0", "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, "0", "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "0", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isNotTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")
      })
      //end test block
    });

    it("Should split a token with low amount", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(5) // 5 wei
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      zeroParam = 0
      currentBlock = web3.utils.toBN(0)
      origExpiry = web3.utils.toBN(0)
      let origToken, tokenSplit1, tokenSplit2
      let splitAmount = collateral.div(three)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        origExpiry = result.logs[0].args.ints[4]
        origToken = result.logs[0].args.ints[0]
        return piggyInstance.splitPiggy(origToken, splitAmount, {from: owner})
      })
      .then(result => {
        //console.log(result.logs[0].args)

        //test first create event
        assert.isTrue(result.receipt.status, "create did not return true")
        assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
        assert.strictEqual(result.logs[0].args.addresses[3], addr00, "Event log from create didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.ints[0].toString(), "2", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.ints[1].toString(), collateral.sub(splitAmount).toString(), "Event log from create didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
        assert.strictEqual(result.logs[0].args.ints[4].toString(), origExpiry.toString(), "Event log from create didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.bools[0], "Event log from create didn't return false for isEuro")
        assert.isTrue(result.logs[0].args.bools[1], "Event log from create didn't return false for isPut")
        assert.isNotTrue(result.logs[0].args.bools[2], "Event log from create didn't return false for RFP")
        //test second create event
        assert.strictEqual(result.logs[1].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[1].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
        assert.strictEqual(result.logs[1].args.ints[0].toString(), "3", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.ints[1].toString(), splitAmount.toString(), "Event log from create didn't return correct collateral")
        assert.strictEqual(result.logs[1].args.ints[2].toString(), lotSize.toString(), "Event log from create didn't return correct lotSize")
        assert.strictEqual(result.logs[1].args.ints[3].toString(), strikePrice.toString(), "Event log from create didn't return correct strike")
        assert.strictEqual(result.logs[1].args.ints[4].toString(), origExpiry.toString(), "Event log from create didn't return correct expiry")
        assert.isNotTrue(result.logs[1].args.bools[0], "Event log from create didn't return false for isEuro")
        assert.isTrue(result.logs[1].args.bools[1], "Event log from create didn't return false for isPut")
        assert.isNotTrue(result.logs[1].args.bools[2], "Event log from create didn't return false for RFP")

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result[0].toString(), "2", "getOwnedPiggies did not return correct piggies")
        assert.strictEqual(result[1].toString(), "3", "getOwnedPiggies did not return correct piggies")

        tokenSplit1 = result[0]
        tokenSplit2 = result[1]

        return piggyInstance.getDetails(tokenSplit1, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolverNow address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, collateral.sub(splitAmount).toString(), "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, origExpiry.toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getDetails(tokenSplit2, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, owner, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, splitAmount.toString(), "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, origExpiry.toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getDetails(origToken, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, addr00, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, addr00, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, addr00, "Details should have correct dataResolverNow address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, "0", "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, "0", "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, "0", "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "0", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isNotTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

      })
      //end test block
    });

    //end describe Split block
  });

  //Test Split SmartPiggies fail cases
  describe("Testing Failure cases for Splitting SmartPiggies tokens", function() {
    beforeEach(function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 500
      isEuro = false
      isPut = true
      isRequest = false
      splitAmount = collateral.div(three)
    })

    it("Should fail to split a token if tokenId is 0", function() {

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId.sub(web3.utils.toBN(1)),
              splitAmount,
              {from: owner, gas: 8000000 }), //sending tokenId 0 should fail
            3000000);
      })
      //end test
    });

    it("Should fail to split if split amount equals collateral", function() {

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              collateral, // cannot split amount == collateral
              {from: owner, gas: 8000000 }), //sending tokenId 0 should fail
            3000000);
      })
      //end test
    });

    it("Should fail to split if split amount exceeds collateral", function() {

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              collateral.add(one), // cannot split amount == collateral
              {from: owner, gas: 8000000 }), //sending tokenId 0 should fail
            3000000);
      })
      //end test
    });

    it.skip("Should test for failure if writer is a zero address", function() {
        //end test
    });

    it("Should fail to split a token if RFP", function() {

      isRequest = true //create RFP

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(tokenId => {

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              splitAmount,
              {from: owner, gas: 8000000 }), //splitting RFP should fail
            3000000);
      })
      //end test
    });

    it.skip("Should test for failure if collateral is zero", function() {
        //end test
    });

    it("Should fail to split a token if sender is not the holder", function() {

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              splitAmount,
              {from: user01, gas: 8000000 }), //splitting from a non-holder should fail
            3000000);
      })
      //end test
    });

    it("Should test for failure if expired", function() {

      expiry = 5 //create a soon to be expired token
      currentBlock = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")

        //burn some blocks
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
          () => Promise.resolve(tokenInstance.mint(user01, 500, {from: owner})),
        ])
      })
      .then(() => {
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        web3.eth.getBlockNumberPromise()
        .then(block => {
          currentBlock = web3.utils.toBN(block) // will be mined in next block
        })

        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = web3.utils.toBN(result[1].expiry)
        assert.isTrue(expiryBlock.lt(currentBlock), "expiry block should be less than current block")

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              splitAmount,
              {from: owner, gas: 8000000 }), //splitting an expired token should fail
            3000000);
      })
        //end test
    });

    it("Should test for failure if on auction", function() {
      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = web3.utils.toBN(100)
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)
      startBlock = web3.utils.toBN(0)
      balanceBefore = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        assert.strictEqual(tokenId.toString(), "1", "token ID is not 1")

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              splitAmount,
              {from: owner, gas: 8000000 }), //splitting a token on auction should fail
            3000000);
      })
        //end test
    });

    it("Should test for failure if cleared", function() {
      oracleFee = web3.utils.toBN('1000000000000000000')
      strikePriceBN = web3.utils.toBN(strikePrice)
      settlementPriceBN = web3.utils.toBN('0')
      ownerBalanceBefore = web3.utils.toBN('0')
      userBalanceBefore = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        tokenId = result.logs[0].args.ints[0]
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})),
          () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        ])
      })
      .then(() => {
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")

        return expectedExceptionPromise(
            () => piggyInstance.splitPiggy(
              tokenId,
              splitAmount,
              {from: owner, gas: 8000000 }), //splitting a token that has been cleared should fail
            3000000);
      })
        //end test
    });


  //end describe Failure block
  });

  //Test Create Request For Piggy (RFP)
  describe("Testing RFP functionality", function() {

    it("Should create an RFP token", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = true //create RFP

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.strictEqual(result.logs[0].event, "CreatePiggy", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.addresses[0], owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.addresses[1], collateralERC, "Event log from create didn't return correct collateral address")
        assert.strictEqual(result.logs[0].args.addresses[2], dataResolver, "Event log from create didn't return correct resolver")
        assert.strictEqual(result.logs[0].args.addresses[3], addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.ints[0].toString(), "1", "Event log from create didn't return correct tokenId")
        assert.isTrue(result.logs[0].args.bools[2], "Event log from create didn't return true for RFP")

        return piggyInstance.getDetails(1, {from: owner});
      })
      .then(result => {

        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolverNow address.");
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.");
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), '1', "getOwnedPiggies didn't return correct piggies")
      })
      //end test block
    });

    it("Should update collateralERC address of an RFP token", function() {

      updatedCollateralERC = "0x1230000000000000000000000000000000000000"
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        return piggyInstance.updateRFP(
          tokenId,
          updatedCollateralERC,
          addr00,
          addr00,
          paramZero,
          paramZero,
          paramZero,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, updatedCollateralERC, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolverNow")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), '0', "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), '0', "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, updatedCollateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolverNow address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

      })
      //end test block
    });

    it("Should update dataResolver address of an RFP token", function() {

      updatedDataResolver = "0x1230000000000000000000000000000000000000"
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          updatedDataResolver,
          addr00,
          paramZero,
          paramZero,
          paramZero,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, updatedDataResolver, "Event log from update didn't return correct dataResolverNow")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), '0', "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), '0', "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, updatedDataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

      })
      //end test block
    });

    it("Should update arbiter address of an RFP token", function() {

      updatedArbiter = "0x1230000000000000000000000000000000000000"
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.");
        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          updatedArbiter,
          paramZero,
          paramZero,
          paramZero,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolverNow")
        assert.strictEqual(result.logs[0].args.arbiter, updatedArbiter, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), '0', "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), '0', "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, updatedArbiter, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

      })
      //end test block
    });

    it("Should update collateral of an RFP token", function() {

      updatedCollateral = web3.utils.toBN(200 * decimals)
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have correct reqCollaterial amount.");

        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          updatedCollateral,
          paramZero,
          paramZero,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), updatedCollateral.toString(), "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), '0', "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, owner, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, collateralERC, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, dataResolver, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")

        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, updatedCollateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")

        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")

        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

      })
      //end test block
    });

    it("Should update lotSize of an RFP token", function() {

      updatedLotSize = 100
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")

        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          paramZero,
          updatedLotSize,
          paramZero,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC.toString(), addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver.toString(), addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), '0', "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), updatedLotSize.toString(), "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), '0', "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result[2].isRequest, "Details should have returned true for isRequest.")
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, updatedLotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
      })
      //end test block
    });

    it("Should update strikePrice of an RFP token", function() {

      updatedStrikePrice = 29000
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct lotSize amount.");
        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          paramZero,
          paramZero,
          updatedStrikePrice,
          paramZero,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), "0", "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), updatedStrikePrice.toString(), "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, updatedStrikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
      })
      //end test block
    });

    it("Should update expiry of an RFP token", function() {

      updatedExpiry = web3.utils.toBN(100) // add 100 blocks to the expiry block
      paramZero = 0
      currentBlock = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result

        web3.eth.getBlockNumberPromise()
        .then(block => {
          currentBlock = web3.utils.toBN(block) // will be mined in next block
        })

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[1].expiry, currentBlock.add(expiry).toString(), "Details should have correct lotSize amount.");

        web3.eth.getBlockNumberPromise()
        .then(block => {
          currentBlock = web3.utils.toBN(block).add(web3.utils.toBN(1)) // will be mined in next block
        })

        assert.strictEqual(result[1].expiry, currentBlock.add(expiry).toString(), "Details should have correct lotSize amount.");
        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          paramZero,
          paramZero,
          paramZero,
          updatedExpiry,
          isEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), "0", "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), "0", "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), currentBlock.add(updatedExpiry).toString(), "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].expiry, currentBlock.add(updatedExpiry).toString(), "Details should have correct expiry amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
      })
      //end test block
    });

    it("Should update Style of an RFP token", function() {

      updatedIsEuro = true
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")

        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          paramZero,
          paramZero,
          paramZero,
          paramZero,
          updatedIsEuro,
          isPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), "0", "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), "0", "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isTrue(result.logs[0].args.isEuro, "updateRFP did not return true for isEuro")
        assert.isTrue(result.logs[0].args.isPut, "updateRFP did not return true for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isTrue(result[2].isEuro, "Details should have returned true for isEuro.")
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
      })
      //end test block
    });

    it("Should update Direction of an RFP token", function() {

      updatedIsPut = false
      paramZero = 0

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "Create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        tokenId = result
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result[2].isPut, "Details should have returned true for isPut.")

        return piggyInstance.updateRFP(
          tokenId,
          addr00,
          addr00,
          addr00,
          paramZero,
          paramZero,
          paramZero,
          paramZero,
          isEuro,
          updatedIsPut,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "updateRFP did not return true")
        assert.strictEqual(result.logs[0].event, "UpdateRFP", "Event log from update didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from update didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from update didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.collateralERC, addr00, "Event log from update didn't return correct collaterialERC")
        assert.strictEqual(result.logs[0].args.dataResolver, addr00, "Event log from update didn't return correct dataResolver")
        assert.strictEqual(result.logs[0].args.arbiter, addr00, "Event log from update didn't return correct arbiter")
        assert.strictEqual(result.logs[0].args.reqCollateral.toString(), "0", "Event log from update didn't return correct collateral")
        assert.strictEqual(result.logs[0].args.lotSize.toString(), "0", "Event log from update didn't return correct lotSize")
        assert.strictEqual(result.logs[0].args.strikePrice.toString(), "0", "Event log from update didn't return correct strikePrice")
        assert.strictEqual(result.logs[0].args.expiry.toString(), "0", "Event log from update didn't return correct expiry")
        assert.isNotTrue(result.logs[0].args.isEuro, "updateRFP did not return false for isEuro")
        assert.isNotTrue(result.logs[0].args.isPut, "updateRFP did not return false for isPut")

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, lotSize.toString(), "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, strikePrice.toString(), "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, collateral.toString(), "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "18", "Details should have returned collateralDecimals amount of 18.")
        //check BoolFlags
        assert.isTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned true for isEuro.")
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
      })

    }); //end test block
  }); //end describe RFP block

  //Test American Put
  describe("Testing American Put functionality", function() {

    it("Should create an American Put piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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
      user01BalanceBefore = web3.utils.toBN('0')
      user02BalanceBefore = web3.utils.toBN('0')
      feeBalanceBefore = web3.utils.toBN('0')

      feePercent = web3.utils.toBN('0')
      resolution = web3.utils.toBN('0')
      fee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: user01}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true")
        //mint link tokens for user01
        return linkInstance.mint(user02, supply, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint function did not return true")
        //approve LINK transfer on behalf of the new holder (user01)
        return linkInstance.approve(resolverInstance.address, approveAmount, {from: user02})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve function did not return true")
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01})
      })
      .then(result => {
        settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
        assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly")
        //get the ERC20 balance for the writer
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01})
      })
      .then(result => {
        user01BalanceBefore = result
        //get the ERC20 balance for the holder
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: user02})
      })
      .then(result => {
        user02BalanceBefore = result
        return piggyInstance.settlePiggy(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true")
        /* get fee percent */
        return piggyInstance.feePercent.call({from: owner})
      })
      .then(result => {
        feePercent = web3.utils.toBN(result)
        return piggyInstance.feeResolution.call({from: owner})
      })
      .then(result => {
        resolution = web3.utils.toBN(result)
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize)

        //we are 100x off because of the cents inclusion in the price
        payout = strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).idivn(100)
        fee = payout.mul(feePercent).div(resolution)

        assert.strictEqual(balance.toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "writer balance did not return 0")
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), user02BalanceBefore.add(payout).sub(fee).toString(), "holder balance did not return correctly")
        return piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), feeBalanceBefore.add(fee).toString(), "fee address didn't return correct balance")
      });

    }); //end test block
  }); //end describe American Put block

  //Test American Put with split payout
  describe("Test an American Put piggy with split payout", function() {

    it("Should create an American Put piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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
      user01BalanceBefore = web3.utils.toBN('0')
      user02BalanceBefore = web3.utils.toBN('0')
      feeBalanceBefore = web3.utils.toBN('0')

      feePercent = web3.utils.toBN('0')
      resolution = web3.utils.toBN('0')
      fee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: user01}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner})
      })
      .then(result => {
        //use last tokenId created
        tokenId = result

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.transferFrom(user01, user02, tokenId, {from: user01})), // [0]
          () => Promise.resolve(linkInstance.mint(user02, supply, {from: owner})), // [1]
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user02})), // [2]
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02})), // [3]
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), // 4
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, collateralERC, {from: owner})), // [5]
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, collateralERC, {from: owner})), // [6]
          () => Promise.resolve(piggyInstance.getERC20Balance(user02, collateralERC, {from: owner})), // [7]
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})), // [8]
          () => Promise.resolve(piggyInstance.feePercent.call({from: owner})), // [9]
          () => Promise.resolve(piggyInstance.feeResolution.call({from: owner})), // [10]
        ])
      })
      .then(result => {

        assert.isTrue(result[0].receipt.status, "transfer function did not return true")
        assert.isTrue(result[1].receipt.status, "mint function did not return true")
        assert.isTrue(result[2].receipt.status, "approve function did not return true")
        assert.isTrue(result[3].receipt.status, "requestSettlementPrice function did not return true")
        settlementPriceBN = web3.utils.toBN(result[4][1].settlementPrice)
        assert.strictEqual(result[4][1].settlementPrice, '27000', "settlementPrice did not return correctly")

        feeBalanceBefore = result[5]
        user01BalanceBefore = result[6]
        user02BalanceBefore = result[7]

        assert.isTrue(result[8].receipt.status, "settlePiggy function did not return true")

        feePercent = result[9]
        feeResolution = result[10]

        return piggyInstance.getERC20Balance(user01, collateralERC, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize)
        //console.log(JSON.stringify(strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).toString(), null, 4))
        payout = strikePriceBN.sub(settlementPriceBN).mul(lotSizeBN).mul(decimals).idivn(100)
        fee = payout.mul(feePercent).div(feeResolution)
        assert.strictEqual(balance.toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "owner balance did not return 0")
        return piggyInstance.getERC20Balance(user02, collateralERC, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), user02BalanceBefore.add(payout).sub(fee).toString(), "owner balance did not return 0")
        return piggyInstance.getERC20Balance(feeAddress, collateralERC, {from: owner})
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), feeBalanceBefore.add(fee).toString(), "feeAddress balance did not return correctly")
      })

    }); //end test block
  }); //end describe block

  //Test transferFrom function
  describe("Testing Transfer functionality, Create an American Put piggy and transfer it", function() {

    it("Should transfer an American Put piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        //test events
        assert.strictEqual(result.logs[0].event, "StartAuction", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.startPrice.toString(), startPrice.toString(), "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.reservePrice.toString(), reservePrice.toString(), "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.auctionLength.toString(), auctionLength.toString(), "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.timeStep.toString(), timeStep.toString(), "Event log from create didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.priceStep.toString(), priceStep.toString(), "Event log from create didn't return correct tokenId")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, startPrice, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, startPrice, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: user01})),
          () => Promise.resolve(piggyInstance.getAuctionDetails(tokenId, {from: owner})),
        ])
      })
      .then(result => {
        balanceBefore = result[2]
        expiryBlock = result[3].expiryBlock

        assert.strictEqual(result[3].startBlock.toString(), startBlock.toString(), "getAuctionDetails did not return the correct start block")
        assert.strictEqual(result[3].expiryBlock.toString(), startBlock.add(auctionLength).toString(), "getAuctionDetails did not return the correct expiry block")
        assert.strictEqual(result[3].startPrice.toString(), startPrice.toString(), "getAuctionDetails did not return the correct start price")
        assert.strictEqual(result[3].timeStep.toString(), timeStep.toString(), "getAuctionDetails did not return the correct time step")
        assert.strictEqual(result[3].priceStep.toString(), priceStep.toString(), "getAuctionDetails did not return the correct price step")
        assert.isTrue(result[3].auctionActive, "getAuctionDetails did not return true for auction active")
        assert.isNotTrue(result[3].satisfyInProgress, "getAuctionDetails did not return false for satisfyInProgress")

        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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

        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
        assert.strictEqual(balanceNow.toString(), balanceBefore.sub(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should auction an RFP token", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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

        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
              {from: user01, gas: 8000000 }), //transaction from user01 rather than owner
            3000000);
      })
      //end test
    });

    it("Should fail to auction if piggy is expired", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if auction will expire after piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if piggy has been cleared", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if already on auction", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
              {from: owner, gas: 8000000 }),
            3000000);
      })
      //end test
    });

    it("Should fail to auction if RFP premium transfer fails", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
              tokenId,startPrice,reservePrice,
              auctionLength,timeStep,priceStep,
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        assert.strictEqual(result.logs[0].event, "EndAuction", "Event log from create didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from create didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from create didn't return correct tokenId")
        assert.isNotTrue(result.logs[0].args.RFP, "Event log from create didn't return false for RFP")

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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(() => {
        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
        .then(result => {
          ownerBalanceBefore = web3.utils.toBN(result[2])
          userBalanceBefore = web3.utils.toBN(result[3])
        })
      })
      .then(() => {
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock
        startBlock = web3.utils.toBN(result.startBlock)
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        //test events
        //Transfer Event
        assert.strictEqual(result.logs[0].event, "TransferPiggy", "Event log from satisfy didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from transfer didn't return correct sender")
        assert.strictEqual(result.logs[0].args.to, user01, "Event log from transfer didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from transfer didn't return correct tokenId")
        //Satisfy Event
        assert.strictEqual(result.logs[1].event, "SatisfyAuction", "Event log from satisfy didn't return correct event name")
        assert.strictEqual(result.logs[1].args.from, user01, "Event log from satisfy didn't return correct sender")
        assert.strictEqual(result.logs[1].args.tokenId.toString(), "1", "Event log from satisfy didn't return correct tokenId")
        //assert.strictEqual(result.logs[0].args.paidPremium.toString(), startPrice.toString(), "Event log from create didn't return correct tokenId")
        //assert.strictEqual(result.logs[0].args.change.toString(), reservePrice.toString(), "Event log from create didn't return correct tokenId")
        //assert.strictEqual(result.logs[0].args.auctionPremium.toString(), auctionLength.toString(), "Event log from create didn't return correct tokenId")

        eventPricePaid = web3.utils.toBN(result.logs[1].args.paidPremium)
        eventChangePaid = web3.utils.toBN(result.logs[1].args.change)
        eventAuctionPremium = web3.utils.toBN(result.logs[1].args.auctionPremium)

        return web3.eth.getBlockNumberPromise()
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
        assert.strictEqual(eventPricePaid.toString(), auctionPrice.toString(), "Event log from satisfy didn't return correct price paid")
        assert.strictEqual(eventChangePaid.toString(), "0", "Event log from satisfy didn't return correct change paid")
        assert.strictEqual(eventAuctionPremium.toString(), auctionPrice.toString(), "Event log from satisfy didn't return correct auction premium")

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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(() => {
        //get balances
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
        .then(result => {
          ownerBalanceBefore = web3.utils.toBN(result[2])
          userBalanceBefore = web3.utils.toBN(result[3])
        })
      })
      .then(() => {
        return piggyInstance.getAuctionDetails(tokenId, {from: owner})
      })
      .then(result => {
        expiryBlock = result.expiryBlock
        startBlock = web3.utils.toBN(result.startBlock)
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        //Satisfy Event
        assert.strictEqual(result.logs[0].event, "SatisfyAuction", "Event log from satisfy didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, user01, "Event log from satisfy didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), "1", "Event log from satisfy didn't return correct tokenId")

        eventPricePaid = web3.utils.toBN(result.logs[0].args.paidPremium)
        eventChangePaid = web3.utils.toBN(result.logs[0].args.change)
        eventAuctionPremium = web3.utils.toBN(result.logs[0].args.auctionPremium)

        return web3.eth.getBlockNumberPromise()
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
        assert.strictEqual(eventPricePaid.toString(), auctionPrice.toString(), "Event log from satisfy didn't return correct price paid")
        assert.strictEqual(eventChangePaid.toString(), reservePrice.sub(auctionPrice).toString(), "Event log from satisfy didn't return correct change paid")
        assert.strictEqual(eventAuctionPremium.toString(), auctionPrice.toString(), "Event log from satisfy didn't return correct premium")

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
        assert.strictEqual(result[0].toString(), ownerBalanceBefore.add(reservePrice).sub(auctionPrice).toString(), "Owner balance did not return correctly")
        assert.strictEqual(result[1].toString(), userBalanceBefore.sub(collateral).add(auctionPrice).toString(), "User balance did not return correctly")
      })
      //end test block
    });

    it("Should reset auction params if auction is expired for satisfy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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

        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
              zeroNonce,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it("Should fail to satisfy an auction that has already been satisfied", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
              zeroNonce,
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
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "satisfyAuction did not return true")

        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice did not return true")
        //Oracle Event
        assert.strictEqual(result.logs[0].event, "OracleReturned", "Event log from oracle didn't return correct event name")
        assert.strictEqual(result.logs[0].args.resolver, dataResolver, "Event log from oracle didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from oracle didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.price.toString(), oraclePrice.toString(), "Event log from oracle didn't return correct tokenId")

        //Satisfy Event
        assert.strictEqual(result.logs[1].event, "RequestSettlementPrice", "Event log from request didn't return correct event name")
        assert.strictEqual(result.logs[1].args.feePayer, user01, "Event log from request didn't return correct sender")
        assert.strictEqual(result.logs[1].args.tokenId.toString(), tokenId.toString(), "Event log from request didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.oracleFee.toString(), oracleFee.toString(), "Event log from request didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.dataResolver.toString(), dataResolver, "Event log from request didn't return correct tokenId")

        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
        assert.strictEqual(result[1].settlementPrice, oraclePrice.toString(), "settlementPrice did not return correctly")
      })
      //end test block
    });

    it("Should clear an if oracle fee is zero", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      oracleFeeZero = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "satisfyAuction did not return true")

        return piggyInstance.requestSettlementPrice(tokenId, oracleFeeZero, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice did not return true")
        //Oracle Event
        assert.strictEqual(result.logs[0].event, "OracleReturned", "Event log from oracle didn't return correct event name")
        assert.strictEqual(result.logs[0].args.resolver, dataResolver, "Event log from oracle didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from oracle didn't return correct tokenId")
        assert.strictEqual(result.logs[0].args.price.toString(), oraclePrice.toString(), "Event log from oracle didn't return correct tokenId")

        //Satisfy Event
        assert.strictEqual(result.logs[1].event, "RequestSettlementPrice", "Event log from request didn't return correct event name")
        assert.strictEqual(result.logs[1].args.feePayer, user01, "Event log from request didn't return correct sender")
        assert.strictEqual(result.logs[1].args.tokenId.toString(), tokenId.toString(), "Event log from request didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.oracleFee.toString(), oracleFeeZero.toString(), "Event log from request didn't return correct tokenId")
        assert.strictEqual(result.logs[1].args.dataResolver.toString(), dataResolver, "Event log from request didn't return correct tokenId")

        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //settlementPriceBN = web3.utils.toBN(result[1].settlementPrice)
        assert.strictEqual(result[1].settlementPrice, oraclePrice.toString(), "settlementPrice did not return correctly")
      })
      //end test block
    });

    it("Should clear a European Put piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5 // European has to be cleared after expiry
      isEuro = true  // create a European style piggy
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3 // Auction cannot expire after the piggy
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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

    it("Should fail to clear if piggy is on auction", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        // Do not satisfy Action -> Auction is still active
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              oracleFee,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it("Should fail to clear a piggy if it has already been cleared", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
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
        assert.strictEqual(result[1].settlementPrice, oraclePrice.toString(), "settlementPrice did not return correctly")
        assert.isTrue(result[2].hasBeenCleared, "hasBeenCleared did not return true")

        //Try to clear it again
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              oracleFee,
              {from: user01, gas: 8000000 }),
            3000000);
      })
      //end test block
    });

    it("Should fail to clear if piggy Id is Zero", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              0,
              oracleFee,
              {from: user01, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it.skip("Should fail to clear if oracle fee is Zero", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              0,
              {from: user01, gas: 8000000 }), //transaction should fail
            3000000);
      })
      //end test block
    });

    it("Should fail to clear if European is called before expriy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = true  // create a European piggy
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              oracleFee,
              {from: user01, gas: 8000000 }), //transaction should fail
            3000000);
      })
      //end test block
    });

    it("Should fail to clear if America is called before expriy by anyone but holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user01, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user01})
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              oracleFee,
              {from: owner, gas: 8000000 }), //transaction should fail
            3000000);
      })
      //end test block
    });

    it("Should fail to clear if European is called before expriy by anyone", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = 5000
      isEuro = true
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
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
        return piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "satisfyAuction did not return true")
        return linkInstance.mint(user02, collateral, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint did not return true")
        return linkInstance.approve(resolverInstance.address, collateral, {from: user02})
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.requestSettlementPrice(
              tokenId,
              oracleFee,
              {from: owner, gas: 8000000 }), //transaction should fail
            3000000);

      });
      //end test block
    });

  //end describe Clearing block
  });

  describe("Testing Settle functionality for American style piggies", function() {

    it("Should settle an American Put piggy with payout to writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26900)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[7]
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[8]
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})) //[9]
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "Owner balance did not return 0")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not return 0")
      });
    }); //end test block

    it("Should emit correct Settle Event when writer is paid full", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26900)
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
        ])
      })
      .then(() => {
        return piggyInstance.settlePiggy(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy did not return true")
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

        /* no fee paid */
        assert.strictEqual(result.logs[0].args.holderPayout.toString(), payout.toString(), "Event log from settlement didn't return correct holder payout")
        assert.strictEqual(result.logs[0].args.writerPayout.toString(), collateral.sub(payout).toString(), "Event log from settlement didn't return correct writer payout")
      })
      //end test block
    });

    it("Should settle an American Put piggy payout to holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(28000)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      emptyArray = []

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[6]
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})) //[7]
        ])
      })
      .then(result => {
        assert.isTrue(result[5].receipt.status, "requestSettlementPrice did not return true")
        assert.strictEqual(result[6][1].settlementPrice, oraclePrice.toString(), "settlementPrice did not return correctly")
        assert.isTrue(result[7].receipt.status, "settlePiggy did not return true")
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.")
        assert.strictEqual(result[0].holder, addr00, "Details should have correct holder address.")
        assert.strictEqual(result[0].collateralERC, addr00, "Details should have correct collateralERC address.")
        assert.strictEqual(result[0].dataResolver, addr00, "Details should have correct dataResolver address.")
        assert.strictEqual(result[0].arbiter, addr00, "Details did not have correct arbiter address")
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "Details should have correct writerProposedNewArbiter address.")
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "Details should have correct holderProposedNewArbiter address.")
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.")
        assert.strictEqual(result[1].lotSize, "0", "Details should have correct lotSize amount.")
        assert.strictEqual(result[1].strikePrice, "0", "Details should have correct strikePrice amount.")
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.")
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.")
        assert.strictEqual(result[1].collateralDecimals, "0", "Details should have returned collateralDecimals amount of 18.")
        assert.strictEqual(result[1].arbitrationLock.toString(), "0", "Details did not return correct arbitrationLock")
        assert.strictEqual(result[1].writerProposedPrice.toString(), "0", "Details did not return correct writerProposedPrice")
        assert.strictEqual(result[1].holderProposedPrice.toString(), "0", "Details did not return correct holderProposedPrice")
        assert.strictEqual(result[1].arbiterProposedPrice.toString(), "0", "Details did not return correct arbiterProposedPrice")
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.")
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.")
        assert.isNotTrue(result[2].isPut, "Details should have returned true for isPut.")
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.")
        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "Details should have returned false for writerHasProposedNewArbiter.")
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "Details should have returned false for holderHasProposedNewArbiter.")
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.")
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "Details should have returned false for arbiterHasProposedPrice.")
        assert.isNotTrue(result[2].arbiterHasConfirmed, "Details should have returned false for arbiterHasConfirmed.")

        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        //Note returning result without .toString() will return an empty array
        assert.strictEqual(result.toString(), '', "getOwnedPiggies did not return correctly")
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[0].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        //put calculation for holder = payout
        assert.strictEqual(result[1].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[2].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
      });
    }); //end test block

    it("Should emit correct Settle Event when holder is paid full", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(28000)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})) //[6]
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")
        //Settle Event
        assert.strictEqual(result[6].logs[0].event, "SettlePiggy", "Event log from settlement didn't return correct event name")
        assert.strictEqual(result[6].logs[0].args.from, owner, "Event log from settlement didn't return correct sender")
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from settlement didn't return correct tokenId")

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
        assert.strictEqual(result[6].logs[0].args.holderPayout.toString(), payout.sub(serviceFee).toString(), "Event log from settlement didn't return correct holder payout")
        assert.strictEqual(result[6].logs[0].args.writerPayout.toString(), collateral.sub(payout).toString(), "Event log from settlement didn't return correct writer payout")
      });
    }); //end test block

    it("Should settle an American Put piggy with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(27100)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "95000000000000000000", "Owner balance did not return 95*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not update correctly")
      });
    }); //end test block

    it("Should emit correct Settle Event when holder with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(27100)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
        ])
      })
      .then(() => {
        return piggyInstance.settlePiggy(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy did not return true")
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
        serviceFee = payout.mul(DEFAULT_FEE_PERCENT).div(DEFAULT_FEE_RESOLUTION)
        assert.strictEqual(result.logs[0].args.holderPayout.toString(), payout.sub(serviceFee).toString(), "Event log from settlement didn't return correct holder payout")
        assert.strictEqual(result.logs[0].args.writerPayout.toString(), collateral.sub(payout).toString(), "Event log from settlement didn't return correct writer payout")
      });
    }); //end test block

    it("Should settle an American Put piggy with no payout, strike = settlement", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
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

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})) //[9]
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User01 balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "User01 balance did not return 0")
        assert.strictEqual(result[9].toString(), "0", "feeAddress balance did not return 0")
      });
    }); //end test block

    it("Should settle an American Call piggy with payout to writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(28000)
      expiry = 5000
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //call calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "Owner balance did not return 0")
      })
      //end test block
    });

    it("Should settle an American Call piggy with payout to holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26000)
      expiry = 5000
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
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "0", "Owner balance did not return 0")
        //call calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not update correctly")
      });
    }); //end test block

    it("Should settle an American Call piggy with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5000
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
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "75000000000000000000", "Owner balance did not return 75*10^18")
        //call calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "Owner balance did not return 25*10^18")
      });
    }); //end test block

    it("Should settle an American Call piggy with no payout, strike = settlement", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
      expiry = 5000
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //call calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //call calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "Owner balance did not return 0")
      });
    }); //end test block

    it("Should fail to settle a piggy for tokenId zero", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
      expiry = 5000
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
        ])
      })
      .then(result => {
        assert.isTrue(result[5].receipt.status, "requestSettlementPrice did not return true")
        return expectedExceptionPromise(
            () => piggyInstance.settlePiggy(
              0,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it("Should fail to settle a piggy if it has not been cleared", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
      expiry = 5000
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01}))
        ])
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.settlePiggy(
              0,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      });
      //end test block
    });
  //end describe Settle block
  });

  describe("Testing Settle functionality for European style piggies", function() {

    it("Should settle a European Put piggy with payout to writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26000)
      expiry = 5
      isEuro = true
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "Owner balance did not return 0")
      })
      //end test block
    });

    it("Should settle a European Put piggy with payout to holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(28000)
      expiry = 5
      isEuro = true
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "0", "Owner balance did not return 0")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
      });
    }); //end test block

    it("Should settle a European Put piggy with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(27100)
      expiry = 5
      isEuro = true
      isPut = true
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "95000000000000000000", "Owner balance did not return 95*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
      });
    }); //end test block

    it("Should settle a European Call piggy with payout to writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(28000)
      expiry = 5
      isEuro = true
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "100000000000000000000", "Owner balance did not return 100*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.toString(), "User balance did not update correctly")
        assert.strictEqual(result[8].toString(), "0", "Owner balance did not return 0")
      })
      //end test block
    });

    it("Should settle a European Call piggy with payout to holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26000)
      expiry = 5
      isEuro = true
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "0", "Owner balance did not return 0")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
      });
    }); //end test block

    it("Should settle a European Call piggy with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(26900)
      expiry = 5
      isEuro = true
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      serviceFee = web3.utils.toBN('0')

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

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
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[7].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly")
        assert.strictEqual(result[7].toString(), "95000000000000000000", "Owner balance did not return 95*10^18")
        //put calculation for holder = payout
        assert.strictEqual(result[8].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly")
        assert.strictEqual(result[9].toString(), serviceFee.toString(), "feeAddress balance did not return correctly")
      });
    }); //end test block

    it("Should fail to settle a piggy for tokenId zero", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
      expiry = 5
      isEuro = true
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
        ])
      })
      .then(result => {
        assert.isTrue(result[5].receipt.status, "requestSettlementPrice did not return true")
        return expectedExceptionPromise(
            () => piggyInstance.settlePiggy(
              0,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it("Should fail to settle a piggy if it has not been cleared", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(27000)
      expiry = 5
      isEuro = true
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 3
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01}))
        ])
      })
      .then(() => {
        return expectedExceptionPromise(
            () => piggyInstance.settlePiggy(
              0,
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

  //end describe Settle European block
  })

  describe("Testing Claim Payout functionality", function() {

    it("Should claim payouts for holder and writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5000
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

      ownerBalance = web3.utils.toBN(0)
      userBalance = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

        ownerBalanceInContract = result[7]
        userBalanceInContract = result[8]
        ownerStableTokenBalance = web3.utils.toBN(result[9])
        userStableTokenBalance = web3.utils.toBN(result[10])

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, ownerBalanceInContract, {from: owner})),
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, userBalanceInContract, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})),
        ])
      })
      .then(result => {
        assert.strictEqual(result[2].toString(), ownerStableTokenBalance.add(ownerBalanceInContract).toString(), "owner token balance didn't update correctly")
        assert.strictEqual(result[3].toString(), userStableTokenBalance.add(userBalanceInContract).toString(), "user token balance didn't update correctly")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[0].toString(), "0", "Contract balance for owner should have returned zero")
        assert.strictEqual(result[1].toString(), "0", "Contract balance for user should have returned zero")
      })
      //end test block
    });

    it("Should emit Event for the claim of payouts for writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5000
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")
        ownerBalanceInContract = result[7]
        return piggyInstance.claimPayout(tokenInstance.address, ownerBalanceInContract, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "claimPayout did not return true")
        //Settle Event
        assert.strictEqual(result.logs[0].event, "ClaimPayout", "Event log from claimPayout didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from claimPayout didn't return correct sender")
        assert.strictEqual(result.logs[0].args.amount.toString(), ownerBalanceInContract.toString(), "Event log from claimPayout didn't return correct amount")
        assert.strictEqual(result.logs[0].args.paymentToken, tokenInstance.address, "Event log from claimPayout didn't return correct payment token address")
      })
      //end test block
    });

    it("Should fail to claim payouts if amount is greater than contract balance", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(5)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5000
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

      ownerBalance = web3.utils.toBN(0)
      userBalance = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
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
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
          () => Promise.resolve(linkInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(linkInstance.approve(resolverInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner}))
        ])
      })
      .then(result => {
        assert.isTrue(result[6].receipt.status, "settlePiggy did not return true")

        ownerBalanceInContract = web3.utils.toBN(result[7])

        return expectedExceptionPromise(
            () => piggyInstance.claimPayout(
              tokenInstance.address,
              ownerBalanceInContract.mul(decimals),
              {from: owner, gas: 8000000 }), //transaction should fail from owner
            3000000);
      })
      //end test block
    });

    it.skip("Should fail if the ERC20 token transfer fails", function() {

      //test not implemented

      //end test block
    });

  //end describe Claim block
  });

  describe("Testing Token Indexing functionality", function() {

    it("Should add tokenId to ownedPiggiesIndex when there is a new owner", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      emptyArray = []

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "1", "getOwnedPiggies did not return correctly")

        return piggyInstance.startAuction(
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01}))
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "satisfyAuction did not return true")
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: owner}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[0][0].holder, user01, "getDetails didn't return correct holder of token")
        assert.strictEqual(result[1].toString(), '', "getOwnedPiggies did not return correct piggy count for owner")
        assert.strictEqual(result[2].toString(), "1", "getOwnedPiggies did not return correct piggy count for user01")
      })
      //end test block
    });

    it("Should add tokenId to ownedPiggiesIndex after multiple transfers of a piggy", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      emptyArray = []

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "1", "getOwnedPiggies did not return correctly")
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.transferFrom(user01, user02, tokenId, {from: user01})),
          () => Promise.resolve(piggyInstance.transferFrom(user02, owner, tokenId, {from: user02})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user02, {from: owner})),
        ])
      })
      .then(result => {
        assert.strictEqual(result[3].toString(), '1', "getOwnedPiggies did not return correctly for owner")
        assert.strictEqual(result[4].toString(), '', "getOwnedPiggies did not return correctly for user01")
        assert.strictEqual(result[5].toString(), '', "getOwnedPiggies did not return correctly for user02")

        return piggyInstance.startAuction(
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.mint(user01, collateral, {from: owner})),
          () => Promise.resolve(tokenInstance.approve(piggyInstance.address, collateral, {from: user01})),
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01}))
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "satisfyAuction did not return true")
        return sequentialPromise([
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: owner}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[0][0].holder, user01, "getDetails didn't return correct holder of token")
        assert.strictEqual(result[1].toString(), '', "getOwnedPiggies did not return correct piggy count for owner")
        assert.strictEqual(result[2].toString(), "1", "getOwnedPiggies did not return correct piggy count for user01")
      })
      //end test block
    });

    it("Should add tokenId to ownedPiggiesIndex for multiple piggies", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      emptyArray = []

      return sequentialPromise([
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, supply, {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],params[8],
          {from: owner})),
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],params[8],
          {from: owner})),
        () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
      ])
      .then(result => {
        assert.strictEqual(result[4].toString(), "1,2,3", "getOwnedPiggies did not return correctly for owner")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.transferFrom(owner, user01, "1", {from: owner})),
          () => Promise.resolve(piggyInstance.transferFrom(owner, user02, "2", {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user02, {from: owner})),
        ])
      })
      .then(result => {
        assert.strictEqual(result[2].toString(), "3", "getOwnedPiggies did not return correctly for owner")
        assert.strictEqual(result[3].toString(), "1", "getOwnedPiggies did not return correctly for user01")
        assert.strictEqual(result[4].toString(), "2", "getOwnedPiggies did not return correctly for user02")
      })
      //end test block
    });

  //end describe Indexing block
  })

  describe("Testing Reclaim And Burn functionality", function() {

    it("Should create a piggy then reclaim collaterial and burn", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "1", "getOwnedPiggies did not return correctly")

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
          () => Promise.resolve(piggyInstance.reclaimAndBurn(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(owner, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})),
        ])
      })
      .then(result => {
        balanceBefore = web3.utils.toBN(result[0])
        assert.strictEqual(result[3].toString(), balanceBefore.add(collateral).toString(), "owner balance did not update correctly")
        assert.strictEqual(result[2].toString(), '', "getOwnedPiggies did not return empty")
      })
      //end test block
    });

    it("Should emit event when reclaimed", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest]

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8],params[9],
        {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true")
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.getOwnedPiggies(owner, {from: owner})
      })
      .then(result => {
        assert.strictEqual(result.toString(), "1", "getOwnedPiggies did not return correctly")
        return piggyInstance.reclaimAndBurn(tokenId, {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "reclaimAndBurn did not return true")
        assert.strictEqual(result.logs[0].event, "ReclaimAndBurn", "Event log from reclaim didn't return correct event name")
        assert.strictEqual(result.logs[0].args.from, owner, "Event log from reclaim didn't return correct sender")
        assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId.toString(), "Event log from reclaim didn't return correct tokenId")
        assert.isNotTrue(result.logs[0].args.RFP, "Event log from reclaim did not return false for RFP")
      });

    }); //end test block
  }); //end describe Reclaim block

  describe.skip("Testing Zero Address on all functions", function() {
    // Ganache fails when a zero address is supplied
  //end describe Zero Address block
  });

}); //end uint test
