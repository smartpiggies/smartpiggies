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
  let helperInstance
  let piggyInstance;
  let resolverInstance;
  let owner = accounts[0];
  let user01 = accounts[1];
  let user02 = accounts[2];
  let user03 = accounts[3];
  let user04 = accounts[4];
  var feeAddress = accounts[5];
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
  let zeroNonce = web3.utils.toBN(0);

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
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner}))
      ]);
    });
  });

  describe("Testing set arbitor functionality", function() {

    it("Should be able to set arbitor", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], params[9], {from: owner}
      )
      .then(result => {
        assert.isTrue(result.receipt.status, "create status did not return true");

        /* get token id of created piggy */
        tokenId = result.logs[0].args[1][0].toString();
        return piggyInstance.updateArbiter(tokenId, user01);
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
        // this is a require in the smart contract, i.e. arbiter != address(0)
        assert.isNotTrue(result[2].arbiter, addr00, "arbiter address should did not return a zero address");
        assert.strictEqual(result[0].arbiter, user01, "arbitration did not return correct address");
      });

    }); // end test block

    it("Should fail to set arbiter if sender is not the writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], params[9], {from: owner}
      )
      .then(result => {

      /* get token id of created piggy */
      tokenId = result.logs[0].args[1][0].toString();

      /* transaction should revert if sender is not writer */
      return expectedExceptionPromise(
        () => piggyInstance.updateArbiter(
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
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 0;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.createPiggy(
        params[0],params[1],params[2],params[3],
        params[4],params[5],params[6],params[7],
        params[8], params[9], {from: owner}
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
          () => piggyInstance.updateArbiter(
            tokenId, user02,
            {from: user02, gas: 8000000 }),
            3000000);
      });

    }); //end test block

  }); //end describe block

  describe("Testing update arbitor functionality", function() {

    it("Should be able to update an arbiter", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
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
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
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
      strikePrice = web3.utils.toBN(28000)
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)
      serviceFee = web3.utils.toBN('0')
      proposedPrice = web3.utils.toBN(28500)

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), // [6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user01})), // [7]
      ])
      .then(result => {
        /* proposed share event */
        assert.strictEqual(result[5].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[5].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[5].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[5].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct share param");
        /* proposed share event */
        assert.strictEqual(result[6].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[6].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[6].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct share param");

        assert.strictEqual(result[6].logs[1].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[1].args.from, user01, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[1].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[1].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[1].args.exercisePrice.toString(), proposedPrice.toString(), "event param did not return correct share amount");
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
        assert.strictEqual(result.addresses.holder, addr00, "holder param did not return address zero");
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
        assert.strictEqual(result.uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        /* boolean flags*/
        assert.isNotTrue(result.flags.isRequest, "isRequest did not return false");
        assert.isNotTrue(result.flags.isEuro, "isEuro did not return false");
        assert.isNotTrue(result.flags.isPut, "isPut did not return false");
        assert.isNotTrue(result.flags.hasBeenCleared, "hasBeenCleared did not return false");
        assert.isNotTrue(result.flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result.flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.arbiterHasConfirmed, "arbiterHasConfirmed did not return false");
        assert.isNotTrue(result.flags.arbitrationAgreement, "arbitrationAgreement did not return false");

        return piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        // Put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        payout = web3.utils.toBN(0)
        if (strikePrice.gt(proposedPrice)) {
          delta = strikePrice.sub(proposedPrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION)

        assert.strictEqual(result.toString(), collateral.sub(payout).toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), payout.sub(serviceFee).toString(), "user's ERC20 balance did not return correctly");

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
        assert.strictEqual(result[1].writerProposedPrice, "0", "Details should have returned zeroed writerProposedPrice");
        assert.strictEqual(result[1].holderProposedPrice, "0", "Details should have returned zeroed holderProposedPrice");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.");
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.");

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
      strikePrice = web3.utils.toBN(28000)
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)
      serviceFee = web3.utils.toBN('0')
      proposedPrice = web3.utils.toBN(28500)

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), // [6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})) // [7] settle called by arbiter
      ])
      .then(result => {
        /* first proposal event */
        assert.strictEqual(result[5].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[5].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[5].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[5].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* second proposal event */
        assert.strictEqual(result[6].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[6].logs[0].args.from, user03, "Event log didn't return correct sender")
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[6].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* settle event */
        assert.strictEqual(result[6].logs[1].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[1].args.from, user03, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[1].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[1].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[1].args.exercisePrice.toString(), proposedPrice.toString(), "event param did not return correct price amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out */
        assert.strictEqual(result.addresses.arbiter, addr00, "arbiter struct param did not return address zero");
        assert.strictEqual(result.addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result.addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        assert.strictEqual(result.uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        assert.isNotTrue(result.flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result.flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");

        return piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        // Put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        payout = web3.utils.toBN(0)
        if (strikePrice.gt(proposedPrice)) {
          delta = strikePrice.sub(proposedPrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION)

        assert.strictEqual(result.toString(), collateral.sub(payout).toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), payout.sub(serviceFee).toString(), "user's ERC20 balance did not return correctly");

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
        assert.strictEqual(result[1].writerProposedPrice, "0", "Details should have returned zeroed writerProposedPrice");
        assert.strictEqual(result[1].holderProposedPrice, "0", "Details should have returned zeroed holderProposedPrice");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.");
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.");

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
      strikePrice = web3.utils.toBN(28000)
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      proposedPrice = 28500;

      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)
      serviceFee = web3.utils.toBN('0')
      proposedPrice = web3.utils.toBN(28500)

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), // [6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})), // [7]
      ])
      .then(result => {
        /* first proposal event */
        assert.strictEqual(result[5].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[5].logs[0].args.from, user01, "Event log didn't return correct sender")
        assert.strictEqual(result[5].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[5].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* second proposal event */
        assert.strictEqual(result[6].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[6].logs[0].args.from, user03, "Event log didn't return correct sender")
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[6].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* settle event */
        assert.strictEqual(result[6].logs[1].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[1].args.from, user03, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[1].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[1].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[1].args.exercisePrice.toString(), proposedPrice.toString(), "event param did not return correct price amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out */
        assert.strictEqual(result[0].arbiter, addr00, "arbiter struct param did not return address zero");
        assert.strictEqual(result[0].writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[0].holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        assert.strictEqual(result[1].arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result[1].writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result[1].holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        assert.isNotTrue(result[2].arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result[2].writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[2].holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[2].arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result[2].writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result[2].holderHasProposedPrice, "holderHasProposedPrice did not return false");

        return piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        // Put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        payout = web3.utils.toBN(0)
        if (strikePrice.gt(proposedPrice)) {
          delta = strikePrice.sub(proposedPrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION)

        assert.strictEqual(result.toString(), collateral.sub(payout).toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), payout.sub(serviceFee).toString(), "user's ERC20 balance did not return correctly");
      });
    }); //end test block

    it("Should settle via arbitration when writer, holder, and arbiter are the same", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = web3.utils.toBN(28000)
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)
      serviceFee = web3.utils.toBN('0')
      proposedPrice = web3.utils.toBN(28500)

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), // [6]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})) // [7] settle called by arbiter
      ])
      .then(result => {
        /* first proposal event */
        assert.strictEqual(result[5].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[5].logs[0].args.from, owner, "Event log didn't return correct sender")
        assert.strictEqual(result[5].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[5].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* second proposal event */
        assert.strictEqual(result[6].logs[0].event, "PriceProposed", "Event logs did not return correct event name");
        assert.strictEqual(result[6].logs[0].args.from, user03, "Event log didn't return correct sender")
        assert.strictEqual(result[6].logs[0].args.tokenId.toString(), tokenId.toString(), "Event log didn't return correct token id param");
        assert.strictEqual(result[6].logs[0].args.proposedPrice.toString(), proposedPrice.toString(), "Event log didn't return correct price param");
        /* settle event */
        assert.strictEqual(result[6].logs[1].event, "ArbiterSettled", "event name did not return correctly");
        assert.strictEqual(result[6].logs[1].args.from, user03, "event param did not return correct address for sender");
        assert.strictEqual(result[6].logs[1].args.arbiter, user03, "event param did not return correct address for arbiter");
        assert.strictEqual(result[6].logs[1].args.tokenId.toString(), tokenId.toString(), "event param did not return correct tokenId");
        assert.strictEqual(result[6].logs[1].args.exercisePrice.toString(), proposedPrice.toString(), "event param did not return correct price amount");
        return piggyInstance.getDetails(tokenId, {from: owner});
      })
      .then(result => {
        /* check that struct is zero'ed out */
        assert.strictEqual(result.addresses.arbiter, addr00, "arbiter struct param did not return address zero");
        assert.strictEqual(result.addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result.addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        assert.strictEqual(result.uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result.uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        assert.isNotTrue(result.flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result.flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result.flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result.flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");

        return piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        // Put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        payout = web3.utils.toBN(0)
        if (strikePrice.gt(proposedPrice)) {
          delta = strikePrice.sub(proposedPrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION)

        assert.strictEqual(result.toString(), collateral.sub(payout).toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), payout.sub(serviceFee).toString(), "user's ERC20 balance did not return correctly");

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
        assert.strictEqual(result[1].writerProposedPrice, "0", "Details should have returned zeroed writerProposedPrice");
        assert.strictEqual(result[1].holderProposedPrice, "0", "Details should have returned zeroed holderProposedPrice");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.");
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})

      })
      .then(result => {
        //Note returning result without .toString() will return an empty array
        assert.strictEqual(result.toString(), '', "getOwnedPiggies did not return correctly");
      });
    }); //end test block

    it("Should set arbitrationAgreement to true", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = web3.utils.toBN(28000)
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;

      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)
      serviceFee = web3.utils.toBN('0')
      proposedPrice = web3.utils.toBN(28500)

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: user01})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: owner})), // [5]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), // [6]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), // [7]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user01})), // [8]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), // [9]
      ])
      .then(result => {
        // check that arbitrationAgreement has been set to true
        assert.isTrue(result[7].flags.arbitrationAgreement, "arbitrationAgreement did not return true");

        /* check that struct is zero'ed out
        ** result.address = result[0]
        ** result.uintDetails = result[1]
        ** result.flags = result[2]
        */
        // check that arbitrationAgreement reset to false
        assert.isNotTrue(result[9].flags.arbitrationAgreement, "arbitrationAgreement did not return false");

        return piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner});
      })
      .then(result => {
        // Put payout:
        // if strike > settlement price | payout = strike - settlement price * lot size
        payout = web3.utils.toBN(0)
        if (strikePrice.gt(proposedPrice)) {
          delta = strikePrice.sub(proposedPrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }
        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION)

        assert.strictEqual(result.toString(), collateral.sub(payout).toString(), "owner's ERC20 balance did not return correctly");
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        assert.strictEqual(result.toString(), payout.sub(serviceFee).toString(), "user's ERC20 balance did not return correctly");

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
        assert.strictEqual(result[1].writerProposedPrice, "0", "Details should have returned zeroed writerProposedPrice");
        assert.strictEqual(result[1].holderProposedPrice, "0", "Details should have returned zeroed holderProposedPrice");
        //check BoolFlags
        assert.isNotTrue(result[2].isRequest, "Details should have returned false for isRequest.");
        assert.isNotTrue(result[2].isEuro, "Details should have returned false for isEuro.");
        assert.isNotTrue(result[2].isPut, "Details should have returned false for isPut.");
        assert.isNotTrue(result[2].hasBeenCleared, "Details should have returned false for hasBeenCleared.");
        assert.isNotTrue(result[2].writerHasProposedPrice, "Details should have returned false for writerHasProposedPrice.");
        assert.isNotTrue(result[2].holderHasProposedPrice, "Details should have returned false for holderHasProposedPrice.");

        return piggyInstance.getOwnedPiggies(owner, {from: owner})

      })
      .then(result => {
        //Note returning result without .toString() will return an empty array
        assert.strictEqual(result.toString(), '', "getOwnedPiggies did not return correctly");
      });
    }); //end test block

    it.skip("Should fail to settle via arbitartion if arbiter has not been set", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      proposedPrice = 28500;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [2]
      ])
      .then(result => {
        assert.strictEqual(result[2][0].holder, user01, "holder did not return correct address");

        /* should fail */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId, proposedPrice,
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
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
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

    it("Should fail to settle via arbitartion if piggy is not expired", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(500) // expire in 500 blocks
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      proposedPrice = 28500;

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
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
            tokenId, proposedPrice,
            {from: user01, gas: 8000000 }),
            3000000);
      });
    }); //end test block

    it("Should fail to call arbitration once an agreement has been reached", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000
      expiry = web3.utils.toBN(1) // can only settle after expiry
      isEuro = false
      isPut = true
      isRequest = false
      currentBlock = web3.utils.toBN(0)
      tokenId = 1;
      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user02, {from: owner})), // [1]
        () => Promise.resolve(piggyInstance.transferFrom(owner, user01, tokenId, {from: owner})), // [2]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [3]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: owner})), // [4]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), // [5]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), // [6]
      ])
      .then(result => {
        assert.strictEqual(result[3][0].writer, owner, "writer did not return correct address");
        assert.strictEqual(result[3][0].holder, user01, "holder did not return correct address");
        assert.strictEqual(result[3][0].arbiter, user02, "arbiter did not return correct address");
        assert.isTrue(result[6].flags.arbitrationAgreement, "agreement flag did not return true");

        /* should fail */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId, shareAmount,
            {from: user03, gas: 8000000 }),
            3000000);
      });
    }); //end test block

  }); //end describe block

  describe("Test claim payout functionality", function() {

    it("Should withdraw correct fee address share when arbitration occurs", function () {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 2
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      startBlock = web3.utils.toBN(0)
      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')
      proposedPrice = web3.utils.toBN(26825)

      serviceFee = web3.utils.toBN('0')
      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)

      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.setCooldown(2, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setCooldown tx status did not return true");

        return piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: owner}
        )
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true");
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result
        return piggyInstance.updateArbiter(tokenId, user03, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "setArbiter did not return true");
        return piggyInstance.startAuction(
          tokenId,startPrice,reservePrice,
          auctionLength,timeStep,priceStep,
          {from: owner})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "startAuction did not return true")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})), //[0]
          () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})), //[1]
          () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), //[2]
          () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), //[3]
          () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})), //[4]
          () => Promise.resolve(piggyInstance.getERC20Balance(owner, tokenInstance.address, {from: owner})), //[5]
          () => Promise.resolve(piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})), //[6]
          () => Promise.resolve(piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner})) //[7]
        ])
      })
      .then(result => {
        assert.isTrue(result[2].receipt.status, "first arbitration did not return true");
        assert.isTrue(result[3].receipt.status, "second arbitration did not return true");

        // Call payout:
        // if settlement price > strike | payout = settlement price - strike * lot size
        payout = web3.utils.toBN(0)
        if (proposedPrice.gt(strikePrice)) {
          delta = proposedPrice.sub(strikePrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }

        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION);
        //put calculation for writer Collaterial - payout
        assert.strictEqual(result[5].toString(), collateral.sub(payout).toString(), "Owner balance did not update correctly");
        //put calculation for holder = payout
        assert.strictEqual(result[6].toString(), payout.sub(serviceFee).toString(), "User balance did not update correctly");
        assert.strictEqual(result[7].toString(), serviceFee.toString(), "feeAddress balance did not return 0");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, payout.sub(serviceFee), {from: user01})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, serviceFee, {from: feeAddress})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[6]
        ]);
      })
      .then(result => {
        let userBalanceBefore = web3.utils.toBN(result[1]);
        let feeBalanceBefore = web3.utils.toBN(result[2]);
        let userBalanceAfter = web3.utils.toBN(result[5]);
        let feeBalanceAfter = web3.utils.toBN(result[6]);

        assert.isTrue(result[3].receipt.status, "user01 payout did not return true");
        assert.isTrue(result[4].receipt.status, "fee payout did not return true");
        /* check user01 balance */
        assert.strictEqual(userBalanceAfter.toString(), userBalanceBefore.add(payout).sub(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, userBalanceBefore.add(payout).sub(serviceFee).cmp(userBalanceAfter), "balance compare did not return equal");
        /* check feeAddress balance */
        assert.strictEqual(feeBalanceAfter.toString(), feeBalanceBefore.add(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, feeBalanceBefore.add(serviceFee).cmp(feeBalanceAfter), "balance compare did not return equal");
      });
    }); //end test block
  }); //end describe block

  describe("Test arbitration conditional states", function() {

    it("Should settle via arbitration if expired, but not cleared", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26500)
      expiry = 5 // will expire
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 2
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')
      proposedPrice = web3.utils.toBN(26825)

      serviceFee = web3.utils.toBN('0')
      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)

      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      let tokenId = web3.utils.toBN(1);
      let expiryBlock = web3.utils.toBN(0);

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.setCooldown(2, {from: owner})), //[0]
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8], params[9], {from: owner})), //[1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})), //[5]
        () => Promise.resolve(piggyInstance.freeze({from: owner})), //[6] increment block
        () => Promise.resolve(piggyInstance.unfreeze({from: owner})), //[7] increment block
        () => Promise.resolve(piggyInstance.freeze({from: owner})), //[8] increment block
        () => Promise.resolve(piggyInstance.unfreeze({from: owner})), //[9] increment block
        () => Promise.resolve(web3.eth.getBlockNumber()), //[10]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), //[11]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), //[12]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})), //[13]
      ])
      .then(result => {
        expiryBlock = web3.utils.toBN(result[2][1].expiry)
        let blockNow = web3.utils.toBN(result[10])
        assert.isTrue(expiryBlock.lt(blockNow), "piggy is not expired");
        assert.isTrue(result[11].receipt.status, "first arbitration did not return true");
        assert.isTrue(result[12].receipt.status, "second arbitration did not return true");
        assert.isTrue(result[13].receipt.status, "settle did not return true");
        // Call payout:
        // if settlement price > strike | payout = settlement price - strike * lot size
        payout = web3.utils.toBN(0)
        if (proposedPrice.gt(strikePrice)) {
          delta = proposedPrice.sub(strikePrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }

        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION);

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, payout.sub(serviceFee), {from: user01})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, serviceFee, {from: feeAddress})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[6]
        ]);
      })
      .then(result => {
        let userBalanceBefore = web3.utils.toBN(result[1]);
        let feeBalanceBefore = web3.utils.toBN(result[2]);
        let userBalanceAfter = web3.utils.toBN(result[5]);
        let feeBalanceAfter = web3.utils.toBN(result[6]);

        assert.isTrue(result[3].receipt.status, "user01 payout did not return true");
        assert.isTrue(result[4].receipt.status, "fee payout did not return true");
        /* check user01 balance */
        assert.strictEqual(userBalanceAfter.toString(), userBalanceBefore.add(payout).sub(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, userBalanceBefore.add(payout).sub(serviceFee).cmp(userBalanceAfter), "balance compare did not return equal");
        /* check feeAddress balance */
        assert.strictEqual(feeBalanceAfter.toString(), feeBalanceBefore.add(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, feeBalanceBefore.add(serviceFee).cmp(feeBalanceAfter), "balance compare did not return equal");
      });
    }); //end test

    it("Should settle via arbitration if cleared, but not expired", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26500)
      expiry = 500 // will not expire
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 2
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')
      proposedPrice = web3.utils.toBN(26825)

      serviceFee = web3.utils.toBN('0')
      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)

      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      let tokenId = web3.utils.toBN(1);
      let expiryBlock = web3.utils.toBN(0);

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.setCooldown(2, {from: owner})), //[0]
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8], params[9], {from: owner})), //[1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})), //[5]
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})), //[6]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[7]
        () => Promise.resolve(web3.eth.getBlockNumber()), //[8]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user01})), //[9]
        () => Promise.resolve(piggyInstance.thirdPartyArbitrationSettlement(tokenId, proposedPrice, {from: user03})), //[10]
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user03})), //[11]
      ])
      .then(result => {
        expiryBlock = web3.utils.toBN(result[2][1].expiry)
        blockNow = web3.utils.toBN(result[8])
        assert.isTrue(result[7][2].hasBeenCleared, "piggy is not cleared");
        assert.isTrue(expiryBlock.gt(blockNow), "piggy is expired");
        assert.isTrue(result[9].receipt.status, "first arbitration did not return true");
        assert.isTrue(result[10].receipt.status, "second arbitration did not return true");
        assert.isTrue(result[11].receipt.status, "settle did not return true");
        // Call payout:
        // if settlement price > strike | payout = settlement price - strike * lot size
        payout = web3.utils.toBN(0)
        if (proposedPrice.gt(strikePrice)) {
          delta = proposedPrice.sub(strikePrice)
          payout = delta.mul(decimals).mul(lotSize).div(web3.utils.toBN(100))
        }
        if (payout.gt(collateral)) {
          payout = collateral
        }

        serviceFee = payout.mul(FEE_PERCENT).div(FEE_RESOLUTION);

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[2]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, payout.sub(serviceFee), {from: user01})), //[3]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, serviceFee, {from: feeAddress})), //[4]
          () => Promise.resolve(tokenInstance.balanceOf(user01, {from: owner})), //[5]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: owner})), //[6]
        ]);
      })
      .then(result => {
        let userBalanceBefore = web3.utils.toBN(result[1]);
        let feeBalanceBefore = web3.utils.toBN(result[2]);
        let userBalanceAfter = web3.utils.toBN(result[5]);
        let feeBalanceAfter = web3.utils.toBN(result[6]);

        assert.isTrue(result[3].receipt.status, "user01 payout did not return true");
        assert.isTrue(result[4].receipt.status, "fee payout did not return true");
        /* check user01 balance */
        assert.strictEqual(userBalanceAfter.toString(), userBalanceBefore.add(payout).sub(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, userBalanceBefore.add(payout).sub(serviceFee).cmp(userBalanceAfter), "balance compare did not return equal");
        /* check feeAddress balance */
        assert.strictEqual(feeBalanceAfter.toString(), feeBalanceBefore.add(serviceFee).toString(), "balance after did not return correct amount");
        assert.strictEqual(0, feeBalanceBefore.add(serviceFee).cmp(feeBalanceAfter), "balance compare did not return equal");
      });
    }); //end test

    it("Should fail via arbitration if not cleared and not expired", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = web3.utils.toBN(100)
      strikePrice = web3.utils.toBN(26500)
      expiry = 500 // will not expire
      isEuro = false
      isPut = false
      isRequest = false

      startPrice = web3.utils.toBN(10000)
      reservePrice = web3.utils.toBN(100)
      auctionLength = 2
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      auctionPrice = web3.utils.toBN(0)

      oracleFee = web3.utils.toBN('1000000000000000000')
      proposedPrice = web3.utils.toBN(26825)

      serviceFee = web3.utils.toBN('0')
      const FEE_PERCENT = web3.utils.toBN(50)
      const FEE_RESOLUTION = web3.utils.toBN(10000)

      shareAmount = collateral.div(web3.utils.toBN(2));

      params = [collateralERC,dataResolver,addr00,collateral,lotSize,
              strikePrice,expiry,isEuro,isPut,isRequest];

      let tokenId = web3.utils.toBN(1);
      let expiryBlock = web3.utils.toBN(0);

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.setCooldown(2, {from: owner})), //[0]
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8], params[9], {from: owner})), //[1]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[2]
        () => Promise.resolve(piggyInstance.updateArbiter(tokenId, user03, {from: owner})), //[3]
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})), //[4]
        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})), //[5]
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})), //[6]
        () => Promise.resolve(web3.eth.getBlockNumber()), //[7]
      ])
      .then(result => {
        expiryBlock = web3.utils.toBN(result[2][1].expiry)
        blockNow = web3.utils.toBN(result[7])
        assert.isNotTrue(result[6][2].hasBeenCleared, "piggy has been cleared");
        assert.isTrue(expiryBlock.gt(blockNow), "piggy is expired");

        /* transaction should fail if not cleared and not expired */
        return expectedExceptionPromise(
          () => piggyInstance.thirdPartyArbitrationSettlement(
            tokenId,
            proposedPrice,
            {from: user01, gas: 8000000 }),
            3000000);

      });
    }); //end test

  }); //end describe

}); // end test suite
