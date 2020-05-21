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
        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user02})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner}))
      ])
    });
  });

  describe("Testing service fee parameters", function() {

    it("Should set default fee paramaters correclty", function() {
      return piggyInstance.feeAddress.call({from: owner})
      .then(result => {
        assert.strictEqual(result, owner, "feeAddress did not return correct address");
        return piggyInstance.feePercent.call({from: owner});
      })
      .then(result => {
        /* BN compare if == returns 0 */
        assert.strictEqual(0, result.cmp(DEFAULT_FEE_PERCENT), "feePercent didn't return correct default value");
        return piggyInstance.feeResolution.call({from: owner});
      })
      .then(result => {
        /* BN compare if == returns 0 */
        assert.strictEqual(0, result.cmp(DEFAULT_FEE_RESOLUTION), "feeResolution did not return correct default value");
      });
    }); // end test block

    it("Should set feeAddress correclty", function() {
      return piggyInstance.setFeeAddress(feeAddress, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeeAddress status did not return true");
        assert.strictEqual(result.logs[0].event, "FeeAddressSet", "setFeeAddress event did not return correct name");
        assert.strictEqual(result.logs[0].args.from, owner, "setFeeAddress event did not return correct sender");
        assert.strictEqual(result.logs[0].args.newAddress, feeAddress, "setFeeAddress event did not return correct feeAddress");
        return piggyInstance.feeAddress.call({from: owner})
      })
      .then(result => {
        assert.strictEqual(result, feeAddress, "feeAddress did not return correct address");
      });
    }); // end test block

    it("Should set fee percent param correclty", function() {
      let newFeePercent = web3.utils.toBN("123");
      return piggyInstance.setFeePercent(newFeePercent, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeePercent status did not return true");
        assert.strictEqual(result.logs[0].event, "FeeSet", "FeeSet event did not return correct name");
        assert.strictEqual(result.logs[0].args.from, owner, "FeeSet event did not return correct sender");
        assert.strictEqual(result.logs[0].args.newFee.toString(), newFeePercent.toString(), "FeeSet event did not return correct value");
        return piggyInstance.feePercent.call({from: owner});
      })
      .then(result => {
        assert.strictEqual(0, result.cmp(newFeePercent), "feePercent did not return correct value");
      });
    }); // end test block

    it("Should set fee resolution param correclty", function() {
      let newFeeResolution = web3.utils.toBN("456");
      return piggyInstance.setFeeResolution(newFeeResolution, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeeResolution status did not return true");
        assert.strictEqual(result.logs[0].event, "ResolutionSet", "ResolutionSet event did not return correct name");
        assert.strictEqual(result.logs[0].args.from, owner, "ResolutionSet event did not return correct sender");
        assert.strictEqual(result.logs[0].args.newResolution.toString(), newFeeResolution.toString(), "ResolutionSet event did not return correct value");
        return piggyInstance.feeResolution.call({from: owner});
      })
      .then(result => {
        assert.strictEqual(0, result.cmp(newFeeResolution), "feeResolution did not return correct value");
      });
    }); // end test block

    it("Should fail to set feeAddress if sender is not the owner", function() {
      return expectedExceptionPromise(
        () => piggyInstance.setFeeAddress(
          user01,
          {from: user01, gas: 8000000 }),
          3000000);
    }); // end test block

    it("Should fail to set feePercent if sender is not the owner", function() {
      let feePercent = web3.utils.toBN(0);
      return expectedExceptionPromise(
        () => piggyInstance.setFeePercent(
          feePercent,
          {from: user01, gas: 8000000 }),
          3000000);
    }); // end test block

    it("Should fail to set feeResolution if sender is not the owner", function() {
      let feeResolution = web3.utils.toBN(100);
      return expectedExceptionPromise(
        () => piggyInstance.setFeeResolution(
          feeResolution,
          {from: user01, gas: 8000000 }),
          3000000);
    }); // end test block

    it("Should fail to set feeResolution if new resolution is 0", function() {
      let feeResolution = web3.utils.toBN(0);
      return expectedExceptionPromise(
        () => piggyInstance.setFeeResolution(
          feeResolution,
          {from: owner, gas: 8000000 }),
          3000000);
    }); // end test block

  }); // end describe

  /* Test American Put fee payout */
  describe("Testing service fee functionality", function() {

    it("Should settle service fee with total payout to holder", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 26000 // oracle price returns 27000
      expiry = 500
      isEuro = false
      isPut = false
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
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.setFeeAddress(feeAddress, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeeAddress status did not return true");
        return piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true");
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result;
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true");
        //mint link tokens for user01
        return linkInstance.mint(user02, supply, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint function did not return true");
        //approve LINK transfer on behalf of the new holder (user01)
        return linkInstance.approve(resolverInstance.address, approveAmount, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve function did not return true");
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01});
      })
      .then(result => {
        settlementPriceBN = web3.utils.toBN(result[1].settlementPrice);
        assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly");
        //get the ERC20 balance for the writer
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        user01BalanceBefore = result;
        //get the ERC20 balance for the holder
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: user02});
      })
      .then(result => {
        user02BalanceBefore = result;
        return piggyInstance.settlePiggy(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true");
        /* get fee percent */
        return piggyInstance.feePercent.call({from: owner});
      })
      .then(result => {
        feePercent = web3.utils.toBN(result);
        return piggyInstance.feeResolution.call({from: owner});
      })
      .then(result => {
        resolution = web3.utils.toBN(result)
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize);

        //we are 100x off because of the cents inclusion in the price
        payout = settlementPriceBN.sub(strikePriceBN).mul(lotSizeBN).mul(decimals).idivn(100);
        /* make sure there is a payout to holder */
        if (payout.isNeg()) {
          payout = web3.utils.toBN(0);
        }
        fee = payout.mul(feePercent).div(resolution);
        assert.strictEqual(balance.toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "writer balance did not return 0")
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), user02BalanceBefore.add(payout).sub(fee).toString(), "holder balance did not return correctly");
        return piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        /* service fee should equal the balance, i.e. .cmp() == 0 */
        assert.strictEqual(0, balance.cmp(fee), "service fee did not return correclty");

        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: feeAddress})), //[0]
          () => Promise.resolve(piggyInstance.claimPayout(tokenInstance.address, fee, {from: feeAddress})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(feeAddress, {from: feeAddress})), //[2]
        ]);
      })
      .then(result => {
        let balanceBefore = web3.utils.toBN(result[0]);
        let balanceAfter = web3.utils.toBN(result[2]);
        assert.strictEqual(0, balanceAfter.cmp(balanceBefore.add(fee)), "balance after withdraw did not reconcile");

        /* transfer fee forward */
        return sequentialPromise([
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[0]
          () => Promise.resolve(tokenInstance.transfer(owner, fee, {from: feeAddress})), //[1]
          () => Promise.resolve(tokenInstance.balanceOf(owner, {from: owner})), //[2]
        ]);
      })
      .then(result => {
        balanceBefore = web3.utils.toBN(result[0]);
        balanceAfter = web3.utils.toBN(result[2]);
        assert.strictEqual(0, balanceAfter.cmp(balanceBefore.add(fee)), "balance after withdraw did not reconcile");
      });
    }); //end test block

    it("Should settle service fee with total payout to writer", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 28000 // oracle price returns 27000
      expiry = 500
      isEuro = false
      isPut = false
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
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.setFeeAddress(feeAddress, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeeAddress status did not return true");
        return piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true");
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result;
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true");
        //mint link tokens for user01
        return linkInstance.mint(user02, supply, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint function did not return true");
        //approve LINK transfer on behalf of the new holder (user01)
        return linkInstance.approve(resolverInstance.address, approveAmount, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve function did not return true");
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01});
      })
      .then(result => {
        settlementPriceBN = web3.utils.toBN(result[1].settlementPrice);
        assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly");
        //get the ERC20 balance for the writer
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        user01BalanceBefore = result;
        //get the ERC20 balance for the holder
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: user02});
      })
      .then(result => {
        user02BalanceBefore = result;
        return piggyInstance.settlePiggy(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true");
        /* get fee percent */
        return piggyInstance.feePercent.call({from: owner});
      })
      .then(result => {
        feePercent = web3.utils.toBN(result);
        return piggyInstance.feeResolution.call({from: owner});
      })
      .then(result => {
        resolution = web3.utils.toBN(result)
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize);

        /* we are 100x off because of the cents inclusion in the price */
        payout = settlementPriceBN.sub(strikePriceBN).mul(lotSizeBN).mul(decimals).idivn(100);
        if (payout.isNeg()) {
          payout = web3.utils.toBN(0);
        }
        /* payout === collateral returned to writer */
        assert.strictEqual(balance.toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "writer balance did not return correctly")
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), user02BalanceBefore.add(payout).toString(), "holder balance did not return correctly");
        return piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        /* should not be a fee if there is no payout */
        assert.strictEqual(balance.toString(), "0", "service fee did not return correclty");
      });
      //end test block
    });

    it("Should settle service fee with split payout", function() {
      collateralERC = tokenInstance.address
      dataResolver = resolverInstance.address
      collateral = web3.utils.toBN(100 * decimals)
      lotSize = 10
      strikePrice = 26500 // oracle price returns 27000
      expiry = 500
      isEuro = false
      isPut = false
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
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

      return piggyInstance.setFeeAddress(feeAddress, {from: owner})
      .then(result => {
        assert.isTrue(result.receipt.status, "setFeeAddress status did not return true");
        return piggyInstance.createPiggy(
          params[0],params[1],params[2],params[3],
          params[4],params[5],params[6],params[7],
          params[8],params[9],
          {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "create did not return true");
        return piggyInstance.tokenId({from: owner});
      })
      .then(result => {
        //use last tokenId created
        tokenId = result;
        return piggyInstance.transferFrom(user01, user02, tokenId, {from: user01});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "transfer function did not return true");
        //mint link tokens for user01
        return linkInstance.mint(user02, supply, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "mint function did not return true");
        //approve LINK transfer on behalf of the new holder (user01)
        return linkInstance.approve(resolverInstance.address, approveAmount, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "approve function did not return true");
        //clear piggy (request the price from the oracle)
        return piggyInstance.requestSettlementPrice(tokenId, oracleFee, {from: user02});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "requestSettlementPrice function did not return true")
        return piggyInstance.getDetails(tokenId, {from: user01});
      })
      .then(result => {
        settlementPriceBN = web3.utils.toBN(result[1].settlementPrice);
        assert.strictEqual(result[1].settlementPrice, '27000', "settlementPrice did not return correctly");
        //get the ERC20 balance for the writer
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: user01});
      })
      .then(result => {
        user01BalanceBefore = result;
        //get the ERC20 balance for the holder
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: user02});
      })
      .then(result => {
        user02BalanceBefore = result;
        return piggyInstance.settlePiggy(tokenId, {from: owner});
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "settlePiggy function did not return true");
        /* get fee percent */
        return piggyInstance.feePercent.call({from: owner});
      })
      .then(result => {
        feePercent = web3.utils.toBN(result);
        return piggyInstance.feeResolution.call({from: owner});
      })
      .then(result => {
        resolution = web3.utils.toBN(result)
        return piggyInstance.getERC20Balance(user01, tokenInstance.address, {from: owner})
      })
      .then(balance => {
        lotSizeBN = web3.utils.toBN(lotSize);

        /* we are 100x off because of the cents inclusion in the price */
        payout = settlementPriceBN.sub(strikePriceBN).mul(lotSizeBN).mul(decimals).idivn(100);
        /* make sure there is a payout to holder */
        if (payout.isNeg()) {
          payout = web3.utils.toBN(0);
        }
        fee = payout.mul(feePercent).div(resolution);
        assert.strictEqual(balance.toString(), user01BalanceBefore.add(collateral).sub(payout).toString(), "writer balance did not return correctly")
        return piggyInstance.getERC20Balance(user02, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        assert.strictEqual(balance.toString(), user02BalanceBefore.add(payout).sub(fee).toString(), "holder balance did not return correctly");
        return piggyInstance.getERC20Balance(feeAddress, tokenInstance.address, {from: owner});
      })
      .then(balance => {
        /* should not be a fee if there is no payout */
        assert.strictEqual(0, balance.cmp(fee), "service fee did not return correclty");
      });
      //end test block
    });

  //end describe American Put block
  });



}); //end test
