Promise = require("bluebird");
var AttackToken = artifacts.require("./AttackToken.sol");
var AttackTokenReclaim = artifacts.require("./AttackTokenReclaim.sol");
var TestnetLINK = artifacts.require("./TestnetLINK.sol");
var SmartPiggies = artifacts.require("./SmartPiggies.sol");
var Resolver = artifacts.require("./ResolverSelfReturn.sol");

const expectedExceptionPromise = require("../utils/expectedException.js");
const sequentialPromise = require("../utils/sequentialPromise.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract ('SmartPiggies', function(accounts) {

  let tokenInstance;
  let tokenReclaimInstance;
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
  //multiply a BN
  //var aNum = web3.utils.toBN(decimals).mul(web3.utils.toBN('1000'))
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
  let zeroNonce = web3.utils.toBN(0)
  let one = web3.utils.toBN(1);
  let two = web3.utils.toBN(2);

  /* default feePercent param = 50 */
  const DEFAULT_FEE_PERCENT = web3.utils.toBN(50);
  /* default feePercent param = 10,000 */
  const DEFAULT_FEE_RESOLUTION = web3.utils.toBN(10000);

  beforeEach(function() {
    //console.log(JSON.stringify("symbol: " + result, null, 4));
    return AttackToken.new({from: owner})
    .then(instance => {
      tokenInstance = instance;
      return AttackTokenReclaim.new({from: owner})
    })
    .then(instance => {
      tokenReclaimInstance = instance;
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

      /* setup housekeeping */
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenReclaimInstance.mint(user01, supply, {from: owner})),
        // give attacking contract tokens
        () => Promise.resolve(tokenInstance.mint(tokenInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenReclaimInstance.mint(tokenInstance.address, supply, {from: owner})),

        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),

        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),

        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(tokenInstance.setAddress(piggyInstance.address, {from: owner})) //set attack address
        () => Promise.resolve(tokenReclaimInstance.setAddress(piggyInstance.address, {from: owner})) //set attack address
      ])
    });
  });

  describe("Test attacking createPiggy function", function() {

    it("Should call attack on token contract, and make 3 piggies", function() {
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
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let creationBlock = web3.utils.toBN(0)
      let balanceBefore = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];


      return piggyInstance.tokenId.call({from: owner})
      .then(result => {
        assert.strictEqual(result.toString(), "0", "tokenId is not zero");
        return tokenInstance.balanceOf.call(tokenInstance.address, {from: owner})
      })
      .then(result => {
        balanceBefore = web3.utils.toBN(result)

        /* syncronous promise */
        web3.eth.getBlockNumberPromise()
        .then(block => {
          creationBlock = web3.utils.toBN(block).add(one)
        }); // end syncronous call

        return tokenInstance.attack({from: owner, gas: 8000000})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "attack tx did not return true")

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.tokenId.call({from: owner})),
          () => Promise.resolve(tokenInstance.count.call({from: owner})),
          () => Promise.resolve(tokenInstance.didAttack.call({from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(one), {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(two), {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf.call(tokenInstance.address, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf.call(piggyInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[0].toString(), tokenId.add(two).toString(), "tokenId did not return correct ID number");
        assert.strictEqual(result[1].toString(), one.add(two).toString(), "attack counter did not return correctly");
        assert.isTrue(result[2], "attack bool did not return true");
        //assert.strictEqual(result[3].toString(), two.toString(), "attack counter did not return correctly");

        /*
        ** result.address = result[0]
        ** result.uintDetails = result[1]
        ** result.flags = result[2]
        */
        //check token 1
        /* addresses */
        assert.strictEqual(result[3].addresses.writer, tokenInstance.address, "writer param did not return address zero");
        assert.strictEqual(result[3].addresses.holder, tokenInstance.address, "holder param did not return address zero");
        assert.strictEqual(result[3].addresses.arbiter, addr00, "arbiter param did not return address zero");
        assert.strictEqual(result[3].addresses.collateralERC, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[3].addresses.dataResolver, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[3].addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[3].addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        /* uint details */
        assert.strictEqual(result[3].uintDetails.collateral, "100", "collateral did not return address zero");
        assert.strictEqual(result[3].uintDetails.lotSize, "1", "lotSize did not return address zero");
        assert.strictEqual(result[3].uintDetails.strikePrice, "12300", "strikePrice did not return address zero");
        assert.strictEqual(result[3].uintDetails.expiry, creationBlock.add(oneHundred).toString(), "expiry did not return address zero");
        assert.strictEqual(result[3].uintDetails.settlementPrice, zeroParam.toString(), "settlementPrice did not return address zero");
        assert.strictEqual(result[3].uintDetails.reqCollateral, zeroParam.toString(), "reqCollateral did not return address zero");
        assert.strictEqual(result[3].uintDetails.collateralDecimals, "18", "collateralDecimals did not return address zero");
        assert.strictEqual(result[3].uintDetails.arbitrationLock, zeroParam.toString(), "arbitrationLock did not return address zero");
        assert.strictEqual(result[3].uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result[3].uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result[3].uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        /* boolean flags*/
        assert.isNotTrue(result[3].flags.isRequest, "isRequest did not return false");
        assert.isNotTrue(result[3].flags.isEuro, "isEuro did not return false");
        assert.isNotTrue(result[3].flags.isPut, "isPut did not return false");
        assert.isNotTrue(result[3].flags.hasBeenCleared, "hasBeenCleared did not return false");
        assert.isNotTrue(result[3].flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result[3].flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[3].flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[3].flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result[3].flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result[3].flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");
        assert.isNotTrue(result[3].flags.arbiterHasConfirmed, "arbiterHasConfirmed did not return false");
        assert.isNotTrue(result[3].flags.arbitrationAgreement, "arbitrationAgreement did not return false");

        //check token 2
        /* addresses */
        assert.strictEqual(result[4].addresses.writer, tokenInstance.address, "writer param did not return address zero");
        assert.strictEqual(result[4].addresses.holder, tokenInstance.address, "holder param did not return address zero");
        assert.strictEqual(result[4].addresses.arbiter, addr00, "arbiter param did not return address zero");
        assert.strictEqual(result[4].addresses.collateralERC, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[4].addresses.dataResolver, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[4].addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[4].addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        /* uint details */
        assert.strictEqual(result[4].uintDetails.collateral, "100", "collateral did not return address zero");
        assert.strictEqual(result[4].uintDetails.lotSize, "1", "lotSize did not return address zero");
        assert.strictEqual(result[4].uintDetails.strikePrice, "12300", "strikePrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.expiry, creationBlock.add(oneHundred).toString(), "expiry did not return address zero");
        assert.strictEqual(result[4].uintDetails.settlementPrice, zeroParam.toString(), "settlementPrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.reqCollateral, zeroParam.toString(), "reqCollateral did not return address zero");
        assert.strictEqual(result[4].uintDetails.collateralDecimals, "18", "collateralDecimals did not return address zero");
        assert.strictEqual(result[4].uintDetails.arbitrationLock, zeroParam.toString(), "arbitrationLock did not return address zero");
        assert.strictEqual(result[4].uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        /* boolean flags*/
        assert.isNotTrue(result[4].flags.isRequest, "isRequest did not return false");
        assert.isNotTrue(result[4].flags.isEuro, "isEuro did not return false");
        assert.isNotTrue(result[4].flags.isPut, "isPut did not return false");
        assert.isNotTrue(result[4].flags.hasBeenCleared, "hasBeenCleared did not return false");
        assert.isNotTrue(result[4].flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result[4].flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[4].flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[4].flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result[4].flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result[4].flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");
        assert.isNotTrue(result[4].flags.arbiterHasConfirmed, "arbiterHasConfirmed did not return false");
        assert.isNotTrue(result[4].flags.arbitrationAgreement, "arbitrationAgreement did not return false");

        //check token 3
        /* addresses */
        assert.strictEqual(result[5].addresses.writer, tokenInstance.address, "writer param did not return address zero");
        assert.strictEqual(result[5].addresses.holder, tokenInstance.address, "holder param did not return address zero");
        assert.strictEqual(result[5].addresses.arbiter, addr00, "arbiter param did not return address zero");
        assert.strictEqual(result[5].addresses.collateralERC, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[5].addresses.dataResolver, tokenInstance.address, "collateral param did not return address zero");
        assert.strictEqual(result[5].addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[5].addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        /* uint details */
        assert.strictEqual(result[5].uintDetails.collateral, "100", "collateral did not return address zero");
        assert.strictEqual(result[5].uintDetails.lotSize, "1", "lotSize did not return address zero");
        assert.strictEqual(result[5].uintDetails.strikePrice, "12300", "strikePrice did not return address zero");
        assert.strictEqual(result[5].uintDetails.expiry, creationBlock.add(oneHundred).toString(), "expiry did not return address zero");
        assert.strictEqual(result[5].uintDetails.settlementPrice, zeroParam.toString(), "settlementPrice did not return address zero");
        assert.strictEqual(result[5].uintDetails.reqCollateral, zeroParam.toString(), "reqCollateral did not return address zero");
        assert.strictEqual(result[5].uintDetails.collateralDecimals, "18", "collateralDecimals did not return address zero");
        assert.strictEqual(result[5].uintDetails.arbitrationLock, zeroParam.toString(), "arbitrationLock did not return address zero");
        assert.strictEqual(result[5].uintDetails.arbiterProposedPrice, zeroParam.toString(), "arbiterProposedPrice did not return address zero");
        assert.strictEqual(result[5].uintDetails.writerProposedPrice, zeroParam.toString(), "writerProposedPrice did not return address zero");
        assert.strictEqual(result[5].uintDetails.holderProposedPrice, zeroParam.toString(), "holderProposedPrice did not return address zero");
        /* boolean flags*/
        assert.isNotTrue(result[5].flags.isRequest, "isRequest did not return false");
        assert.isNotTrue(result[5].flags.isEuro, "isEuro did not return false");
        assert.isNotTrue(result[5].flags.isPut, "isPut did not return false");
        assert.isNotTrue(result[5].flags.hasBeenCleared, "hasBeenCleared did not return false");
        assert.isNotTrue(result[5].flags.arbiterHasBeenSet, "arbiterHasBeenSet did not return false");
        assert.isNotTrue(result[5].flags.writerHasProposedNewArbiter, "writerHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[5].flags.holderHasProposedNewArbiter, "holderHasProposedNewArbiter did not return false");
        assert.isNotTrue(result[5].flags.arbiterHasProposedPrice, "arbiterHasProposedPrice did not return false");
        assert.isNotTrue(result[5].flags.writerHasProposedPrice, "writerHasProposedPrice did not return false");
        assert.isNotTrue(result[5].flags.holderHasProposedPrice, "holderHasProposedPrice did not return false");
        assert.isNotTrue(result[5].flags.arbiterHasConfirmed, "arbiterHasConfirmed did not return false");
        assert.isNotTrue(result[5].flags.arbitrationAgreement, "arbitrationAgreement did not return false");
      })

      // check token balance
      assert.strictEqual(result[6].toString(), balanceBefore.sub(oneHundred).sub(oneHundred).sub(oneHundred), "attk balance did not return correctly")
      assert.strictEqual(result[7].toString(), oneHundred.add(oneHundred).add(oneHundred), "sp balance did not return correctly")

    }); // end test



  }); // end describe


  describe("Test attack on reclaimAndBurn function", function() {
    it("Should make call reclaim and burn", function() {
      //American call
      collateralERC = tokenReclaimInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = false
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let creationBlock = web3.utils.toBN(0)
      let balanceBefore = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];


      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8], params[9], {from: owner})), // [0]
        () => Promise.resolve(tokenInstance.attack({from: owner, gas: 8000000}))
      ])
      .then(result => {
        console.log("Completed")
      })

    }); // end test
  }); // end describe

}); // end unit test
