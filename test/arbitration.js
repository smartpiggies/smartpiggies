Promise = require("bluebird");
const StableToken = artifacts.require("./StableToken.sol");
const TestnetLINK = artifacts.require("./TestnetLINK.sol");
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
  let zeroParam = web3.utils.toBN(0);

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

  describe("Testing set arbitor functionality", function() {

    it("Should be able to set arbitor", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create status did not return true");

        /* get token id of created piggy */
        tokenId = result.logs[0].args[1][0].toString();
        return piggyInstance.setArbiter(tokenId, user01);
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "set arbiter status did not return true");
        assert.strictEqual(result.logs[0].event, "ArbiterSet", "Event logs did not return correct event name");
        assert.strictEqual(result.logs[0].args.from, owner, "Event log didn't return correct sender");
        assert.strictEqual(result.logs[0].args.arbiter, user01, "Event log didn't return correct arbiter param");
        assert.strictEqual(result.logs[0].args.tokenId.toString(), tokenId, "Event log didn't return correct token id param");

        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result[0].arbiter, user01, "arbitration did not return correct address");
        assert.isTrue(result[2].arbiterHasBeenSet, "arbiterHasBeenSet did not return true");
      });

    }); // end test block

    it("Should fail to set arbiter if sender is not the writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], {from: owner}
      )
      .then(result => {

      /* get token id of created piggy */
      tokenId = result.logs[0].args[1][0].toString();

      /* transaction should revert if sender is not owner */
      return expectedExceptionPromise(
        () => piggyInstance.setArbiter(
          tokenId, user01,
          {from: user01, gas: 8000000 }),
          3000000);
      })

    }); //end test block

    it("Should fail to set arbiter if sender is not the holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], {from: owner}
      )
      .then(result => {

        /* get token id of created piggy */
        tokenId = result.logs[0].args[1][0].toString();
        return piggyInstance.transferFrom(owner, user01, tokenId);
      })
      .then(result => {
        return piggyInstance.getDetails(tokenId);
      })
      .then(result => {
        assert.strictEqual(result[0].holder, user01, "token holder did not return correct address");

        /* transaction should revert if sender is not owner */
        return expectedExceptionPromise(
          () => piggyInstance.setArbiter(
            tokenId, user02,
            {from: user02, gas: 8000000 }),
            3000000);
      });

    }); //end test block

  }); //end describe block

  describe("Testing set arbitor functionality", function() {

    it("Should be able to update an arbiter", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
      ])
      .then(result => {
        assert.strictEqual(result[4].logs[0].event, "ArbiterSet", "event name did not return correctly");
        assert.strictEqual(result[4].logs[0].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[4].logs[0].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[4].logs[0].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result[2].holderHasProposedNewArbiter, "param did not return true");
        assert.isTrue(result[2].writerHasProposedNewArbiter, "param did not return true");
        assert.strictEqual(result[0].holderProposedNewArbiter, user03, "param did not return correct address");
        assert.strictEqual(result[0].writerProposedNewArbiter, user03, "param did not return correct address");
        assert.strictEqual(result[0].arbiter, user03, "param did not return correct address");
      });
    }); //end test block

    it("Should fail to update the arbiter if sender is not writer or holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
      ])
      .then(result => {
        return expectedExceptionPromise(
          () => piggyInstance.updateArbiter(
            tokenId, user03,
            {from: user04, gas: 8000000 }),
            3000000);
      });
    }); //end test block

  }); //end describe block

  describe("Testing arbitartion settlement", function() {

    it("Should be able to settle via arbitration between writer and holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: user01})), // [6]
      ])
      .then(result => {
        assert.strictEqual(result[6].logs[0].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[0].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[0].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[0].args.holderShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        assert.strictEqual(result[6].logs[0].args.writerShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out
        ** result.address = result[0]
        ** result.uintDetails = result[1]
        ** result.flags = result[2]
        */
        /* addresses */
        assert.strictEqual(result.addresses.writer, addr00, "writer param did not return address zero");
        assert.strictEqual(result.addresses.writer, addr00, "holder param did not return address zero");
        assert.strictEqual(result.addresses.arbiter, addr00, "arbiter param did not return address zero");
        assert.strictEqual(result.addresses.collateralERC, addr00, "collateral param did not return address zero");
        assert.strictEqual(result.addresses.dataResolver, addr00, "collateral param did not return address zero");
        assert.strictEqual(result.addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result.addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        /* uint details */
        assert.strictEqual(result.uintDetails.collateral, zeroParam.toString(), "collateral did not return address zero");
        assert.strictEqual(result.uintDetails.lotSize, zeroParam.toString(), "lotSize did not return address zero");
        assert.strictEqual(result.uintDetails.strikePrice, zeroParam.toString(), "strikePrice did not return address zero");
        assert.strictEqual(result.uintDetails.expiry, zeroParam.toString(), "expiry did not return address zero");
        assert.strictEqual(result.uintDetails.settlementPrice, zeroParam.toString(), "settlementPrice did not return address zero");
        assert.strictEqual(result.uintDetails.reqCollateral, zeroParam.toString(), "reqCollateral did not return address zero");
        assert.strictEqual(result.uintDetails.collateralDecimals, zeroParam.toString(), "collateralDecimals did not return address zero");
        assert.strictEqual(result.uintDetails.arbitrationLock, zeroParam.toString(), "arbitrationLock did not return address zero");
        assert.strictEqual(result.uintDetails.arbiterProposedShare, zeroParam.toString(), "arbiterProposedShare did not return address zero");
        assert.strictEqual(result.uintDetails.writerProposedShare, zeroParam.toString(), "writerProposedShare did not return address zero");
        assert.strictEqual(result.uintDetails.holderProposedShare, zeroParam.toString(), "holderProposedShare did not return address zero");
        /* boolean flags*/
        assert.isNotTrue(result.flags.isRequest, "isRequest did not return false");
        assert.isNotTrue(result.flags.isEuro, "isEuro did not return false");
        assert.isNotTrue(result.flags.isPut, "isPut did not return false");
        assert.isNotTrue(result.flags.hasBeenCleared, "hasBeenCleared did not return false");
        assert.isNotTrue(result.flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result.flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.arbiterHasProposedShare, "arbiterHasProposedShare did not return false");
        assert.isNotTrue(result.flags.writerHasProposedShare, "writerHasProposedShare did not return false");
        assert.isNotTrue(result.flags.holderHasProposedShare, "holderHasProposedShare did not return false");

        return piggyInstance.getERC20balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "user's ERC20 balance did not return correctly");

        /* check piggy struct has been zero'ed */
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, addr00, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, addr00, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].dataResolver, addr00, "Details should have correct dataResolver address.");
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, "0", "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, "0", "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "0", "Details should have returned collateralDecimals amount of 18.");
        assert.strictEqual(result[1].writerProposedShare, "0", "Details should have returned collateralDecimals amount of 18.");
        assert.strictEqual(result[1].holderProposedShare, "0", "Details should have returned collateralDecimals amount of 18.");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedShare, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].holderHasProposedShare, "Details should have returned false for hasBeenCleared.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})

      })
      .then(result => {
        //Note returning result without .toString() will return an empty array
        assert.strictEqual(result.toString(), '', "getOwnedPiggies did not return correctly");
      });
    }); //end test block

    it("Should be able to settle via arbitration between writer and arbiter", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: user03})), // [6]
      ])
      .then(result => {
        assert.strictEqual(result[6].logs[0].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[0].args.from, user03, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[0].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[0].args.holderShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        assert.strictEqual(result[6].logs[0].args.writerShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out */
        assert.strictEqual(result.addresses.arbiter, addr00, "arbiter struct param did not return address zero");
        assert.strictEqual(result.addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result.addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        assert.strictEqual(result.uintDetails.arbiterProposedShare, zeroParam.toString(), "arbiterProposedShare did not return address zero");
        assert.strictEqual(result.uintDetails.writerProposedShare, zeroParam.toString(), "writerProposedShare did not return address zero");
        assert.strictEqual(result.uintDetails.holderProposedShare, zeroParam.toString(), "holderProposedShare did not return address zero");
        assert.isNotTrue(result.flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result.flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.arbiterHasProposedShare, "arbiterHasProposedShare did not return false");
        assert.isNotTrue(result.flags.writerHasProposedShare, "writerHasProposedShare did not return false");
        assert.isNotTrue(result.flags.holderHasProposedShare, "holderHasProposedShare did not return false");

        return piggyInstance.getERC20balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "user's ERC20 balance did not return correctly");

        /* check piggy struct has been zero'ed */
        return piggyInstance.getDetails(tokenId, {from: owner})
      })
      .then(result => {
        //check DetailAddresses
        assert.strictEqual(result[0].writer, addr00, "Details should have correct writer address.");
        assert.strictEqual(result[0].holder, addr00, "Details should have correct holder address.");
        assert.strictEqual(result[0].collateralERC, addr00, "Details should have correct collateralERC address.");
        assert.strictEqual(result[0].dataResolver, addr00, "Details should have correct dataResolver address.");
        //check DetailUints
        assert.strictEqual(result[1].collateral, "0", "Details should have correct collateral amount.");
        assert.strictEqual(result[1].lotSize, "0", "Details should have correct lotSize amount.");
        assert.strictEqual(result[1].strikePrice, "0", "Details should have correct strikePrice amount.");
        assert.strictEqual(result[1].settlementPrice, "0", "Details should have returned settlementPrice amount of 0.");
        assert.strictEqual(result[1].reqCollateral, "0", "Details should have returned reqCollateral amount of 0.");
        assert.strictEqual(result[1].collateralDecimals, "0", "Details should have returned collateralDecimals amount of 18.");
        assert.strictEqual(result[1].writerProposedShare, "0", "Details should have returned collateralDecimals amount of 18.");
        assert.strictEqual(result[1].holderProposedShare, "0", "Details should have returned collateralDecimals amount of 18.");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedShare, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].holderHasProposedShare, "Details should have returned false for hasBeenCleared.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})

      })
      .then(result => {
        //Note returning result without .toString() will return an empty array
        assert.strictEqual(result.toString(), '', "getOwnedPiggies did not return correctly");
      });
    }); //end test block

    it("Should be able to settle via arbitration between holder and arbiter", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: user01})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, shareAmount, {from: user03})), // [6]
      ])
      .then(result => {
        assert.strictEqual(result[6].logs[0].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[0].args.from, user03, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[0].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[0].args.holderShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        assert.strictEqual(result[6].logs[0].args.writerShare.toString(), shareAmount.toString(), "event param did not return correct share amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out */
        assert.strictEqual(result[0].arbiter, addr00, "arbiter struct param did not return address zero");
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        assert.strictEqual(result[1].arbiterProposedShare, zeroParam.toString(), "arbiterProposedShare did not return address zero");
        assert.strictEqual(result[1].writerProposedShare, zeroParam.toString(), "writerProposedShare did not return address zero");
        assert.strictEqual(result[1].holderProposedShare, zeroParam.toString(), "holderProposedShare did not return address zero");
        assert.isNotTrue(result[2].arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[2].arbiterHasProposedShare, "arbiterHasProposedShare did not return false");
        assert.isNotTrue(result[2].writerHasProposedShare, "writerHasProposedShare did not return false");
        assert.isNotTrue(result[2].holderHasProposedShare, "holderHasProposedShare did not return false");

        return piggyInstance.getERC20balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), shareAmount.toString(), "user's ERC20 balance did not return correctly");
      });
    }); //end test block

    it.skip("Should fail to settle via arbitartion if arbiter has not been set", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [2]
      ])
      .then(result => {
        assert.strictEqual(result[2][0].holder, user01, "holder did not return correct address");

        /* should fail */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId, shareAmount,
            {from: user01, gas: 8000000 }),
            3000000);
      });
    }); //end test block

    it("Should fail if share amount is over collateral", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.mul(web3.utils.toBN(2)); // share amount is double collateral

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [3]
      ])
      .then(result => {
        assert.strictEqual(result[3].addresses.arbiter, user02, "arbiter did not return correct address");

        /* should fail */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId, shareAmount,
            {from: user01, gas: 8000000 }),
            3000000);
      });
    }); //end test block

    it("Should fail to settle via arbitartion if sender is not writer, holder, or arbiter", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500)
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.setArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [3]
      ])
      .then(result => {
        assert.strictEqual(result[3][0].writer, owner, "writer did not return correct address");
        assert.strictEqual(result[3][0].holder, user01, "holder did not return correct address");
        assert.strictEqual(result[3][0].arbiter, user02, "arbiter did not return correct address");

        /* should fail */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId, shareAmount,
            {from: user03, gas: 8000000 }),
            3000000);
      });
    }); //end test block

  }); //end describe block


}); // end test suite
