/**
SmartPiggies is an open source standard for
a free peer to peer global derivatives market

Copyright (C) 2019, Arief, Algya, Lee

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
**/
pragma solidity 0.5.17;
pragma experimental ABIEncoderV2;

// thank you openzeppelin for SafeMath
import "./SafeMath.sol";

contract Owned {
  address payable public owner;
  constructor() public {
    owner = msg.sender;
  }

  event ChangedOwner(address indexed from, address indexed newOwner);

  modifier onlyOwner() {
    require(msg.sender != address(0));
    require(msg.sender == owner);
    _;
  }

  function getOwner() public view returns (address) {
    return owner;
  }

  function changeOwner(address payable _newOwner)
    public
    onlyOwner
    returns (bool)
  {
    require(msg.sender != address(0));
    owner = _newOwner;
    emit ChangedOwner(msg.sender, _newOwner);
    return true;
  }
}


contract Administered is Owned {
  mapping(address => bool) private administrators;
  constructor(address _admin) public {
    administrators[_admin] = true;
  }

  event AddedAdmin(address indexed from, address indexed newAdmin);
  event DeletedAdmin(address indexed from, address indexed oldAdmin);

  modifier onlyAdmin() {
    // admin is an administrator or owner
    require(msg.sender != address(0));
    require(administrators[msg.sender] || msg.sender == owner);
    _;
  }

  function isAdministrator(address _admin)
    public
    view
    returns (bool)
  {
    return administrators[_admin];
  }

  function addAdministrator(address _newAdmin)
    public
    onlyAdmin
    returns (bool)
  {
    administrators[_newAdmin] = true;
    emit AddedAdmin(msg.sender, _newAdmin);
    return true;
  }

  function deleteAdministrator(address _admin)
    public
    onlyAdmin
    returns (bool)
  {
    administrators[_admin] = false;
    emit DeletedAdmin(msg.sender, _admin);
    return true;
  }
}


contract Freezable is Administered {
  bool public notFrozen;
  constructor() public {
    notFrozen = true;
  }

  event Frozen(address indexed from);
  event Unfrozen(address indexed from);

  modifier whenNotFrozen() {
  require(notFrozen, "contract frozen");
  _;
  }

  function isNotFrozen()
    public
    view
    returns (bool)
  {
    return notFrozen;
  }

  function freeze()
    public
    onlyAdmin
    returns (bool)
  {
    notFrozen = false;
    emit Frozen(msg.sender);
    return true;
  }

  function unfreeze()
    public
    onlyAdmin
    returns (bool)
  {
    notFrozen = true;
    emit Unfrozen(msg.sender);
    return true;
  }
}


contract Serviced is Freezable {
  using SafeMath for uint256;

  address payable public feeAddress;
  uint8   public feePercent;
  uint16  public feeResolution;

  event FeeAddressSet(address indexed from, address indexed newAddress);
  event FeeSet(address indexed from, uint8 indexed newFee);
  event ResolutionSet(address indexed from, uint16 newResolution);

  constructor(address payable _feeAddress)
    public
  {
    feeAddress = _feeAddress;
    feePercent = 50;
    feeResolution = 10**4;
  }

  function getFeeAddress()
    public
    view
    returns (address)
  {
    return feeAddress;
  }

  function setFeeAddress(address payable _newAddress)
    public
    onlyAdmin
    returns (bool)
  {
    feeAddress = _newAddress;
    emit FeeAddressSet(msg.sender, _newAddress);
    return true;
  }

  function setFeePercent(uint8 _newFee)
    public
    onlyAdmin
    returns (bool)
  {
    feePercent = _newFee;
    emit FeeSet(msg.sender, _newFee);
    return true;
  }

  function setFeeResolution(uint16 _newResolution)
    public
    onlyAdmin
    returns (bool)
  {
    require(_newResolution != 0);
    feeResolution = _newResolution;
    emit ResolutionSet(msg.sender, _newResolution);
    return true;
  }

  function _getFee(uint256 _value)
    internal
    view
    returns (uint256)
  {
    uint256 fee = _value.mul(feePercent).div(feeResolution);
    return fee;
  }
}


contract UsingCooldown is Serviced {
  uint256 public cooldown;

  event CooldownSet(address indexed from, uint256 _newCooldown);

  constructor()
    public
  {
    // 4blks/min * 60 min/hr * 24hrs/day * # days
    cooldown = 17280; // default 3 days
  }

  function setCooldown(uint256 _newCooldown)
    public
    onlyAdmin
    returns (bool)
  {
    cooldown = _newCooldown;
    emit CooldownSet(msg.sender, _newCooldown);
    return true;
  }
}


