Promise = require("bluebird");
var AttackToken = artifacts.require("./AttackToken.sol");
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

  var tokenInstance;
  var linkInstance;
  var piggyInstance;
  var resolverInstance;
  var owner = accounts[0];
  var user01 = accounts[1];
  var user02 = accounts[2];
  var user03 = accounts[3];
  var user04 = accounts[4];
  var user05 = accounts[5];
  var feeAddress = accounts[6];
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
  var oraclePrice = web3.utils.toBN(27000); //including hundreth of a cent
  let zeroNonce = web3.utils.toBN(0)

  /* default feePercent param = 50 */
  const DEFAULT_FEE_PERCENT = web3.utils.toBN(50);
  /* default feePercent param = 10,000 */
  const DEFAULT_FEE_RESOLUTION = web3.utils.toBN(10000);

  beforeEach(function() {
    //console.log(JSON.stringify("symbol: " + result, null, 4));
    return AttackToken.new({from: owner})
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

      /* setup housekeeping */
      return sequentialPromise([
        () => Promise.resolve(tokenInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(tokenInstance.mint(user01, supply, {from: owner})),

        () => Promise.resolve(linkInstance.mint(owner, supply, {from: owner})),
        () => Promise.resolve(linkInstance.mint(user01, supply, {from: owner})),

        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(tokenInstance.approve(piggyInstance.address, approveAmount, {from: user01})),

        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: owner})),
        () => Promise.resolve(linkInstance.approve(resolverInstance.address, approveAmount, {from: user01})),

        () => Promise.resolve(piggyInstance.setFeeAddress(feeAddress, {from: owner})),
        () => Promise.resolve(tokenInstance.setAddress(piggyInstance.address, {from: owner})) //set attack address
      ])
    });
  });

  describe("Test fallback call to createPiggy", function() {

    it("Should make 10 piggies on 9 calls from the fallback", function() {
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

      params = [collateralERC,dataResolver,addr00,collateral,
        lotSize,strikePrice,expiry,isEuro,isPut,isRequest];

/**
      return piggyInstance.createPiggy(params[0],params[1],params[2],params[3],
              params[4],params[5],params[6],params[7],params[8],params[9], {from: owner}
      )
      .then(result => {
          assert.isTrue(result.receipt.status, "createPiggy tx receipt did not return true");
      })
**/

      return tokenInstance.allowance(owner, piggyInstance.address, {from: owner})
      .then(result => {
        assert.strictEqual(result.toString(), approveAmount, "allowance did not return correctly");

        return tokenInstance.attack({from: owner, gas: 8000000})
      })
      .then(result => {
        assert.isTrue(result.receipt.status, "attack tx did not return true")

        return piggyInstance.tokenId.call({from: owner})
      })
      .then(result => {
        console.log("tokenId: ", result.toString())

        return tokenInstance.count.call({from: owner})
      })
      .then(result => {
        console.log("count: ", result.toString())

        return tokenInstance.didAttack.call()
      })
      .then(result => {
        console.log("attack: ", result.toString())
      })
    }); // end test
  }); // end describe

}); // end unit test
