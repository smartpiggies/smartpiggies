/**
 *  This is a helper contract for the SmartPiggies contract
 *  to relieve pressure from the codesize limit
 */
pragma solidity 0.5.17;

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


contract PiggyHelper is Serviced {
  //maintain storage layout of SmartPiggies contract
  uint256 public cooldown;
  address public helperAddress; // Smart Helper contract address in SmartPiggies slot
  enum RequestType { Bid, Settlement } 
  bytes32 constant RTN_FALSE = bytes32(0x0000000000000000000000000000000000000000000000000000000000000000);
  bytes32 constant TX_SUCCESS = bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);
  uint256 public tokenId;

  uint256 private _guardCounter;

  mapping (address => mapping(address => uint256)) private ERC20balances;
  mapping (address => uint256) private bidBalances;
  mapping (address => uint256[]) private ownedPiggies;
  mapping (uint256 => uint256) private ownedPiggiesIndex;
  mapping (uint256 => Piggy) private piggies;
  mapping (uint256 => DetailAuction) private auctions;

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

  event CreatePiggy(
    address[] addresses,
    uint256[] ints,
    bool[] bools
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

  event SettlePiggy(
   address indexed from,
   uint256 indexed tokenId,
   uint256 indexed holderPayout,
   uint256 writerPayout
  );

  event ArbiterSet(
    address indexed from,
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

  constructor()
    public
    Administered(msg.sender)
    Serviced(msg.sender)
  {
    _guardCounter = 1;
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
    require(piggies[_tokenId].addresses.holder == msg.sender, "sender must be the holder");
    require(piggies[_tokenId].flags.isRequest, "you can only update an RFP");
    require(!auctions[_tokenId].satisfyInProgress, "auction in process of being satisfied");
    uint256 expiryBlock;
    if (_collateralERC != address(0)) {
      piggies[_tokenId].addresses.collateralERC = _collateralERC;
    }
    if (_dataResolver != address(0)) {
      piggies[_tokenId].addresses.dataResolver = _dataResolver;
    }
    if (_arbiter != address(0)) {
      piggies[_tokenId].addresses.arbiter = _arbiter;
    }
    if (_reqCollateral != 0) {
      piggies[_tokenId].uintDetails.reqCollateral = _reqCollateral;
    }
    if (_lotSize != 0) {
      piggies[_tokenId].uintDetails.lotSize = _lotSize;
    }
    if (_strikePrice != 0 ) {
      piggies[_tokenId].uintDetails.strikePrice = _strikePrice;
    }
    if (_expiry != 0) {
      // recalculate expiry calculation
      expiryBlock = _expiry.add(block.number);
      piggies[_tokenId].uintDetails.expiry = expiryBlock;
    }
    // Both must be specified
    piggies[_tokenId].flags.isEuro = _isEuro;
    piggies[_tokenId].flags.isPut = _isPut;

    // increment update nonce
    // protects fulfiller from auction front running
    ++piggies[_tokenId].uintDetails.rfpNonce;

    emit UpdateRFP(
      msg.sender,
      _tokenId,
      piggies[_tokenId].uintDetails.rfpNonce,
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

  function settlePiggy(uint256 _tokenId)
    public
    returns (bool)
  {
    require(msg.sender != address(0));
    require(_tokenId != 0, "tokenId cannot be zero");
    // require a settlement price to be returned from an oracle
    require(piggies[_tokenId].flags.hasBeenCleared, "piggy is not cleared");

    // check if arbitratin is set, cooldown has passed
    if (piggies[_tokenId].addresses.arbiter != address(0)) {
     require(piggies[_tokenId].uintDetails.arbitrationLock <= block.number, "arbiter set, locked for cooldown period");
    }

    uint256 payout;

    if(piggies[_tokenId].flags.isEuro) {
     require(piggies[_tokenId].uintDetails.expiry <= block.number, "european must be expired");
    }
    payout = _calculateLongPayout(_tokenId);

    // set the balances of the two counterparties based on the payout
    address _writer = piggies[_tokenId].addresses.writer;
    address _holder = piggies[_tokenId].addresses.holder;
    address _collateralERC = piggies[_tokenId].addresses.collateralERC;

    uint256 collateral = piggies[_tokenId].uintDetails.collateral;
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
     piggies[_tokenId].uintDetails.collateral.sub(payout)
    );

    _removeTokenFromOwnedPiggies(_holder, _tokenId);
    // clean up piggyId
    _resetPiggy(_tokenId);
    return true;
  }

  function updateArbiter(uint256 _tokenId, address _newArbiter)
    public
    returns (bool)
  {
    require(_newArbiter != address(0), "arbiter address cannot be zero");
    require(!auctions[_tokenId].auctionActive, "token cannot be on auction");
    address _holder = piggies[_tokenId].addresses.holder;
    address _writer = piggies[_tokenId].addresses.writer;
    require(msg.sender == _holder || msg.sender == _writer, "only writer or holder can propose a new arbiter");
    if (msg.sender == _holder) {
      piggies[_tokenId].flags.holderHasProposedNewArbiter = true;
      piggies[_tokenId].addresses.holderProposedNewArbiter = _newArbiter;
    }
    if (msg.sender == _writer) {
      piggies[_tokenId].flags.writerHasProposedNewArbiter = true;
      piggies[_tokenId].addresses.writerProposedNewArbiter = _newArbiter;
    }
    if (piggies[_tokenId].flags.holderHasProposedNewArbiter && piggies[_tokenId].flags.writerHasProposedNewArbiter) {
      if (piggies[_tokenId].addresses.holderProposedNewArbiter == piggies[_tokenId].addresses.writerProposedNewArbiter) {
        piggies[_tokenId].addresses.arbiter = _newArbiter;
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

  function thirdPartyArbitrationSettlement(uint256 _tokenId, uint256 _proposedPrice)
    public
    returns (bool)
  {
    // make sure address can't call as an unset arbiter
    require(msg.sender != address(0));
    // require that arbitration has not received agreement
    require(!piggies[_tokenId].flags.arbitrationAgreement, "arbitration has agreement");
    // if piggy did not cleared a price, i.e. oracle didn't return
    // require that piggy is expired to settle via arbitration
    if(block.number < piggies[_tokenId].uintDetails.expiry) {
      require(piggies[_tokenId].flags.hasBeenCleared);
    }

    // set internal address references for convenience
    address _holder = piggies[_tokenId].addresses.holder;
    address _writer = piggies[_tokenId].addresses.writer;
    address _arbiter = piggies[_tokenId].addresses.arbiter;

    // check which party the sender is (of the 3 valid ones, else fail)
    require(msg.sender == _holder || msg.sender == _writer || msg.sender == _arbiter, "sender must be holder, writer, or arbiter");

    // set flag for proposed share for that party
    if (msg.sender == _holder) {
      piggies[_tokenId].uintDetails.holderProposedPrice = _proposedPrice;
      piggies[_tokenId].flags.holderHasProposedPrice = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }
    if (msg.sender == _writer) {
      piggies[_tokenId].uintDetails.writerProposedPrice = _proposedPrice;
      piggies[_tokenId].flags.writerHasProposedPrice = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }
    if (msg.sender == _arbiter) {
      piggies[_tokenId].uintDetails.arbiterProposedPrice = _proposedPrice;
      piggies[_tokenId].flags.arbiterHasProposedPrice = true;
      emit PriceProposed(msg.sender, _tokenId, _proposedPrice);
    }

    // see if 2 of 3 parties have proposed a share
    if (piggies[_tokenId].flags.holderHasProposedPrice && piggies[_tokenId].flags.writerHasProposedPrice ||
      piggies[_tokenId].flags.holderHasProposedPrice && piggies[_tokenId].flags.arbiterHasProposedPrice ||
      piggies[_tokenId].flags.writerHasProposedPrice && piggies[_tokenId].flags.arbiterHasProposedPrice)
    {
      // if so, see if 2 of 3 parties have proposed the same amount
      uint256 _settlementPrice = 0;
      bool _agreement = false;
      // check if holder has gotten agreement with either other party
      if (piggies[_tokenId].uintDetails.holderProposedPrice == piggies[_tokenId].uintDetails.writerProposedPrice ||
        piggies[_tokenId].uintDetails.holderProposedPrice == piggies[_tokenId].uintDetails.arbiterProposedPrice)
      {
        _settlementPrice = piggies[_tokenId].uintDetails.holderProposedPrice;
        _agreement = true;
      }

      // check if the two non-holder parties agree
      if (piggies[_tokenId].uintDetails.writerProposedPrice == piggies[_tokenId].uintDetails.arbiterProposedPrice)
      {
        _settlementPrice = piggies[_tokenId].uintDetails.writerProposedPrice;
        _agreement = true;
      }

      if (_agreement) {
        // arbitration has come to an agreement
        piggies[_tokenId].flags.arbitrationAgreement = true;
        // update settlement price
        piggies[_tokenId].uintDetails.settlementPrice = _settlementPrice;
        piggies[_tokenId].flags.hasBeenCleared = true;
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

  function _constructPiggy(
    address _collateralERC,
    address _dataResolver,
    address _arbiter,
    uint256 _collateral,
    uint256 _lotSize,
    uint256 _strikePrice,
    uint256 _expiry,
    uint256 _splitTokenId,
    bool _isEuro,
    bool _isPut,
    bool _isRequest,
    bool _isSplit
  )
    public
    returns (bool)
  {
    // assuming all checks have passed:
    uint256 tokenExpiry;
    // tokenId should be allowed to overflow
    ++tokenId;

    // write the values to storage, including _isRequest flag
    Piggy storage p = piggies[tokenId];
    p.addresses.holder = msg.sender;
    p.addresses.collateralERC = _collateralERC;
    p.addresses.dataResolver = _dataResolver;
    p.addresses.arbiter = _arbiter;
    p.uintDetails.lotSize = _lotSize;
    p.uintDetails.strikePrice = _strikePrice;
    p.flags.isEuro = _isEuro;
    p.flags.isPut = _isPut;
    p.flags.isRequest = _isRequest;

    // conditional state variable assignments based on _isRequest:
    if (_isRequest) {
      tokenExpiry = _expiry.add(block.number);
      p.uintDetails.reqCollateral = _collateral;
      p.uintDetails.collateralDecimals = _getERC20Decimals(_collateralERC);
      p.uintDetails.expiry = tokenExpiry;
    } else if (_isSplit) {
      require(_splitTokenId != 0, "tokenId cannot be zero");
      require(!piggies[_splitTokenId].flags.isRequest, "token cannot be an RFP");
      require(piggies[_splitTokenId].addresses.holder == msg.sender, "only the holder can split");
      require(block.number < piggies[_splitTokenId].uintDetails.expiry, "cannot split expired token");
      require(!auctions[_splitTokenId].auctionActive, "cannot split token on auction");
      require(!piggies[_splitTokenId].flags.hasBeenCleared, "cannot split cleared token");
      tokenExpiry = piggies[_splitTokenId].uintDetails.expiry;
      p.addresses.writer = piggies[_splitTokenId].addresses.writer;
      p.uintDetails.collateral = _collateral;
      p.uintDetails.collateralDecimals = piggies[_splitTokenId].uintDetails.collateralDecimals;
      p.uintDetails.expiry = tokenExpiry;
    } else {
      require(!_isSplit, "split cannot be true when creating a piggy");
      tokenExpiry = _expiry.add(block.number);
      p.addresses.writer = msg.sender;
      p.uintDetails.collateral = _collateral;
      p.uintDetails.collateralDecimals = _getERC20Decimals(_collateralERC);
      p.uintDetails.expiry = tokenExpiry;
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

  function _calculateLongPayout(uint256 _tokenId)
    internal
    returns (uint256 _payout)
  {
    bool _isPut = piggies[_tokenId].flags.isPut;
    uint256 _strikePrice = piggies[_tokenId].uintDetails.strikePrice;
    uint256 _exercisePrice = piggies[_tokenId].uintDetails.settlementPrice;
    uint256 _lotSize = piggies[_tokenId].uintDetails.lotSize;
    uint8 _decimals = piggies[_tokenId].uintDetails.collateralDecimals;

    if (_isPut && (_strikePrice > _exercisePrice)) {
      _payout = _strikePrice.sub(_exercisePrice);
    }
    if (!_isPut && (_exercisePrice > _strikePrice)) {
      _payout = _exercisePrice.sub(_strikePrice);
    }
    _payout = _payout.mul(10**uint256(_decimals)).mul(_lotSize).div(100);
    return _payout;
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
    piggies[_tokenId].addresses.writer = address(0);
    piggies[_tokenId].addresses.holder = address(0);
    piggies[_tokenId].addresses.arbiter = address(0);
    piggies[_tokenId].addresses.collateralERC = address(0);
    piggies[_tokenId].addresses.dataResolver = address(0);
    piggies[_tokenId].addresses.writerProposedNewArbiter = address(0);
    piggies[_tokenId].addresses.holderProposedNewArbiter = address(0);
    piggies[_tokenId].uintDetails.collateral = 0;
    piggies[_tokenId].uintDetails.lotSize = 0;
    piggies[_tokenId].uintDetails.strikePrice = 0;
    piggies[_tokenId].uintDetails.expiry = 0;
    piggies[_tokenId].uintDetails.settlementPrice = 0;
    piggies[_tokenId].uintDetails.reqCollateral = 0;
    piggies[_tokenId].uintDetails.collateralDecimals = 0;
    piggies[_tokenId].uintDetails.arbitrationLock = 0;
    piggies[_tokenId].uintDetails.writerProposedPrice = 0;
    piggies[_tokenId].uintDetails.holderProposedPrice = 0;
    piggies[_tokenId].uintDetails.arbiterProposedPrice = 0;
    piggies[_tokenId].uintDetails.rfpNonce = 0;
    piggies[_tokenId].flags.isRequest = false;
    piggies[_tokenId].flags.isEuro = false;
    piggies[_tokenId].flags.isPut = false;
    piggies[_tokenId].flags.hasBeenCleared = false;
    piggies[_tokenId].flags.writerHasProposedNewArbiter = false;
    piggies[_tokenId].flags.holderHasProposedNewArbiter = false;
    piggies[_tokenId].flags.writerHasProposedPrice = false;
    piggies[_tokenId].flags.holderHasProposedPrice = false;
    piggies[_tokenId].flags.arbiterHasProposedPrice = false;
    piggies[_tokenId].flags.arbiterHasConfirmed = false;
    piggies[_tokenId].flags.arbitrationAgreement = false;
  }
}