/** @title SmartPiggies: A Smart Option Standard
*/
contract SmartPiggiesBidding is UsingCooldown {
  using SafeMath for uint256;

  bytes32 constant TX_SUCCESS = bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);
  uint256 public tokenId;

  /**
   * @title Helps contracts guard against reentrancy attacks.
   * @author Remco Bloemen <remco@2π.com>, Eenae <alexey@mixbytes.io>
   * @dev If you mark a function `nonReentrant`, you should also
   * mark it `external`.
   */
  uint256 private _guardCounter;

    /**
  struct DetailAddresses {
    address writer;
    address holder;
    address collateralERC;
    address dataResolver;
    address arbiter;
    address writerProposedNewArbiter;
    address holderProposedNewArbiter;
  }

  struct DetailUints {
    uint256 collateral;
    uint256 lotSize;
    uint256 strikePrice;
    uint256 bidLimit;
    uint256 expiry;
    uint256 settlementPrice; //04.20.20 oil price is negative :9
    uint256 reqCollateral;
    uint256 arbitrationLock;
    uint256 writerProposedPrice;
    uint256 holderProposedPrice;
    uint256 arbiterProposedPrice;
    uint8 collateralDecimals;  // store decimals from ERC-20 contract
    uint8 rfpNonce;
  }

  struct BoolFlags {
    bool isRequest;
    bool isEuro;
    bool isPut;
    bool hasBeenCleared;  // flag whether the oracle returned a callback w/ price
    bool writerHasProposedNewArbiter;
    bool holderHasProposedNewArbiter;
    bool writerHasProposedPrice;
    bool holderHasProposedPrice;
    bool arbiterHasProposedPrice;
    bool arbiterHasConfirmed;
    bool arbitrationAgreement;
  }

  struct DetailAuction {
    uint256 startBlock;
    uint256 expiryBlock;
    uint256 startPrice;
    uint256 reservePrice;
    uint256 timeStep;
    uint256 priceStep;
    bool auctionActive;
    bool satisfyInProgress;  // mutex guard to disallow ending an auction if a transaction to satisfy is in progress
  }

  struct Piggy {
    DetailAddresses addresses; // address details
    DetailUints uintDetails; // number details
    BoolFlags flags; // parameter switches
  }
  **/

  struct DetailAuction {
    uint256 startBlock;
    uint256 expiryBlock;
    uint256 startPrice;
    uint256 reservePrice;
    uint256 timeStep;
    uint256 priceStep;
    uint256 limitPrice;
    uint256 oraclePrice;
    uint256 auctionPremium;
    address activeBidder;
    bool auctionActive;
    bool bidLimitSet;
    bool bidLocked;
    bool bidCleared;
    bool satisfyInProgress;  // mutex guard to disallow ending an auction if a transaction to satisfy is in progress
  }

  struct Piggy {
    address[7] addresses;
    uint256[11] uintDetails;
    uint8[2] counters;
    bool[11] flags;
  }

  mapping (address => mapping(address => uint256)) private ERC20balances;
  mapping (address => uint256) private bidBalances;
  mapping (address => uint256[]) private ownedPiggies;
  mapping (uint256 => uint256) private ownedPiggiesIndex;
  mapping (uint256 => Piggy) private piggies;
  mapping (uint256 => DetailAuction) private auctions;

  /** Events
  */

  event CreatePiggy(
    address[] addresses,
    uint256[] ints,
    bool[] bools
  );

  event TransferPiggy(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
  );

  event UpdateRFP(
    address indexed from,
    uint256 indexed tokenId,
    uint8 indexed rfpNonce,
    address collateralERC,
    address dataResolver,
    address arbiter,
    uint256 reqCollateral,
    uint256 lotSize,
    uint256 strikePrice,
    uint256 expiry,
    bool isEuro,
    bool isPut
  );

  event ReclaimAndBurn(
    address indexed from,
    uint256 indexed tokenId,
    bool indexed RFP
  );

  event StartAuction(
    address indexed from,
    uint256 indexed tokenId,
    uint256 startPrice,
    uint256 reservePrice,
    uint256 auctionLength,
    uint256 timeStep,
    uint256 priceStep
  );

  event EndAuction(
    address indexed from,
    uint256 indexed tokenId,
    bool indexed RFP
  );

  event SatisfyAuction(
    address indexed from,
    uint256 indexed tokenId,
    uint256 paidPremium,
    uint256 change,
    uint256 auctionPremium
  );

  event RequestSettlementPrice(
    address indexed feePayer,
    uint256 indexed tokenId,
    uint256 oracleFee,
    address dataResolver
  );

  event OracleReturned(
    address indexed resolver,
    uint256 indexed tokenId,
    uint256 indexed price
  );

  event SettlePiggy(
   address indexed from,
   uint256 indexed tokenId,
   uint256 indexed holderPayout,
   uint256 writerPayout
  );

  event ClaimPayout(
    address indexed from,
    uint256 indexed amount,
    address indexed paymentToken
  );

  event ProposalRequest(
    address indexed from,
    uint256 indexed tokenId,
    uint256 indexed proposalAmount
  );

  event ArbiterSet(
    address indexed from,
    address indexed arbiter,
    uint256 indexed tokenId
  );

  event ArbiterConfirmed(
    address indexed arbiter,
    uint256 indexed tokenId
  );

  event PriceProposed(
    address indexed from,
    uint256 indexed tokenId,
    uint256 indexed proposedPrice
  );

  event ArbiterSettled(
    address indexed from,
    address arbiter,
    uint256 indexed tokenId,
    uint256 indexed exercisePrice
  );

  /**
    constructor should throw if various things aren't properly set
    also should throw if the contract is not delegated an amount of collateral designated
    in the reference ERC-20 which is >= the collateral value of the piggy
  */
  constructor()
    public
    Administered(msg.sender)
    Serviced(msg.sender)
  {
    //declarations here
    _guardCounter = 1;
  }

  modifier nonReentrant() {
    // guard counter should be allowed to overflow
    _guardCounter += 1;
    uint256 localCounter = _guardCounter;
    _;
    require(localCounter == _guardCounter, "re-entered");
  }

  function createPiggy(
    address _collateralERC,
    address _dataResolver,
    address _arbiter,
    uint256 _collateral,
    uint256 _lotSize,
    uint256 _strikePrice,
    uint256 _bidLimit,
    uint256 _expiry,
    bool _isEuro,
    bool _isPut
  )
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
  {
    require(
      _collateralERC != address(0) &&
      _dataResolver != address(0),
      "address cannot be zero"
    );
    require(
      _collateral != 0 &&
      _lotSize != 0 &&
      _strikePrice != 0 &&
      _expiry != 0,
      "parameter cannot be zero"
    );

    require(
      _constructPiggy(
        _collateralERC,
        _dataResolver,
        _arbiter,
        _collateral,
        _lotSize,
        _strikePrice,
        _bidLimit,
        _expiry,
        _isEuro,
        _isPut,
        false
      ),
      "create failed"
    );
    // *** warning untrusted function call ***
    // if not an RFP, make sure the collateral can be transferred
      (bool success, bytes memory result) = attemptPaymentTransfer(
        _collateralERC,
        msg.sender,
        address(this),
        _collateral
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");
    return true;
  }

  function requestPiggy(
    address _collateralERC,
    address _dataResolver,
    address _arbiter,
    uint256 _collateral,
    uint256 _lotSize,
    uint256 _strikePrice,
    uint256 _bidLimit,
    uint256 _expiry,
    bool _isEuro,
    bool _isPut
  )
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
  {
    require(
      _collateralERC != address(0) &&
      _dataResolver != address(0),
      "address cannot be zero"
    );
    require(
      _collateral != 0 &&
      _lotSize != 0 &&
      _strikePrice != 0 &&
      _expiry != 0,
      "parameter cannot be zero"
    );

    require(
      _constructPiggy(
        _collateralERC,
        _dataResolver,
        _arbiter,
        _collateral,
        _lotSize,
        _strikePrice,
        _bidLimit,
        _expiry,
        _isEuro,
        _isPut,
        true
      ),
      "create failed"
    );

    return true;
  }


  /**
   * This will destroy the piggy and create two new piggies
   * the first created piggy will get the collateral less the amount
   * the second piggy will get the specified amount as collateral
   */
  function splitPiggy(
    uint256 _tokenId,
    uint256 _amount
  )
    public
    whenNotFrozen
    returns (bool)
  {
    require(_tokenId != 0, "tokenId cannot be zero");
    require(_amount != 0, "amount cannot be zero");
    require(_amount < piggies[_tokenId].uintDetails[0], "amount must be less than collateral");
    require(!piggies[_tokenId].flags[0], "cannot be an RFP");
    require(piggies[_tokenId].uintDetails[0] > 0, "collateral must be greater than zero");
    require(piggies[_tokenId].addresses[1] == msg.sender, "only the holder can split");
    require(block.number < piggies[_tokenId].uintDetails[4], "cannot split expired token");
    require(!auctions[_tokenId].auctionActive, "cannot split token on auction");
    require(!piggies[_tokenId].flags[3], "cannot split cleared token");

    // assuming all checks have passed:

    // remove current token ID
    _removeTokenFromOwnedPiggies(msg.sender, _tokenId); // i.e. piggies[_tokenId].addresses.holder

    require(
      _splitPiggy(
        _tokenId,
        piggies[_tokenId].uintDetails[0].sub(_amount) // piggy with collateral less the amount
      ),
      "create failed"
    ); // require this to succeed or revert, i.e. do not reset

    require(
      _splitPiggy(
        _tokenId,
        _amount
      ),
      "create failed"
    ); // require this to succeed or revert, i.e. do not reset

    //clean up piggyId
    _resetPiggy(_tokenId);

    return true;
  }

  function transferFrom(address _from, address _to, uint256 _tokenId)
    public
  {
    require(msg.sender == piggies[_tokenId].addresses[1], "sender must be the holder");
    _internalTransfer(_from, _to, _tokenId);
  }

  function updateRFP(
    uint256 _tokenId,
    address _collateralERC,
    address _dataResolver,
    address _arbiter,
    uint256 _reqCollateral,
    uint256 _lotSize,
    uint256 _strikePrice,
    uint256 _expiry,
    bool _isEuro,  // MUST be specified
    bool _isPut    // MUST be specified
  )
    public
    whenNotFrozen
    returns (bool)
  {
    require(piggies[_tokenId].addresses[1] == msg.sender, "sender must be the holder");
    require(piggies[_tokenId].flags[0], "you can only update an RFP");
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    uint256 expiryBlock;
    if (_collateralERC != address(0)) {
      piggies[_tokenId].addresses[2] = _collateralERC;
    }
    if (_dataResolver != address(0)) {
      piggies[_tokenId].addresses[3] = _dataResolver;
    }
    if (_arbiter != address(0)) {
      piggies[_tokenId].addresses[4] = _arbiter;
    }
    if (_reqCollateral != 0) {
      piggies[_tokenId].uintDetails[6] = _reqCollateral;
    }
    if (_lotSize != 0) {
      piggies[_tokenId].uintDetails[1] = _lotSize;
    }
    if (_strikePrice != 0 ) {
      piggies[_tokenId].uintDetails[2] = _strikePrice;
    }
    if (_expiry != 0) {
      // recalculate expiry calculation
      expiryBlock = _expiry.add(block.number);
      piggies[_tokenId].uintDetails[4] = expiryBlock;
    }
    // Both must be specified
    piggies[_tokenId].flags[1] = _isEuro;
    piggies[_tokenId].flags[2] = _isPut;

    // increment update nonce
    // protects fulfiller from auction front running
    ++piggies[_tokenId].counters[1];

    emit UpdateRFP(
      msg.sender,
      _tokenId,
      piggies[_tokenId].counters[1],
      _collateralERC,
      _dataResolver,
      _arbiter,
      _reqCollateral,
      _lotSize,
      _strikePrice,
      expiryBlock,
      _isEuro,
      _isPut
    );

    return true;
  }

  /** this function can be used to burn any token;
      if it is not an RFP, will return collateral before burning
  */
  function reclaimAndBurn(uint256 _tokenId)
    external
    nonReentrant
    returns (bool)
  {
    require(msg.sender == piggies[_tokenId].addresses[1], "sender must be the holder");
    require(!auctions[_tokenId].auctionActive, "token cannot be on auction");

    emit ReclaimAndBurn(msg.sender, _tokenId, piggies[_tokenId].flags[0]);
    // remove id from index mapping
    _removeTokenFromOwnedPiggies(piggies[_tokenId].addresses[1], _tokenId);

    if (!piggies[_tokenId].flags[0]) {
      require(msg.sender == piggies[_tokenId].addresses[0], "sender must own collateral to reclaim it");

      // keep collateralERC address
      address collateralERC = piggies[_tokenId].addresses[2];
      // keep collateral
      uint256 collateral = piggies[_tokenId].uintDetails[0];
      // burn the token (zero out storage fields)
      _resetPiggy(_tokenId);

      // *** warning untrusted function call ***
      // return the collateral to sender
      (bool success, bytes memory result) = address(collateralERC).call(
        abi.encodeWithSignature(
          "transfer(address,uint256)",
          msg.sender,
          collateral
        )
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");
    }
    // burn the token (zero out storage fields)
    _resetPiggy(_tokenId);
    return true;
  }

function bidOnPiggyAuction(
uint256 _tokenId,
uint256 _oralceFee

    )
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
{
    // require token on auction
    require(!auctions[_tokenId].auctionActive, "auction cannot be running");
    require(piggies[_tokenId].addresses[1] != msg.sender, "cannot bid on your auction");
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    require(!auctions[_tokenId].bidLocked, "auction bidding locked");

    // set bidder
    auctions[_tokenId].activeBidder = msg.sender;
    // lock bidding
    auctions[_tokenId].bidLocked = true;

    // get linear auction premium; reserve price should be a ceiling or floor depending on whether this is an RFP or an option, respectively
    uint256 _auctionPremium = _getAuctionPrice(_tokenId);

    // save auction premium paid
    auctions[_tokenId].auctionPremium = _auctionPremium;
    // update bidder's balance
    bidBalances[msg.sender] = _auctionPremium;

    // calculate the adjusted premium based on reservePrice
      uint256 _adjPremium = _auctionPremium;
      if (_adjPremium < auctions[_tokenId].reservePrice) {
        _adjPremium = auctions[_tokenId].reservePrice;
      }
      // *** warning untrusted function call ***
      // msg.sender pays (adjusted) premium
      (bool success, bytes memory result) = attemptPaymentTransfer(
        piggies[_tokenId].addresses[2],
        msg.sender,
        address(this),
        _adjPremium
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");

}

function bidOnRequestAuction(
uint256 _tokenId,
uint256 _oralceFee

    )
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
{
    // require token on auction
    require(!auctions[_tokenId].auctionActive, "auction cannot be running");
    require(piggies[_tokenId].addresses[1] != msg.sender, "cannot bid on your auction");
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    require(!auctions[_tokenId].bidLocked, "auction bidding locked");

    // set bidder
    auctions[_tokenId].activeBidder = msg.sender;
    // lock bidding
    auctions[_tokenId].bidLocked = true;

    // get linear auction premium; reserve price should be a ceiling or floor depending on whether this is an RFP or an option, respectively
    uint256 _auctionPremium = _getAuctionPrice(_tokenId);
    uint256 _adjPremium = 0;
    uint256 _change = 0;

    // save auction premium paid
    auctions[_tokenId].auctionPremium = _auctionPremium;
    // update bidder's balance
    bidBalances[msg.sender] = _auctionPremium;

    // calculate the adjusted premium based on reservePrice
      _adjPremium = _auctionPremium;
      if (_adjPremium < auctions[_tokenId].reservePrice) {
        _adjPremium = auctions[_tokenId].reservePrice;
      }

     bool success; // return bool from a token transfer
    bytes memory result; // return data from a token transfer
    bytes32 txCheck; // bytes32 check from a token transfer

      // *** warning untrusted function call ***
      // msg.sender needs to delegate reqCollateral
      (success, result) = attemptPaymentTransfer(
        piggies[_tokenId].addresses[2],
        msg.sender,
        address(this),
        piggies[_tokenId].uintDetails[6]
      );
      txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");

      // if the collateral transfer succeeded, reqCollateral gets set to collateral
      piggies[_tokenId].uintDetails[0] = piggies[_tokenId].uintDetails[6];
      // calculate adjusted premium (based on reservePrice) + possible change due back to current holder
      if (_adjPremium > auctions[_tokenId].reservePrice) {
        _adjPremium = auctions[_tokenId].reservePrice;
      } else {
        _change = auctions[_tokenId].reservePrice.sub(_adjPremium);
      }
      // *** warning untrusted function call ***
      // current holder pays premium (via amount already delegated to this contract in startAuction)
      (success, result) = address(piggies[_tokenId].addresses[2]).call(
        abi.encodeWithSignature(
          "transfer(address,uint256)",
          msg.sender,
          _adjPremium
        )
      );
      txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");

      // current holder receives any change due
      if (_change > 0) {
        // *** warning untrusted function call ***
        (success, result) = address(piggies[_tokenId].addresses[2]).call(
          abi.encodeWithSignature(
            "transfer(address,uint256)",
            piggies[_tokenId].addresses[1],
            _change
          )
        );
        txCheck = abi.decode(result, (bytes32));
        require(success && txCheck == TX_SUCCESS, "token transfer failed");
      }

}

  function startAuction(
    uint256 _tokenId,
    uint256 _startPrice,
    uint256 _reservePrice,
    uint256 _auctionLength,
    uint256 _timeStep,
    uint256 _priceStep,
    uint256 _limitPrice,
    bool _bidLimitSet
  )
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
  {
    uint256 _auctionExpiry = block.number.add(_auctionLength);
    require(piggies[_tokenId].addresses[1] == msg.sender, "sender must be the holder");
    require(piggies[_tokenId].uintDetails[4] > block.number, "token must not be expired");
    require(piggies[_tokenId].uintDetails[4] > _auctionExpiry, "auction cannot expire after token expiry");
    require(!piggies[_tokenId].flags[3], "token cannot be cleared");
    require(!auctions[_tokenId].auctionActive, "auction cannot be running");

    // if we made it past the various checks, set the auction metadata up in auctions mapping
    auctions[_tokenId].startBlock = block.number;
    auctions[_tokenId].expiryBlock = _auctionExpiry;
    auctions[_tokenId].startPrice = _startPrice;
    auctions[_tokenId].reservePrice = _reservePrice;
    auctions[_tokenId].timeStep = _timeStep;
    auctions[_tokenId].priceStep = _priceStep;
    auctions[_tokenId].limitPrice = _limitPrice;
    if (_bidLimitSet) {
        auctions[_tokenId].bidLimitSet = true;
    }
    auctions[_tokenId].auctionActive = true;

    if (piggies[_tokenId].flags[0]) {
      // *** warning untrusted function call ***
      (bool success, bytes memory result) = attemptPaymentTransfer(
        piggies[_tokenId].addresses[2],
        msg.sender,
        address(this),
        _reservePrice  // this should be the max the requestor is willing to pay in a reverse dutch auction
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");
    }

    emit StartAuction(
      msg.sender,
      _tokenId,
      _startPrice,
      _reservePrice,
      _auctionLength,
      _timeStep,
      _priceStep
    );

    return true;
  }

  function endAuction(uint256 _tokenId)
    external
    nonReentrant
    returns (bool)
  {
    require(piggies[_tokenId].addresses[1] == msg.sender, "sender must be the holder");
    require(auctions[_tokenId].auctionActive, "auction must be active");
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");  // this should be added to other functions as well

    if (piggies[_tokenId].flags[0]) {
      uint256 _premiumToReturn = auctions[_tokenId].reservePrice;
      _clearAuctionDetails(_tokenId);

      // *** warning untrusted function call ***
      // refund the _reservePrice premium
      (bool success, bytes memory result) = address(piggies[_tokenId].addresses[2]).call(
        abi.encodeWithSignature(
          "transfer(address,uint256)",
          msg.sender,
          _premiumToReturn
        )
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");
    }

    _clearAuctionDetails(_tokenId);
    emit EndAuction(msg.sender, _tokenId, piggies[_tokenId].flags[0]);
    return true;
  }

  function satisfyPiggyAuction(uint256 _tokenId)
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
  {
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    require(piggies[_tokenId].addresses[1] != msg.sender, "cannot satisfy your auction; use endAuction");
    require(auctions[_tokenId].auctionActive, "auction must be active to satisfy");
    //use satisfyRFPAuction for RFP auctions
    require(!piggies[_tokenId].flags[0], "cannot satisfy auction; check piggy type");

    // if auction is "active" according to state but has expired, change state
    if (auctions[_tokenId].expiryBlock < block.number) {
      _clearAuctionDetails(_tokenId);
      return false;
    }

    // lock mutex
    auctions[_tokenId].satisfyInProgress = true;

    uint256 _auctionPremium = 0;
    uint256 _adjPremium = 0;

    if (auctions[_tokenId].bidLimitSet) {
     require(auctions[_tokenId].bidCleared, "auction did not receive a limit price");

      // check price limit condition
      if(piggies[_tokenId].flags[2]) {
          // if put
          require(auctions[_tokenId].limitPrice < auctions[_tokenId].oraclePrice, "price limit violated");
      } else {
          // if call
          require(auctions[_tokenId].oraclePrice < auctions[_tokenId].limitPrice, "price limit violated");
      }

      _auctionPremium = auctions[_tokenId].auctionPremium;
    }
    // auction didn't go through a bidding process
    else {
        _auctionPremium = _getAuctionPrice(_tokenId);
    _adjPremium = _auctionPremium;

      if (_adjPremium < auctions[_tokenId].reservePrice) {
        _adjPremium = auctions[_tokenId].reservePrice;
      }
      // *** warning untrusted function call ***
      // msg.sender pays (adjusted) premium
      (bool success, bytes memory result) = attemptPaymentTransfer(
        piggies[_tokenId].addresses[2],
        msg.sender,
        piggies[_tokenId].addresses[1],
        _adjPremium
      );
      bytes32 txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");
    }

      // msg.sender becomes holder
      _internalTransfer(piggies[_tokenId].addresses[1], msg.sender, _tokenId);

      emit SatisfyAuction(
        msg.sender,
        _tokenId,
        _adjPremium,
        0,
        _auctionPremium
      );

    // auction is ended
    _clearAuctionDetails(_tokenId);
    // mutex released
    auctions[_tokenId].satisfyInProgress = false;
    return true;
  }

function satisfyRFPAuction(uint256 _tokenId, uint8 _rfpNonce)
    external
    whenNotFrozen
    nonReentrant
    returns (bool)
  {
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    require(piggies[_tokenId].addresses[1] != msg.sender, "cannot satisfy your auction; use endAuction");
    require(auctions[_tokenId].auctionActive, "auction must be active to satisfy");

    //use satisfyPiggyAuction for piggy auctions
    require(piggies[_tokenId].flags[0], "cannot satisfy auction; check piggy type");

    // if auction is "active" according to state but has expired, change state
    if (auctions[_tokenId].expiryBlock < block.number) {
      _clearAuctionDetails(_tokenId);
      return false;
    }

      // check RFP Nonce against auction front running
      require(_rfpNonce == piggies[_tokenId].counters[1], "RFP Nonce failed match");

    // lock mutex
    auctions[_tokenId].satisfyInProgress = true;

    uint256 _auctionPremium = 0;
    uint256 _adjPremium = 0;
    uint256 _change = 0;

if (auctions[_tokenId].bidLimitSet) {
     require(auctions[_tokenId].bidCleared, "auction did not receive a limit price");

      // check price limit condition
      if(piggies[_tokenId].flags[2]) {
          // if put
          require(auctions[_tokenId].limitPrice < auctions[_tokenId].oraclePrice, "price limit violated");
      } else {
          // if call
          require(auctions[_tokenId].oraclePrice < auctions[_tokenId].limitPrice, "price limit violated");
      }
      _auctionPremium = auctions[_tokenId].auctionPremium;
    }
    // auction didn't go through a bidding process
    else {

    bool success; // return bool from a token transfer
    bytes memory result; // return data from a token transfer
    bytes32 txCheck; // bytes32 check from a token transfer

      // *** warning untrusted function call ***
      // msg.sender needs to delegate reqCollateral
      (success, result) = attemptPaymentTransfer(
        piggies[_tokenId].addresses[2],
        msg.sender,
        address(this),
        piggies[_tokenId].uintDetails[6]
      );
      txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");

      _auctionPremium = _getAuctionPrice(_tokenId);
      _adjPremium = _auctionPremium;
      // if the collateral transfer succeeded, reqCollateral gets set to collateral
      piggies[_tokenId].uintDetails[0] = piggies[_tokenId].uintDetails[6];
      // calculate adjusted premium (based on reservePrice) + possible change due back to current holder
      if (_adjPremium > auctions[_tokenId].reservePrice) {
        _adjPremium = auctions[_tokenId].reservePrice;
      } else {
        _change = auctions[_tokenId].reservePrice.sub(_adjPremium);
      }
      // *** warning untrusted function call ***
      // current holder pays premium (via amount already delegated to this contract in startAuction)
      (success, result) = address(piggies[_tokenId].addresses[2]).call(
        abi.encodeWithSignature(
          "transfer(address,uint256)",
          msg.sender,
          _adjPremium
        )
      );
      txCheck = abi.decode(result, (bytes32));
      require(success && txCheck == TX_SUCCESS, "token transfer failed");

      // current holder receives any change due
      if (_change > 0) {
        // *** warning untrusted function call ***
        (success, result) = address(piggies[_tokenId].addresses[2]).call(
          abi.encodeWithSignature(
            "transfer(address,uint256)",
            piggies[_tokenId].addresses[1],
            _change
          )
        );
        txCheck = abi.decode(result, (bytes32));
        require(success && txCheck == TX_SUCCESS, "token transfer failed");
      }

    }

      // isRequest becomes false
      piggies[_tokenId].flags[0] = false;
      // msg.sender becomes writer
      piggies[_tokenId].addresses[0] = msg.sender;

      emit SatisfyAuction(
        msg.sender,
        _tokenId,
        _adjPremium,
        _change,
        _auctionPremium
      );

    // auction is ended
    _clearAuctionDetails(_tokenId);
    // mutex released
    auctions[_tokenId].satisfyInProgress = false;
    return true;
  }

  /** @notice Call the oracle to fetch the settlement price
      @dev Throws if `_tokenId` is not a valid token.
       Throws if `_oracle` is not a valid contract address.
       Throws if `onMarket(_tokenId)` is true.
       If `isEuro` is true for the specified token, throws if `_expiry` > block.number.
       If `isEuro` is true for the specified token, throws if `_priceNow` is true. [OR specify that it flips that to false always (?)]
       If `priceNow` is true, throws if block.number > `_expiry` for the specified token.
       If `priceNow` is false, throws if block.number < `_expiry` for the specified token.
       If `priceNow` is true, calls the oracle to request the `_underlyingNow` value for the token.
       If `priceNow` is false, calls the oracle to request the `_underlyingExpiry` value for the token.
       Depending on the oracle service implemented, additional state will need to be referenced in
       order to call the oracle, e.g. an endpoint to fetch. This state handling will need to be
       managed on an implementation basis for specific oracle services.
      @param _tokenId The identifier of the token
      @param _oracleFee Fee paid to oracle service
        A value needs to be provided for this function to succeed
        If the oracle doesn't need payment, include a positive garbage value
      @return The settlement price from the oracle to be used in `settleOption()`
   */
  function requestSettlementPrice(uint256 _tokenId, uint256 _oracleFee)
    external
    nonReentrant
    returns (bool)
  {
    require(msg.sender != address(0));
    require(!auctions[_tokenId].auctionActive, "cannot clear while auction is active");
    require(!piggies[_tokenId].flags[3], "token has been cleared");
    require(_tokenId != 0, "tokenId cannot be zero");

    // check if Euro require past expiry
    if (piggies[_tokenId].flags[1]) {
      require(piggies[_tokenId].uintDetails[4] <= block.number, "cannot request price for European before expiry");
    }
    // check if American and less than expiry, only holder can call
    if (!piggies[_tokenId].flags[1] && (block.number < piggies[_tokenId].uintDetails[4]))
    {
      require(msg.sender == piggies[_tokenId].addresses[1], "only the holder can settle American before expiry");
    }

    address dataResolver = piggies[_tokenId].addresses[3];
    // *** warning untrusted function call ***
    (bool success, bytes memory result) = address(dataResolver).call(
      abi.encodeWithSignature("fetchData(address,uint256,uint256)", msg.sender, _oracleFee, _tokenId)
    );
    bytes32 txCheck = abi.decode(result, (bytes32));
    require(success && txCheck == TX_SUCCESS, "call to resolver failed");

    emit RequestSettlementPrice(
      msg.sender,
      _tokenId,
      _oracleFee,
      dataResolver
    );

    return true;
  }

  function _callback(
    uint256 _tokenId,
    uint256 _price
  )
    public
  {
    require(msg.sender != address(0));
    // MUST restrict a call to only the resolver address
    require(msg.sender == piggies[_tokenId].addresses[3], "resolver callback address failed match");
    require(!piggies[_tokenId].flags[3], "piggy already cleared");
    piggies[_tokenId].uintDetails[5] = _price;
    piggies[_tokenId].flags[3] = true;

    // if abitration is set, lock piggy for cooldown period
    if (piggies[_tokenId].addresses[4] != address(0)) {
      piggies[_tokenId].uintDetails[7] = block.number.add(cooldown);
    }

    emit OracleReturned(
      msg.sender,
      _tokenId,
      _price
    );

  }

  /** @notice Calculate the settlement of ownership of option collateral
      @dev Throws if `_tokenId` is not a valid ERC-59 token.
       Throws if msg.sender is not one of: seller, owner of `_tokenId`.
       Throws if hasBeenCleared is true.
   */
   function settlePiggy(uint256 _tokenId)
     public
     returns (bool)
   {
     require(msg.sender != address(0));
     require(_tokenId != 0, "tokenId cannot be zero");
     // require a settlement price to be returned from an oracle
     require(piggies[_tokenId].flags[3], "piggy is not cleared");

     // check if arbitratin is set, cooldown has passed
     if (piggies[_tokenId].addresses[4] != address(0)) {
       require(piggies[_tokenId].uintDetails[7] <= block.number, "arbiter set, locked for cooldown period");
     }

     uint256 payout;

     if(piggies[_tokenId].flags[1]) {
       require(piggies[_tokenId].uintDetails[4] <= block.number, "european must be expired");
     }
     payout = _calculateLongPayout(_tokenId);

     // set the balances of the two counterparties based on the payout
     address _writer = piggies[_tokenId].addresses[0];
     address _holder = piggies[_tokenId].addresses[1];
     address _collateralERC = piggies[_tokenId].addresses[2];

     uint256 collateral = piggies[_tokenId].uintDetails[0];
     if (payout > collateral) {
       payout = collateral;
     }
     // extract the service fee
     uint256 fee = _getFee(payout);
     ERC20balances[feeAddress][_collateralERC] = ERC20balances[feeAddress][_collateralERC].add(fee);
     ERC20balances[_holder][_collateralERC] = ERC20balances[_holder][_collateralERC].add(payout).sub(fee);
     ERC20balances[_writer][_collateralERC] = ERC20balances[_writer][_collateralERC].add(collateral).sub(payout);

     emit SettlePiggy(
       msg.sender,
       _tokenId,
       payout.sub(fee),
       piggies[_tokenId].uintDetails[0].sub(payout)
     );

     _removeTokenFromOwnedPiggies(_holder, _tokenId);
     // clean up piggyId
     _resetPiggy(_tokenId);
     return true;
   }

  // claim payout - pull payment
  // sends any reference ERC-20 which the claimant is owed (as a result of an auction or settlement)
  function claimPayout(address _paymentToken, uint256 _amount)
    external
    nonReentrant
    returns (bool)
  {
    require(msg.sender != address(0));
    require(_amount != 0, "amount cannot be zero");
    require(_amount <= ERC20balances[msg.sender][_paymentToken], "balance less than requested amount");
    ERC20balances[msg.sender][_paymentToken] = ERC20balances[msg.sender][_paymentToken].sub(_amount);

    (bool success, bytes memory result) = address(_paymentToken).call(
      abi.encodeWithSignature(
        "transfer(address,uint256)",
        msg.sender,
        _amount
      )
    );
    bytes32 txCheck = abi.decode(result, (bytes32));
    require(success && txCheck == TX_SUCCESS, "token transfer failed");

    emit ClaimPayout(
      msg.sender,
      _amount,
      _paymentToken
    );

    return true;
  }

  /** Arbitration mechanisms
  */

  function updateArbiter(uint256 _tokenId, address _newArbiter)
    public
    returns (bool)
  {
    require(_newArbiter != address(0), "arbiter address cannot be zero");
    require(!auctions[_tokenId].auctionActive, "token cannot be on auction");
    address _holder = piggies[_tokenId].addresses[1];
    address _writer = piggies[_tokenId].addresses[0];
    require(msg.sender == _holder || msg.sender == _writer, "only writer or holder can propose a new arbiter");
    if (msg.sender == _holder) {
      piggies[_tokenId].flags[5] = true;
      piggies[_tokenId].addresses[6] = _newArbiter;
    }
    if (msg.sender == _writer) {
      piggies[_tokenId].flags[4] = true;
      piggies[_tokenId].addresses[5] = _newArbiter;
    }
    if (piggies[_tokenId].flags[5] && piggies[_tokenId].flags[4]) {
      if (piggies[_tokenId].addresses[6] == piggies[_tokenId].addresses[5]) {
        piggies[_tokenId].addresses[4] = _newArbiter;
        emit ArbiterSet(msg.sender, _newArbiter, _tokenId);
        return true;
      } else {
        // new arbiter address did not match
        return false;
      }
    }
    // missing a proposal from one party
    return false;
  }

  function confirmArbiter(uint256 _tokenId)
    public
    returns (bool)
  {
    require(msg.sender != address(0));
    require(msg.sender == piggies[_tokenId].addresses[4], "sender must be the arbiter");
    piggies[_tokenId].flags[9] = true;

    emit ArbiterConfirmed(msg.sender, _tokenId);
    return true;
  }

  function thirdPartyArbitrationSettlement(uint256 _tokenId, uint256 _proposedPrice)
    public
    returns (bool)
  {
    // make sure address can't call as an unset arbiter
    require(msg.sender != address(0));
    // require that arbitration has not received agreement
    require(!piggies[_tokenId].flags[10], "arbitration has agreement");
    // if piggy did not cleared a price, i.e. oracle didn't return
    // require that piggy is expired to settle via arbitration
    if(block.number < piggies[_tokenId].uintDetails[4]) {
      require(piggies[_tokenId].flags[3]);
    }

    // set internal address references for convenience
    address _holder = piggies[_tokenId].addresses[1];
    address _writer = piggies[_tokenId].addresses[0];
    address _arbiter = piggies[_tokenId].addresses[4];

    // check which party the sender is (of the 3 valid ones, else fail)
    require(msg.sender == _holder || msg.sender == _writer || msg.sender == _arbiter, "sender must be holder, writer, or arbiter");

    // set flag for proposed share for that party
    if (msg.sender == _holder) {
      piggies[_tokenId].uintDetails[9] = _proposedPrice;
      piggies[_tokenId].flags[7] = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }
    if (msg.sender == _writer) {
      piggies[_tokenId].uintDetails[8] = _proposedPrice;
      piggies[_tokenId].flags[6] = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }
    if (msg.sender == _arbiter) {
      piggies[_tokenId].uintDetails[10] = _proposedPrice;
      piggies[_tokenId].flags[8] = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }

    // see if 2 of 3 parties have proposed a share
    if (piggies[_tokenId].flags[7] && piggies[_tokenId].flags[6] ||
      piggies[_tokenId].flags[7] && piggies[_tokenId].flags[8] ||
      piggies[_tokenId].flags[6] && piggies[_tokenId].flags[8])
    {
      // if so, see if 2 of 3 parties have proposed the same amount
      uint256 _settlementPrice = 0;
      bool _agreement = false;
      // check if holder has gotten agreement with either other party
      if (piggies[_tokenId].uintDetails[9] == piggies[_tokenId].uintDetails[8] ||
        piggies[_tokenId].uintDetails[9] == piggies[_tokenId].uintDetails[10])
      {
        _settlementPrice = piggies[_tokenId].uintDetails[9];
        _agreement = true;
      }

      // check if the two non-holder parties agree
      if (piggies[_tokenId].uintDetails[8] == piggies[_tokenId].uintDetails[10])
      {
        _settlementPrice = piggies[_tokenId].uintDetails[8];
        _agreement = true;
      }

      if (_agreement) {
        // arbitration has come to an agreement
        piggies[_tokenId].flags[10] = true;
        // update settlement price
        piggies[_tokenId].uintDetails[5] = _settlementPrice;
        piggies[_tokenId].flags[3] = true;
        // emit settlement event
        emit ArbiterSettled(msg.sender, _arbiter, _tokenId, _settlementPrice);

        return (true);
      } else {
        // no agreement
        return false;
      }
    }
    // 2 of 3 have not proposed
    return false;
  }

  /** Helper functions
  */
  // helper function to view piggy details
  function getDetails(uint256 _tokenId)
    public
    view
    returns (Piggy memory)
  {
    return piggies[_tokenId];
  }

  // helper function to view auction details
  function getAuctionDetails(uint256 _tokenId)
    public
    view
    returns (DetailAuction memory)
  {
    return auctions[_tokenId];
  }

  /** @notice Count the number of ERC-59 tokens owned by a particular address
      @dev ERC-59 tokens assigned to the zero address are considered invalid, and this
       function throws for queries about the zero address.
      @param _owner An address for which to query the balance of ERC-59 tokens
      @return The number of ERC-59 tokens owned by `_owner`, possibly zero
   */
  function getOwnedPiggies(address _owner)
    public
    view
    returns (uint256[] memory)
  {
    return ownedPiggies[_owner];
  }

  function getERC20Balance(address _owner, address _erc20)
    public
    view
    returns (uint256)
  {
    return ERC20balances[_owner][_erc20];
  }

  /* Internal functions
  */

  function _constructPiggy(
    address _collateralERC,
    address _dataResolver,
    address _arbiter,
    uint256 _collateral,
    uint256 _lotSize,
    uint256 _strikePrice,
    uint256 _bidLimit,
    uint256 _expiry,
    bool _isEuro,
    bool _isPut,
    bool _isRequest
  )
    internal
    returns (bool)
  {
    // assuming all checks have passed:
    uint256 tokenExpiry;
    // tokenId should be allowed to overflow
    ++tokenId;

    // write the values to storage, including _isRequest flag
    Piggy storage p = piggies[tokenId];
    p.addresses[1] = msg.sender;
    p.addresses[2] = _collateralERC;
    p.addresses[3] = _dataResolver;
    p.addresses[4] = _arbiter;
    p.uintDetails[1] = _lotSize;
    p.uintDetails[2] = _strikePrice;
    p.uintDetails[3] = _bidLimit;
    p.flags[1] = _isEuro;
    p.flags[2] = _isPut;
    p.flags[0] = _isRequest;

    // conditional state variable assignments based on _isRequest:
    if (_isRequest) {
      tokenExpiry = _expiry.add(block.number);
      p.uintDetails[6] = _collateral;
      p.counters[0] = _getERC20Decimals(_collateralERC);
      p.uintDetails[4] = tokenExpiry;
    } else {
      //require(!_isSplit, "split cannot be true when creating a piggy");
      tokenExpiry = _expiry.add(block.number);
      p.addresses[0] = msg.sender;
      p.uintDetails[0] = _collateral;
      p.counters[0] = _getERC20Decimals(_collateralERC);
      p.uintDetails[4] = tokenExpiry;
    }

    _addTokenToOwnedPiggies(msg.sender, tokenId);

    address[] memory a = new address[](4);
    a[0] = msg.sender;
    a[1] = _collateralERC;
    a[2] = _dataResolver;
    a[3] = _arbiter;

    uint256[] memory i = new uint256[](5);
    i[0] = tokenId;
    i[1] = _collateral;
    i[2] = _lotSize;
    i[3] = _strikePrice;
    i[4] = tokenExpiry;

    bool[] memory b = new bool[](3);
    b[0] = _isEuro;
    b[1] = _isPut;
    b[2] = _isRequest;

    emit CreatePiggy(
      a,
      i,
      b
    );

    return true;
  }

function _splitPiggy(
    uint256 _splitTokenId,
    uint256 _collateral
  )
    internal
    returns (bool)
  {
    // assuming all checks have passed:

    // tokenId should be allowed to overflow
    ++tokenId;

    // write the values to storage, including _isRequest flag
    Piggy storage p = piggies[tokenId];
    p.addresses[0] = piggies[_splitTokenId].addresses[1];
    p.addresses[2] = piggies[_splitTokenId].addresses[2];
    p.addresses[3] = piggies[_splitTokenId].addresses[3];
    p.addresses[4] = piggies[_splitTokenId].addresses[4];

    p.uintDetails[1] = piggies[_splitTokenId].uintDetails[1];
    p.uintDetails[2] = piggies[_splitTokenId].uintDetails[2];
    p.uintDetails[3] = piggies[_splitTokenId].uintDetails[3];

    p.flags[1] = piggies[_splitTokenId].flags[1];
    p.flags[2] = piggies[_splitTokenId].flags[2];
    // must NOT be an RFP
    p.flags[0] = false;


      p.addresses[0] = piggies[_splitTokenId].addresses[0];
      p.uintDetails[0] = _collateral;
      p.counters[0] = piggies[_splitTokenId].counters[0];
      p.uintDetails[4] = piggies[_splitTokenId].uintDetails[4];

    _addTokenToOwnedPiggies(msg.sender, tokenId);

    address[] memory a = new address[](4);
    a[0] = msg.sender;
    a[1] = p.addresses[2];
    a[2] = p.addresses[3];
    a[3] = p.addresses[4];

    uint256[] memory i = new uint256[](5);
    i[0] = tokenId;
    i[1] = _collateral;
    i[2] = p.uintDetails[1];
    i[3] = p.uintDetails[2];
    i[4] = p.uintDetails[4];

    bool[] memory b = new bool[](3);
    b[0] = p.flags[1];
    b[1] = p.flags[2];
    b[2] = false;

    emit CreatePiggy(
      a,
      i,
      b
    );

    return true;
  }

  /**
   * make sure the ERC-20 contract for collateral correctly reports decimals
   * suggested visibility external, set to interanl as other internal functions
   * use this
   *
   * Note: this function calls an external function and does NOT have a
   * reentrantcy guard, as create will trigger the guard
   *
   */
  function _getERC20Decimals(address _ERC20)
    internal
    returns (uint8)
  {
    // *** warning untrusted function call ***
    (bool success, bytes memory _decBytes) = address(_ERC20).call(
        abi.encodeWithSignature("decimals()")
      );
     require(success, "contract does not properly specify decimals");
     /**
         allow for uint256 range of decimals,
         if token contract saves decimals as uint256
         accept uint256 value.
         Cast return value before return to force uint8 spec
      */
     uint256 _ERCdecimals = abi.decode(_decBytes, (uint256));
     return uint8(_ERCdecimals); // explicit cast, possible loss of resolution
  }

  // internal transfer for transfers made on behalf of the contract
  function _internalTransfer(address _from, address _to, uint256 _tokenId)
    internal
  {
    require(_from == piggies[_tokenId].addresses[1], "from must be the holder");
    require(_to != address(0), "receiving address cannot be zero");
    _removeTokenFromOwnedPiggies(_from, _tokenId);
    _addTokenToOwnedPiggies(_to, _tokenId);
    piggies[_tokenId].addresses[1] = _to;
    emit TransferPiggy(_from, _to, _tokenId);
  }

  function _clearAuctionDetails(uint256 _tokenId)
    internal
  {
    auctions[_tokenId].startBlock = 0;
    auctions[_tokenId].expiryBlock = 0;
    auctions[_tokenId].startPrice = 0;
    auctions[_tokenId].reservePrice = 0;
    auctions[_tokenId].timeStep = 0;
    auctions[_tokenId].priceStep = 0;
    auctions[_tokenId].limitPrice = 0;
    auctions[_tokenId].oraclePrice = 0;
    auctions[_tokenId].auctionPremium = 0;
    auctions[_tokenId].activeBidder = address(0);
    auctions[_tokenId].auctionActive = false;
    auctions[_tokenId].bidLimitSet = false;
    auctions[_tokenId].bidLocked = false;
    auctions[_tokenId].bidCleared = false;
  }

  // calculate the price for satisfaction of an auction
  // this is an interpolated linear price based on the supplied auction parameters at a resolution of 1 block
  function _getAuctionPrice(uint256 _tokenId)
    internal
    view
    returns (uint256)
  {

    uint256 _pStart = auctions[_tokenId].startPrice;
    uint256 _pDelta = (block.number).sub(auctions[_tokenId].startBlock).mul(auctions[_tokenId].priceStep).div(auctions[_tokenId].timeStep);
    if (piggies[_tokenId].flags[0]) {
      return _pStart.add(_pDelta);
    } else {
      return (_pStart.sub(_pDelta));
    }
  }

  function _calculateLongPayout(uint256 _tokenId)
    internal
    view
    returns (uint256 _payout)
  {
    bool _isPut = piggies[_tokenId].flags[2];
    uint256 _strikePrice = piggies[_tokenId].uintDetails[2];
    uint256 _exercisePrice = piggies[_tokenId].uintDetails[5];
    uint256 _lotSize = piggies[_tokenId].uintDetails[1];
    uint8 _decimals = piggies[_tokenId].counters[0];

    if (_isPut && (_strikePrice > _exercisePrice)) {
      _payout = _strikePrice.sub(_exercisePrice);
    }
    if (!_isPut && (_exercisePrice > _strikePrice)) {
      _payout = _exercisePrice.sub(_strikePrice);
    }
    _payout = _payout.mul(10**uint256(_decimals)).mul(_lotSize).div(100);
    return _payout;
  }

  /**
      For clarity this is a private helper function to reuse the
      repeated `transferFrom` calls to a token contract.
      The contract does still use address(ERC20Address).call("transfer(address,uint256)")
      when the contract is making transfers from itself back to users.
      `attemptPaymentTransfer` is used when collateral is approved by a user
      in the specified token contract, and this contract makes a transfer on
      the user's behalf, as `transferFrom` checks allowance before sending
      and this contract does not make approval transactions
   */
  function attemptPaymentTransfer(address _ERC20, address _from, address _to, uint256 _amount)
    private
    returns (bool, bytes memory)
  {
    // *** warning untrusted function call ***
    /**
    **  check the return data because compound violated the ERC20 standard for
    **  token transfers :9
    */
    (bool success, bytes memory result) = address(_ERC20).call(
      abi.encodeWithSignature(
        "transferFrom(address,address,uint256)",
        _from,
        _to,
        _amount
      )
    );
    return (success, result);
  }

  function _addTokenToOwnedPiggies(address _to, uint256 _tokenId)
    private
  {
    ownedPiggiesIndex[_tokenId] = ownedPiggies[_to].length;
    ownedPiggies[_to].push(_tokenId);
  }

  function _removeTokenFromOwnedPiggies(address _from, uint256 _tokenId)
    private
  {
    uint256 lastTokenIndex = ownedPiggies[_from].length.sub(1);
    uint256 tokenIndex = ownedPiggiesIndex[_tokenId];

    if (tokenIndex != lastTokenIndex) {
      uint256 lastTokenId = ownedPiggies[_from][lastTokenIndex];
      ownedPiggies[_from][tokenIndex] = lastTokenId;
      ownedPiggiesIndex[lastTokenId] = tokenIndex;
    }
    ownedPiggies[_from].length--;
  }

  function _resetPiggy(uint256 _tokenId)
    private
  {
    piggies[_tokenId].addresses[0] = address(0);
    piggies[_tokenId].addresses[1] = address(0);
    piggies[_tokenId].addresses[4] = address(0);
    piggies[_tokenId].addresses[2] = address(0);
    piggies[_tokenId].addresses[3] = address(0);
    piggies[_tokenId].addresses[5] = address(0);
    piggies[_tokenId].addresses[6] = address(0);
    piggies[_tokenId].uintDetails[0] = 0;
    piggies[_tokenId].uintDetails[1] = 0;
    piggies[_tokenId].uintDetails[2] = 0;
    piggies[_tokenId].uintDetails[4] = 0;
    piggies[_tokenId].uintDetails[5] = 0;
    piggies[_tokenId].uintDetails[6] = 0;
    piggies[_tokenId].counters[0] = 0;
    piggies[_tokenId].uintDetails[7] = 0;
    piggies[_tokenId].uintDetails[8] = 0;
    piggies[_tokenId].uintDetails[9] = 0;
    piggies[_tokenId].uintDetails[10] = 0;
    piggies[_tokenId].counters[1] = 0;
    piggies[_tokenId].flags[0] = false;
    piggies[_tokenId].flags[1] = false;
    piggies[_tokenId].flags[2] = false;
    piggies[_tokenId].flags[3] = false;
    piggies[_tokenId].flags[4] = false;
    piggies[_tokenId].flags[5] = false;
    piggies[_tokenId].flags[6] = false;
    piggies[_tokenId].flags[7] = false;
    piggies[_tokenId].flags[8] = false;
    piggies[_tokenId].flags[9] = false;
    piggies[_tokenId].flags[10] = false;
  }
}
