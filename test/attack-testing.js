Promise = require("bluebird");
var AttackToken = artifacts.require("./AttackToken.sol");
var AttackTokenCreate = artifacts.require("./AttackTokenCreate.sol");
var AttackTokenReclaim = artifacts.require("./AttackTokenReclaim.sol");
var AttackTokenStartAuction = artifacts.require("./AttackTokenStartAuction.sol");
var AttackTokenEndAuction = artifacts.require("./AttackTokenEndAuction.sol");
var AttackTokenEndAuctionV2 = artifacts.require("./AttackTokenEndAuctionV2.sol");
var AttackTokenSatisfyAuction = artifacts.require("./AttackTokenSatisfyAuction.sol");
var AttackTokenClaim = artifacts.require("./AttackTokenClaim.sol");
var TestnetLINK = artifacts.require("./TestnetLINK.sol");
var SmartPiggies = artifacts.require("./SmartPiggies.sol");
var Resolver = artifacts.require("./ResolverSelfReturn.sol");
var ResolverAttack = artifacts.require("./ResolverSelfAttack.sol");

const expectedExceptionPromise = require("../utils/expectedException.js");
const sequentialPromise = require("../utils/sequentialPromise.js");

if (typeof web3.eth.getAccountsPromise === "undefined") {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
}

contract ('SmartPiggies', function(accounts) {

  let tokenInstance;
  let tokenCreateInstance;
  let tokenReclaimInstance;
  let tokenSAuctionInstance;
  let tokenEAuctionInstance;
  let tokenEAuctionInstance2;
  let tokenSatisfyInstance;
  let tokenClaimInstance;
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
      return AttackTokenCreate.new({from: owner})
    })
    .then(instance => {
      tokenCreateInstance = instance;
      return AttackTokenReclaim.new({from: owner})
    })
    .then(instance => {
      tokenReclaimInstance = instance;
      return AttackTokenStartAuction.new({from: owner})
    })
    .then(instance => {
      tokenSAuctionInstance = instance;
      return AttackTokenEndAuction.new({from: owner})
    })
    .then(instance => {
      tokenEAuctionInstance = instance;
      return AttackTokenEndAuctionV2.new({from: owner})
    })
    .then(instance => {
      tokenEAuctionInstance2 = instance;
      return AttackTokenSatisfyAuction.new({from: owner})
    })
    .then(instance => {
      tokenSatisfyInstance = instance;
      return AttackTokenClaim.new({from: owner})
    })
    .then(instance => {
      tokenClaimInstance = instance;
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
      return ResolverAttack.new(
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
      resolverAttackInstance = instance;
      return SmartPiggies.new({from: owner, gas: 8000000, gasPrice: 1100000000});
    })
    .then(instance => {
      piggyInstance = instance;

      /* setup housekeeping */
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenCreateInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenReclaimInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(tokenClaimInstance.mint(user01, supply, {from: owner})),

        // give attacking contract tokens
        () => Promise.resolve(tokenInstance.mint(tokenInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenCreateInstance.mint(tokenCreateInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenReclaimInstance.mint(tokenReclaimInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenSAuctionInstance.mint(tokenSAuctionInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenEAuctionInstance.mint(tokenEAuctionInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenEAuctionInstance2.mint(tokenEAuctionInstance2.address, supply, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.mint(tokenSatisfyInstance.address, supply, {from: owner})),
        () => Promise.resolve(tokenClaimInstance.mint(tokenClaimInstance.address, supply, {from: owner})),

        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(resolverAttackInstance.address, supply, {from: owner})),

        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(linkInstance.approve(resolverAttackInstance.address, approveAmount, {from: user01})),

        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(tokenInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenCreateInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenReclaimInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenSAuctionInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenEAuctionInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenEAuctionInstance2.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenSatisfyInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(resolverAttackInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
        () => Promise.resolve(tokenClaimInstance.setAddress(piggyInstance.address, {from: owner})), //set attack address
      ])
    });
  });

  describe("Test attack on createPiggy function", function() {

    it("Should call attack on token contract, and make 3 piggies", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
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
      assert.strictEqual(result[6].toString(), balanceBefore.sub(collateral).sub(collateral).sub(collateral), "attk balance did not return correctly")
      assert.strictEqual(result[7].toString(), collateral.add(collateral).add(collateral), "sp balance did not return correctly")

    }); // end test

    it("Should create appropriate piggies if user calls createPiggy with attack in decimals", function() {
      //American call
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = false
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)

      let userBalanceBefore = web3.utils.toBN(0)
      let tcBalanceBefore = web3.utils.toBN(0) // token contract
      let spBalanceBefore = web3.utils.toBN(0) // smartpiggies contract
      let attacker = tokenInstance.address;

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];


      return sequentialPromise([
        () => Promise.resolve(tokenInstance.balanceOf.call(user01, {from: owner})),
        () => Promise.resolve(tokenInstance.balanceOf.call(attacker, {from: owner})),
        () => Promise.resolve(tokenInstance.balanceOf.call(piggyInstance.address, {from: owner}))
      ])
      .then(result => {
        userBalanceBefore = web3.utils.toBN(result[0])
        tcBalanceBefore = web3.utils.toBN(result[1])
        spBalanceBefore = web3.utils.toBN(result[2])

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.createPiggy(
                    params[0],params[1],params[2],params[3],
                    params[4],params[5],params[6],params[7],
                    params[8], params[9], {from: user01, gas: 8000000})),
          () => Promise.resolve(piggyInstance.tokenId.call({from: owner})),
          () => Promise.resolve(tokenInstance.count.call({from: owner})),
          () => Promise.resolve(tokenInstance.didAttack.call({from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(one), {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(two), {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf.call(user01, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf.call(attacker, {from: owner})),
          () => Promise.resolve(tokenInstance.balanceOf.call(piggyInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: user01})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
          () => Promise.resolve(piggyInstance.tokenId.call({from: user01}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[4][0].holder.toString(), user01, "user01 does not own piggy #1");
        assert.strictEqual(result[5][0].holder.toString(), attacker, "attacking contract does not own piggy #2");
        assert.strictEqual(result[6][0].holder.toString(), attacker, "attacking contract does not own piggy #3");
        assert.strictEqual(result[7].toString(), userBalanceBefore.sub(collateral).toString(), "user balance did not return correctly");
        assert.strictEqual(result[8].toString(), tcBalanceBefore.sub(collateral).sub(collateral).toString(), "token contract balance did not return correctly");
        assert.strictEqual(result[9].toString(), spBalanceBefore.add(collateral).add(collateral).add(collateral).toString(), "sp balance did not return correctly");
        assert.strictEqual(result[10].length, 1, "user01's owned tokens did not return correctly");
        assert.strictEqual(result[11].length, 2, "attacking contract's owned tokens did not return correctly");
        // check tokenId count
        assert.strictEqual(result[12].toString(), tokenId.add(one).add(one).toString(), "tokenId did not return correctly");
      })

    }); // end test

    it("Should create appropriate piggies if user calls createPiggy with attack in transfer", function() {
      //American call
      collateralERC = tokenCreateInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = false
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)

      let userBalanceBefore = web3.utils.toBN(0)
      let tcBalanceBefore = web3.utils.toBN(0) // token contract
      let spBalanceBefore = web3.utils.toBN(0) // smartpiggies contract
      let attacker = tokenCreateInstance.address;

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];


      return sequentialPromise([
        () => Promise.resolve(tokenCreateInstance.balanceOf.call(user01, {from: owner})),
        () => Promise.resolve(tokenCreateInstance.balanceOf.call(attacker, {from: owner})),
        () => Promise.resolve(tokenCreateInstance.balanceOf.call(piggyInstance.address, {from: owner}))
      ])
      .then(result => {
        userBalanceBefore = web3.utils.toBN(result[0])
        tcBalanceBefore = web3.utils.toBN(result[1])
        spBalanceBefore = web3.utils.toBN(result[2])

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.createPiggy(
                    params[0],params[1],params[2],params[3],
                    params[4],params[5],params[6],params[7],
                    params[8], params[9], {from: user01, gas: 8000000})),
          () => Promise.resolve(piggyInstance.tokenId.call({from: owner})),
          () => Promise.resolve(tokenCreateInstance.count.call({from: owner})),
          () => Promise.resolve(tokenCreateInstance.didAttack.call({from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(one), {from: owner})),
          () => Promise.resolve(piggyInstance.getDetails(tokenId.add(two), {from: owner})),
          () => Promise.resolve(tokenCreateInstance.balanceOf.call(user01, {from: owner})),
          () => Promise.resolve(tokenCreateInstance.balanceOf.call(attacker, {from: owner})),
          () => Promise.resolve(tokenCreateInstance.balanceOf.call(piggyInstance.address, {from: owner})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: user01})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
          () => Promise.resolve(piggyInstance.tokenId.call({from: user01}))
        ])
      })
      .then(result => {
        assert.strictEqual(result[4][0].holder.toString(), user01, "user01 does not own piggy #1");
        assert.strictEqual(result[5][0].holder.toString(), attacker, "attacking contract does not own piggy #2");
        assert.strictEqual(result[6][0].holder.toString(), attacker, "attacking contract does not own piggy #3");
        assert.strictEqual(result[7].toString(), userBalanceBefore.sub(collateral).toString(), "user balance did not return correctly");
        assert.strictEqual(result[8].toString(), tcBalanceBefore.sub(collateral).sub(collateral).toString(), "token contract balance did not return correctly");
        assert.strictEqual(result[9].toString(), spBalanceBefore.add(collateral).add(collateral).add(collateral).toString(), "sp balance did not return correctly");
        assert.strictEqual(result[10].length, 1, "user01's owned tokens did not return correctly");
        assert.strictEqual(result[11].length, 2, "attacking contract's owned tokens did not return correctly");
        // check tokenId count
        assert.strictEqual(result[12].toString(), tokenId.add(one).add(one).toString(), "tokenId did not return correctly");
      })

    }); // end test

  }); // end describe


  describe("Test attack on reclaimAndBurn function", function() {

    it("Should call attack on reclaimAndBurn but execute correctly", function() {
      //American call
      collateralERC = tokenReclaimInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(1 * decimals)
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let creationBlock = web3.utils.toBN(0)
      let balanceBefore = web3.utils.toBN(0)

      let attacker = tokenReclaimInstance.address

      return sequentialPromise([
        () => Promise.resolve(tokenReclaimInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenReclaimInstance.setTokenId(tokenId , {from: user01})), // have to know token number before create
        () => Promise.resolve(tokenReclaimInstance.create({from: user01})),
        () => Promise.resolve(tokenReclaimInstance.create({from: user01})),
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.getDetails(tokenId.add(one), {from: user01})),
        () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
        () => Promise.resolve(tokenReclaimInstance.reclaim({from: user01})),
        () => Promise.resolve(tokenReclaimInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenReclaimInstance.didCreate.call({from: user01})),
        () => Promise.resolve(tokenReclaimInstance.didReclaim.call({from: user01})),
        () => Promise.resolve(tokenReclaimInstance.didAttack.call({from: user01})),
        () => Promise.resolve(piggyInstance.tokenId.call({from: user01})),
        () => Promise.resolve(tokenReclaimInstance.returnAttackString.call({from: user01})),
      ])
      .then(result => {
        /**
        console.log("return: ", result[13].toString())
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[4].addresses.holder.toString())
        console.log("owned: ", result[5].length)
        console.log("bal before: ", result[0].toString())
        console.log("bal after:  ", result[7].toString())
        console.log("create:  ", result[9].toString())
        console.log("reclaim:  ", result[10].toString())
        console.log("attacked:  ", result[11].toString())
        console.log("id:  ", result[12].toString())
        console.log("data:  ", result[13].toString())
        **/
        let balanceBefore = web3.utils.toBN(result[0])
        let balanceAfter = web3.utils.toBN(result[8])

        // make sure first piggy has been reclaimed and set
        /* addresses */
        assert.strictEqual(result[4].addresses.writer, addr00, "writer param did not return address zero");
        assert.strictEqual(result[4].addresses.holder, addr00, "holder param did not return address zero");
        assert.strictEqual(result[4].addresses.arbiter, addr00, "arbiter param did not return address zero");
        assert.strictEqual(result[4].addresses.collateralERC, addr00, "collateral param did not return address zero");
        assert.strictEqual(result[4].addresses.dataResolver, addr00, "collateral param did not return address zero");
        assert.strictEqual(result[4].addresses.writerProposedNewArbiter, addr00, "writerProposedNewArbiter did not return address zero");
        assert.strictEqual(result[4].addresses.holderProposedNewArbiter, addr00, "holderProposedNewArbiter did not return address zero");
        /* uint details */
        assert.strictEqual(result[4].uintDetails.collateral, "0", "collateral did not return address zero");
        assert.strictEqual(result[4].uintDetails.lotSize, "0", "lotSize did not return address zero");
        assert.strictEqual(result[4].uintDetails.strikePrice, "0", "strikePrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.expiry, "0", "expiry did not return address zero");
        assert.strictEqual(result[4].uintDetails.settlementPrice, zeroParam.toString(), "settlementPrice did not return address zero");
        assert.strictEqual(result[4].uintDetails.reqCollateral, zeroParam.toString(), "reqCollateral did not return address zero");
        assert.strictEqual(result[4].uintDetails.collateralDecimals, "0", "collateralDecimals did not return address zero");
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

        // second piggy

        // make sure the contract address is the owner of the created piggy
        assert.strictEqual(result[5].addresses.holder.toString(), attacker, "created piggy holder address did not match");

        // make sure the create executed on the attack contract
        assert.isTrue(result[9], "create did not return true");

        // make sure the reclaim on first piggy failed executed on the attack contract
        assert.isNotTrue(result[10], "reclaim did not return true");

        // make sure attack executed on the attack contract
        assert.isTrue(result[11], "attack did not return false");

        // make sure we didn't lose any funds
        // note two piggies were created, both put in 100 in the AttackTokenReclaim contract
        // balance after should be bal before less 100, first piggy reclaimed and burned, collateral returned
        assert.strictEqual(balanceAfter.toString(), balanceBefore.sub(oneHundred).toString(), "balance after did not match balance before");

        assert.strictEqual(result[6].length, 1, "owned piggies did not return correctly");

        // check tokenId count should reflect two piggies being created
        assert.strictEqual(result[12].toString(), tokenId.add(one).toString(), "tokenId did not return correctly");
      })

    }); // end test
  }); // end describe

  describe("Test an attack on startAuction", function() {

    it("Should call attack on startAuction but execute correctly", function() {
      //American call
      collateralERC = tokenSAuctionInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let attacker = tokenSAuctionInstance.address

      return sequentialPromise([
        () => Promise.resolve(tokenSAuctionInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.setTokenId(tokenId , {from: user01})), // need the tokenId to auction
        () => Promise.resolve(tokenSAuctionInstance.create({from: user01})),
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.count.call({from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.didCreate.call({from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.didAttack.call({from: user01})),
        () => Promise.resolve(piggyInstance.getAuctionDetails.call(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.tokenId.call({from: user01})),
        () => Promise.resolve(tokenSAuctionInstance.returnAttackString.call({from: user01})),
      ])
      .then(result => {
        /**
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[3].addresses.holder.toString())
        console.log("owned: ", result[4].length)
        console.log("bal before: ", result[0].toString())
        console.log("bal after:  ", result[5].toString())
        console.log("create:  ", result[7].toString())
        console.log("attacked:  ", result[8].toString())
        console.log("auction:  ", result[9].auctionActive.toString())
        console.log("id:  ", result[10].toString())
        console.log("return: ", result[11].toString())
        **/

        // make sure the contract address is the owner of the created piggy
        assert.strictEqual(attacker, result[3].addresses.holder.toString(), "created piggy holder address did not match");

        // make sure the create executed on the attack contract
        assert.isTrue(result[7], "create did not return true");

        // make sure attack executed on attack contract
        assert.isTrue(result[8], "attack did not return true");

        // make sure the auction executed on the attack contract
        assert.isTrue(result[9].auctionActive, "auction did not return true");

        // check owned piggies accounting
        assert.strictEqual(result[4].length, 1, "owned piggies did not return correctly");

        // check tokenId count
        assert.strictEqual(result[10].toString(), tokenId.toString(), "tokenId did not return correctly");

        // make sure balance after is balance before minus collateral
        assert.strictEqual(result[5].toString(), result[0].sub(collateral).toString(), "balance comparision is not correct");
      })
    }); // end test
  }); // end describe

  describe("Test an attack on endAuction", function() {

    it("Should attack with transferFrom on endAuction but execute correctly", function() {
      //American call
      collateralERC = tokenEAuctionInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let attacker = tokenEAuctionInstance.address

      return sequentialPromise([
        () => Promise.resolve(tokenEAuctionInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.setTokenId(tokenId , {from: user01})), // need the tokenId to auction
        () => Promise.resolve(tokenEAuctionInstance.create({from: user01})),
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.count.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.didCreate.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.didAttack.call({from: user01})),
        () => Promise.resolve(piggyInstance.getAuctionDetails.call(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.tokenId.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance.returnAttackString.call({from: user01})),
      ])
      .then(result => {
        /**
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[3].addresses.holder.toString())
        console.log("owned: ", result[4].length)
        console.log("bal before: ", result[0].toString())
        console.log("bal after:  ", result[5].toString())
        console.log("create:  ", result[7].toString())
        console.log("attacked:  ", result[8].toString())
        console.log("auction:  ", result[9].auctionActive.toString())
        console.log("id:  ", result[10].toString())
        console.log("return: ", result[11].toString())
        **/

        // make sure the contract address is the owner of the created piggy
        assert.strictEqual(attacker, result[3].addresses.holder.toString(), "created piggy holder address did not match");

        // make sure the create executed on the attack contract
        assert.isTrue(result[7], "create did not return true");

        // make sure attack executed on attack contract
        assert.isTrue(result[8], "attack did not return true");

        // make sure the auction is now not active, executed endAuction successfully
        assert.isNotTrue(result[9].auctionActive, "auction did not return true");

        // check owned piggies accounting
        assert.strictEqual(result[4].length, 1, "owned piggies did not return correctly");

        // check tokenId count
        assert.strictEqual(result[10].toString(), tokenId.toString(), "tokenId did not return correctly");

        // make sure balance after is balance before minus collateral
        assert.strictEqual(result[5].toString(), result[0].sub(collateral).toString(), "balance comparision is not correct");
      })
    }); // end test

    it("Should attack with transfer on endAuction with RFP but execute correctly", function() {
      //American call
      collateralERC = tokenEAuctionInstance2.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)
      let attacker = tokenEAuctionInstance2.address

      return sequentialPromise([
        () => Promise.resolve(tokenEAuctionInstance2.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.setTokenId(tokenId , {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.create({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.auction({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.attack({from: user01})), // <-
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.balanceOf(attacker , {from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.count.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.didCreate.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.didAttack.call({from: user01})),
        () => Promise.resolve(piggyInstance.getAuctionDetails.call(tokenId, {from: user01})),
        () => Promise.resolve(piggyInstance.tokenId.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.returnAttackString.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.didAuction.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.didEndAuction.call({from: user01})),
        () => Promise.resolve(tokenEAuctionInstance2.xfer.call({from: user01})),
      ])
      .then(result => {
        /**
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[5].addresses.holder.toString())
        console.log("owned: ", result[6].length)
        console.log("bal before: ", result[0].toString())
        console.log("bal after:  ", result[7].toString())
        console.log("create:  ", result[9].toString())
        console.log("attacked:  ", result[10].toString())
        console.log("on auction:  ", result[11].auctionActive.toString())
        console.log("id:  ", result[12].toString())
        console.log("return: ", result[13].toString())
        console.log("did auction: ", result[14].toString())
        console.log("did end: ", result[15].toString())
        console.log("count: ", result[8].toString())
        console.log("xfer: ", result[16].toString())
        **/

        // make sure the contract address is the owner of the created piggy
        assert.strictEqual(attacker, result[5].addresses.holder.toString(), "created piggy holder address did not match");

        // make sure the create executed on the attack contract
        assert.isTrue(result[9], "create did not return true");

        // make sure attack executed on attack contract
        assert.isTrue(result[10], "attack did not return true");

        // make sure the auction is now not active, executed endAuction successfully
        assert.isNotTrue(result[11].auctionActive, "auction did not return true");

        // check owned piggies accounting
        assert.strictEqual(result[6].length, 1, "owned piggies did not return correctly");

        // check tokenId count
        assert.strictEqual(result[12].toString(), tokenId.toString(), "tokenId did not return correctly");

        // make sure balance after equals balance before
        assert.strictEqual(result[7].toString(), result[0].toString(), "balance comparision is not correct");
      })
    }); // end test
  }); // end describe

  describe("Testing attack on satisfyAuction", function() {

    it("Should attack satisfyAuction but execute correctly", function() {
      //American call
      collateralERC = tokenSatisfyInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
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

      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)

      let userBalanceBefore = web3.utils.toBN(0)
      let tcBalanceBefore = web3.utils.toBN(0) // token contract
      let spBalanceBefore = web3.utils.toBN(0) // smartpiggies contract
      let attacker = tokenSatisfyInstance.address

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      auctionParams = []
      return sequentialPromise([
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(user01, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(attacker, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(piggyInstance.address, {from: owner}))
      ])
      .then(result => {
        userBalanceBefore = web3.utils.toBN(result[0])
        tcBalanceBefore = web3.utils.toBN(result[1])
        spBalanceBefore = web3.utils.toBN(result[2])

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.createPiggy(
                    params[0],params[1],params[2],params[3],
                    params[4],params[5],params[6],params[7],
                    params[8], params[9], {from: user01, gas: 8000000})), // user creates
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.setTokenId(tokenId , {from: user01})),
          () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                      auctionLength,timeStep,priceStep,{from: user01})), // user auctions
          () => Promise.resolve(tokenSatisfyInstance.attack({from: user01})), // contract attacks
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: user01})),
          () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.balanceOf(attacker , {from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.count.call({from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.didCreate.call({from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.didAttack.call({from: user01})),
          () => Promise.resolve(piggyInstance.getAuctionDetails.call(tokenId, {from: user01})),
          () => Promise.resolve(piggyInstance.tokenId.call({from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.returnAttackString.call({from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.xfer.call({from: user01})),
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(user01, {from: owner})),
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(piggyInstance.address, {from: owner}))
        ])
      })
      .then(result => {
        /**
        console.log("user01:   ", user01)
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[1].addresses.holder.toString())
        console.log("holder:   ", result[5].addresses.holder.toString())
        console.log("owned: ", result[7].length)
        console.log("bal before: ", userBalanceBefore.toString())
        console.log("bal after:  ", result[8].toString())
        console.log("create:  ", result[10].toString())
        console.log("attacked:  ", result[11].toString())
        console.log("on auction:  ", result[12].auctionActive.toString())
        console.log("id:  ", result[13].toString())
        console.log("return: ", result[14].toString())
        console.log("count: ", result[9].toString())
        console.log("xfer: ", result[15].toString())
        **/

        // make sure the user is the owner of the created piggy
        assert.strictEqual(result[1].addresses.holder.toString(), user01,"created piggy holder address did return correctly");

        // make sure the contract address is the owner of the created piggy
        assert.strictEqual(result[5].addresses.holder.toString(), attacker,"created piggy holder address did not return correctly");

        // make sure attack executed on attack contract
        assert.isTrue(result[11], "attack did not return true");

        // make sure the auction is now not active, executed endAuction successfully
        assert.isNotTrue(result[12].auctionActive, "auction did not return true");

        // check owned piggies accounting of user01
        assert.strictEqual(result[6].length, 0, "owned piggies did not return correctly");

        // check owned piggies accounting of attacker
        assert.strictEqual(result[7].length, 1, "owned piggies did not return correctly");

        // check tokenId count
        assert.strictEqual(result[13].toString(), tokenId.toString(), "tokenId did not return correctly");

        // make sure attack balance after equals balance before minus auction fees
        assert.strictEqual(result[8].toString(), tcBalanceBefore.sub(startPrice).add(priceStep).toString(), "contract balance did not return correctly");

        // make sure user01 balance after equals balance before plus auction premium minus collateral
        assert.strictEqual(result[16].toString(), userBalanceBefore.sub(collateral).add(startPrice).sub(priceStep).toString(), "balance comparision is not correct");

        // make sure smartpiggies balance is collateral amount
        assert.strictEqual(result[17].toString(), spBalanceBefore.add(collateral).toString(), "smartpiggies balance did not return correctly");
      })
    }); // end test

    it("Should attack with transfer on satisfyAuction with RFP but execute correctly", function() {
      //American call
      collateralERC = tokenSatisfyInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100)
      lotSize = web3.utils.toBN(1)
      strikePrice = web3.utils.toBN(27500) // writer wins, i.e. no payout
      expiry = 500
      isEuro = false
      isPut = false
      isRequest = true

      startPrice = web3.utils.toBN(100)
      reservePrice = web3.utils.toBN(10000)
      auctionLength = 100
      timeStep = web3.utils.toBN(1)
      priceStep = web3.utils.toBN(100)

      tokenId = web3.utils.toBN(1);
      oneHundred = web3.utils.toBN(100)

      let userBalanceBefore = web3.utils.toBN(0)
      let tcBalanceBefore = web3.utils.toBN(0) // token contract
      let spBalanceBefore = web3.utils.toBN(0) // smartpiggies contract
      let attacker = tokenSatisfyInstance.address

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      auctionParams = []
      return sequentialPromise([
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(user01, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(attacker, {from: owner})),
        () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(piggyInstance.address, {from: owner}))
      ])
      .then(result => {
        userBalanceBefore = web3.utils.toBN(result[0])
        tcBalanceBefore = web3.utils.toBN(result[1])
        spBalanceBefore = web3.utils.toBN(result[2])

        return sequentialPromise([
          () => Promise.resolve(piggyInstance.createPiggy(
                    params[0],params[1],params[2],params[3],
                    params[4],params[5],params[6],params[7],
                    params[8], params[9], {from: user01, gas: 8000000})), // user creates [0]
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), // [1]
          () => Promise.resolve(tokenSatisfyInstance.setTokenId(tokenId , {from: user01})), // [2]
          () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                      auctionLength,timeStep,priceStep,{from: user01})), // user auctions [3]
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(user01, {from: owner})), // [4]
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(piggyInstance.address, {from: owner})), // [5]
          () => Promise.resolve(tokenSatisfyInstance.attack({from: user01})), // contract attacks [6]
          () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})), // [7]
          () => Promise.resolve(piggyInstance.getOwnedPiggies(user01, {from: user01})), // [8]
          () => Promise.resolve(piggyInstance.getOwnedPiggies(attacker, {from: user01})), // [9]
          () => Promise.resolve(tokenSatisfyInstance.count.call({from: user01})), // [10]
          () => Promise.resolve(tokenSatisfyInstance.didCreate.call({from: user01})), // [11]
          () => Promise.resolve(tokenSatisfyInstance.didAttack.call({from: user01})), // [12]
          () => Promise.resolve(piggyInstance.getAuctionDetails.call(tokenId, {from: user01})), // [13]
          () => Promise.resolve(piggyInstance.tokenId.call({from: user01})), // [14]
          () => Promise.resolve(tokenSatisfyInstance.returnAttackString.call({from: user01})), // [15]
          () => Promise.resolve(tokenSatisfyInstance.xfer.call({from: user01})), // [16]
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(user01, {from: owner})), // [17]
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(attacker , {from: user01})), // [18]
          () => Promise.resolve(tokenSatisfyInstance.balanceOf.call(piggyInstance.address, {from: owner})), // [19]
        ])
      })
      .then(result => {
        /**
        console.log("user01:   ", user01)
        console.log("attacker: ", attacker)
        console.log("holder:   ", result[1].addresses.holder.toString())
        console.log("holder:   ", result[7].addresses.holder.toString())
        console.log("owned: ", result[9].length)
        console.log("bal before: ", userBalanceBefore.toString())
        console.log("bal after:  ", result[18].toString())
        console.log("create:  ", result[11].toString())
        console.log("attacked:  ", result[12].toString())
        console.log("on auction:  ", result[13].auctionActive.toString())
        console.log("id:  ", result[14].toString())
        console.log("return: ", result[15].toString())
        console.log("count: ", result[10].toString())
        console.log("xfer: ", result[16].toString())
        **/

        // make sure RFP has no writer
        assert.strictEqual(result[1].addresses.writer.toString(), addr00, "created piggy holder address did return correctly");

        // make sure the user is the holder of the RFP
        assert.strictEqual(result[1].addresses.holder.toString(), user01, "created piggy holder address did return correctly");

        // make sure the user is the owner of the created piggy
        assert.strictEqual(result[7].addresses.holder.toString(), user01,"created piggy holder address did not return correctly");

        // make sure contract address is the writer of the created piggy
        assert.strictEqual(result[7].addresses.writer.toString(), attacker,"created piggy holder address did not return correctly");

        // make sure attack executed on attack contract
        assert.isTrue(result[12], "attack did not return true");

        // make sure the auction is now not active, executed endAuction successfully
        assert.isNotTrue(result[13].auctionActive, "auction did not return true");

        // check owned piggies accounting of user01
        assert.strictEqual(result[8].length, 1, "owned piggies did not return correctly");

        // check owned piggies accounting of attacker
        assert.strictEqual(result[9].length, 0, "owned piggies did not return correctly");

        // check tokenId count
        assert.strictEqual(result[14].toString(), tokenId.toString(), "tokenId did not return correctly");

        // make sure attack balance after equals balance before minus auction fees
        assert.strictEqual(result[18].toString(), tcBalanceBefore.sub(collateral).add(startPrice).add(priceStep).toString(), "contract balance did not return correctly");

        // make sure user01 balance after equals balance before plus auction premium minus collateral
        assert.strictEqual(result[17].toString(), userBalanceBefore.sub(startPrice).sub(priceStep).toString(), "balance comparision is not correct");

        // make sure smartpiggies balance is collateral amount
        assert.strictEqual(result[19].toString(), spBalanceBefore.add(collateral).toString(), "smartpiggies balance did not return correctly");
      })
    }); // end test
  }); // end describe

  describe("Testing attack on requestSettlementPrice", function() {

    it("Should fail to attack if resolver calls requestSettlementPrice", function() {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverAttackInstance.address
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

      let tokenId = web3.utils.toBN(1)
      let zeroNonce = web3.utils.toBN(0)
      let count = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),

        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),

        () => Promise.resolve(piggyInstance.satisfyAuction(tokenId, zeroNonce, {from: user01})),
        () => Promise.resolve(resolverAttackInstance.setTokenId(tokenId, {from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user01})),
        () => Promise.resolve(resolverAttackInstance.count.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didAttack.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.attackReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didXfer.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.xferReturn.call({from: owner})),
        () => Promise.resolve(piggyInstance.getDetails(tokenId, {from: user01})),
      ])
      .then(result => {
        /**
        console.log("count: ", result[5].toString())
        console.log("attack: ", result[6].toString())
        console.log("a return: ", result[7].toString())
        console.log("xfer: ", result[8].toString())
        console.log("x return: ", result[9].toString())
        console.log("cleared: ", result[10][2].hasBeenCleared.toString())
        console.log("price: ", result[10][1].settlementPrice.toString())
        **/
        assert.strictEqual(result[5].toString(), count.add(one).toString(), "count did not return correctly");
        // attack should fail as the contract is the sender to the function call, but not the holder of the piggy
        assert.isNotTrue(result[6], "attack did not return false");
        assert.isTrue(result[10][2].hasBeenCleared, "token is not cleared");
        assert.strictEqual(result[10][1].settlementPrice.toString(), oraclePrice.add(one).toString(), "settlement price did not return correctly");
      })
    }); // end test

    it("Should attack if resolver calls requestSettlementPrice but execute correctly", function() {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverAttackInstance.address
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

      let tokenId = web3.utils.toBN(1)
      let zeroNonce = web3.utils.toBN(0)
      let count = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),

        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(tokenInstance.mint(dataResolver, supply, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.approve({from: owner})),
        () => Promise.resolve(resolverAttackInstance.setTokenId(tokenId, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.satisfyAuction({from: owner})),
        () => Promise.resolve(resolverAttackInstance.requestSettlement({from: owner})),
        () => Promise.resolve(piggyInstance.getDetails.call(tokenId, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.count.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didAttack.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.attackReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didXfer.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.xferReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didApprove.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.approveReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didSatisfy.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.satisfyReturn.call({from: owner})),
      ])
      .then(result => {
        /**
        console.log("count: ", result[8].toString())
        console.log("attack: ", result[9].toString())
        console.log("attk return: ", result[10].toString())
        console.log("xfer: ", result[11].toString())
        console.log("xfer return: ", result[12].toString())

        console.log("approve: ", result[13].toString())
        console.log("approve return: ", result[14].toString())

        console.log("satisfy: ", result[15].toString())
        console.log("satisfy return: ", result[16].toString())

        console.log("owner:    ", owner)
        console.log("resolver: ", dataResolver)
        console.log("holder:   ", result[7][0].holder.toString())
        console.log("cleared: ", result[7][2].hasBeenCleared.toString())
        console.log("price: ", result[7][1].settlementPrice.toString())
        **/

        /**
        assert.strictEqual(result[8].toString(), count.add(one).toString(), "count did not return correctly");
        // attack should fail as the contract is the sender to the function call, but not the holder of the piggy
        assert.isNotTrue(result[9], "attack did not return false");
        assert.isTrue(result[7][2].hasBeenCleared, "token is not cleared");
        assert.strictEqual(result[7][1].settlementPrice.toString(), oraclePrice.add(one).toString(), "settlement price did not return correctly");
        **/
        console.log("***Resolver can callback and update a price multiple times***")
      })
    }); // end test

    it("Should fail to attack if resolver calls requestSettlementPrice after token is reset", function() {
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverAttackInstance.address
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

      let tokenId = web3.utils.toBN(1)
      let zeroNonce = web3.utils.toBN(0)
      let count = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),

        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(tokenInstance.mint(dataResolver, supply, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.approve({from: owner})),
        () => Promise.resolve(resolverAttackInstance.setTokenId(tokenId, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.satisfyAuction({from: owner})),
        () => Promise.resolve(resolverAttackInstance.requestSettlement({from: owner})),
        () => Promise.resolve(piggyInstance.getDetails.call(tokenId, {from: owner})),
        () => Promise.resolve(resolverAttackInstance.count.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didAttack.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.attackReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didXfer.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.xferReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didApprove.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.approveReturn.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.didSatisfy.call({from: owner})),
        () => Promise.resolve(resolverAttackInstance.satisfyReturn.call({from: owner})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
        () => Promise.resolve(piggyInstance.getDetails.call(tokenId, {from: owner})),
      ])
      .then(result => {
        /**
        console.log("count: ", result[8].toString())
        console.log("attack: ", result[9].toString())
        console.log("attk return: ", result[10].toString())
        console.log("xfer: ", result[11].toString())
        console.log("xfer return: ", result[12].toString())

        console.log("approve: ", result[13].toString())
        console.log("approve return: ", result[14].toString())

        console.log("satisfy: ", result[15].toString())
        console.log("satisfy return: ", result[16].toString())

        console.log("owner:    ", owner)
        console.log("resolver: ", dataResolver)
        console.log("holder:   ", result[7][0].holder.toString())
        console.log("cleared: ", result[7][2].hasBeenCleared.toString())
        console.log("price: ", result[7][1].settlementPrice.toString())
        **/

        // should attack, and update appropriately
        assert.isTrue(result[9], "attack did not return true");
        assert.isTrue(result[7][2].hasBeenCleared, "token is not cleared");
        assert.strictEqual(result[7][1].settlementPrice.toString(), oraclePrice.add(one).add(one).toString(), "settlement price did not return correctly");

        // Piggy should be reset
        assert.isNotTrue(result[18][2].hasBeenCleared, "token is not cleared");
        assert.strictEqual(result[18][1].settlementPrice.toString(), zeroParam.toString(), "settlement price did not return correctly");

        return resolverAttackInstance.lastId.call({from: owner})
      })
      .then(requestId => {

        // should fail to call
        return expectedExceptionPromise(
            () => resolverAttackInstance.attackCallback(
              requestId,
              1,
              {from: owner, gas: 8000000 }),
            3000000);
      })
    }); // end test

  }); // end describe

  describe.only("Test attacking claimPayout", function() {

    it.skip("magic test that will trip the satisfyAuction mutex", function() {
      // tripped when AttackTokenClaim was not set appropriately in housekeeping
      //American put
      collateralERC = tokenInstance.address
      dataResolver = resolverAttackInstance.address
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

      let tokenId = web3.utils.toBN(1)
      let zeroNonce = web3.utils.toBN(0)
      let count = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: owner})),
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: owner})),
        () => Promise.resolve(tokenClaimInstance.setTokenId(tokenId, {from: owner})),
        () => Promise.resolve(tokenClaimInstance.satisfyAuction({from: owner})),
        () => Promise.resolve(piggyInstance.requestSettlementPrice(tokenId, 0, {from: owner})), // request tripped auction mutex
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: owner})),
        () => Promise.resolve(tokenClaimInstance.attack({from: owner})),
        () => Promise.resolve(piggyInstance.getDetails.call(tokenId, {from: owner})),
        () => Promise.resolve(tokenClaimInstance.count.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.didAttack.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.attackReturn.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.didXfer.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.xferReturn.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.didSatisfy.call({from: owner})),
        () => Promise.resolve(tokenClaimInstance.satisfyReturn.call({from: owner})),
      ])
      .then(result => {
        console.log("count: ", result[8].toString())
        console.log("attack: ", result[9].toString())
        console.log("attk return: ", result[10].toString())
        console.log("xfer: ", result[11].toString())
        console.log("xfer return: ", result[12].toString())

        console.log("satisfy: ", result[13].toString())
        console.log("satisfy return: ", result[14].toString())

        console.log("owner:    ", owner)
        console.log("resolver: ", dataResolver)
        console.log("holder:   ", result[7][0].holder.toString())
        console.log("cleared: ", result[7][2].hasBeenCleared.toString())
        console.log("price: ", result[7][1].settlementPrice.toString())
      })
    }); // end test

    it("Should attack if resolver calls requestSettlementPrice but execute correctly", function() {
      //American put
      collateralERC = tokenClaimInstance.address
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

      let tokenId = web3.utils.toBN(1)
      let zeroNonce = web3.utils.toBN(0)
      let count = web3.utils.toBN(0)

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return sequentialPromise([
        () => Promise.resolve(piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
                params[4],params[5],params[6],params[7],params[8],params[9],{from: user01})),
        () => Promise.resolve(piggyInstance.startAuction(tokenId,startPrice,reservePrice,
                auctionLength,timeStep,priceStep,{from: user01})),
        () => Promise.resolve(tokenClaimInstance.setTokenId(tokenId, {from: user01})),
        () => Promise.resolve(tokenClaimInstance.satisfyAuction({from: user01})),
        () => Promise.resolve(tokenClaimInstance.requestSettlement({from: user01})),
        () => Promise.resolve(piggyInstance.settlePiggy(tokenId, {from: user01})),
        () => Promise.resolve(tokenClaimInstance.attack({from: user01})),
        () => Promise.resolve(piggyInstance.getDetails.call(tokenId, {from: user01})),
        () => Promise.resolve(tokenClaimInstance.count.call({from: user01})),
        () => Promise.resolve(tokenClaimInstance.didAttack.call({from: user01})),
        () => Promise.resolve(tokenClaimInstance.attackReturn.call({from: user01})),
        () => Promise.resolve(tokenClaimInstance.xfer.call({from: user01})),
        () => Promise.resolve(tokenClaimInstance.didSatisfy.call({from: user01})),
        () => Promise.resolve(tokenClaimInstance.satisfyReturn.call({from: user01})),
      ])
      .then(result => {
        console.log("count: ", result[8].toString())
        console.log("attack: ", result[9].toString())
        console.log("attk return: ", result[10].toString())
        console.log("xfer: ", result[11].toString())
        console.log("xfer return: ", result[12].toString())

        console.log("satisfy: ", result[12].toString())
        console.log("satisfy return: ", result[13].toString())

        console.log("owner:    ", owner)
        console.log("resolver: ", dataResolver)
        console.log("holder:   ", result[7][0].holder.toString())
        console.log("cleared: ", result[7][2].hasBeenCleared.toString())
        console.log("price: ", result[7][1].settlementPrice.toString())
      })
    }); // end test

  }); // end describe

}); // end unit test
