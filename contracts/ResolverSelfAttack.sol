pragma solidity >=0.4.24 <0.6.0;

//import "./RopstenConsumer.sol";

contract ResolverSelfAttack {
  address payable owner; //only for testing
  bytes32 public lastId; //for testing
  uint256 public lastPrice; //for testing
  uint256 public price;
  string public dataSource;
  string public underlying;
  string public oracleService;
  string public endpoint; //https://api.coincap.io/v2/rates/ethereum
  string public path; //"data.rateUsd"
  bytes32 public jobId; //493610cff14346f786f88ed791ab7704
  address public oracleTokenAddress;

  uint8 public count;
  uint256 public tokenId;
  address public smartpiggies;
  bool public didApprove;
  bool public didAttack;
  bool public didXfer;
  bool public didSatisfy;
  bool public didRequest;
  string public approveReturn;
  string public attackReturn;
  string public xferReturn;
  string public satisfyReturn;
  string public requestReturn;
  string public priceReturn;
  uint8 public nonce;

  struct Request {
    address requester;
    address payee;
    uint256 tokenId;
    uint8 requestType;
  }

  mapping(bytes32 => Request) public requests;
  mapping(bytes32 => address) public callers;

  constructor(
    string memory _dataSource,
    string memory _underlying,
    string memory _oracleService,
    string memory _endpoint,
    string memory _path,
    address _oracleTokenAddress,
    uint256 _price
  )
    public
  {
    owner = msg.sender;
    dataSource = _dataSource;
    underlying = _underlying;
    oracleService = _oracleService;
    jobId = bytes32("493610cff14346f786f88ed791ab7704");
    endpoint = _endpoint;
    path = _path;
    price = _price;
    oracleTokenAddress = _oracleTokenAddress;
  }

  function approve()
    public
  {
    bytes memory payload = abi.encodeWithSignature("approve(address,uint256)",address(this),100000000000000000000);
    (bool success, bytes memory data) = address(oracleTokenAddress).call.gas(1000000)(payload);
    approveReturn = string(data);
    didApprove = success;
  }

  function satisfyAuction()
    public
  {
    bytes memory payload = abi.encodeWithSignature("satisfyAuction(uint256,uint8)",tokenId,nonce);
    (bool success, bytes memory data) = address(smartpiggies).call.gas(1000000)(payload);
    satisfyReturn = string(data);
    didSatisfy = success;
  }

  function requestSettlement()
    public
  {
    bytes memory payload = abi.encodeWithSignature("requestSettlementPrice(uint256,uint256)",tokenId,0);
    (bool success, bytes memory data) = address(smartpiggies).call.gas(1000000)(payload);
    requestReturn = string(data);
    didRequest = success;
  }

  function fetchData(address _funder, uint256 _oracleFee, uint256 _tokenId, uint8 _requestType)
    public
    returns (bool)
  {
    bool success;
    bytes memory data;

    if (count++ < 2) {
      (success, data) = address(smartpiggies).call(
        abi.encodeWithSignature(
          "requestSettlementPrice(uint256,uint256)",
          tokenId,
          0
        )
      );
      didAttack = success;
      attackReturn = string(data);
    }

    bytes32 requestId = generateId();
    lastId = requestId; //for testing | live network
    requests[requestId] = Request({
      requester: msg.sender,
      payee: _funder,
      tokenId: _tokenId,
      requestType: _requestType
      });
    callers[requestId] = msg.sender;
    getPriceCallback(requestId, price);

    price++; // inc price if we make it here

    // Pay the oracle
    (success, data) = address(oracleTokenAddress).call(
      abi.encodeWithSignature(
        "transferFrom(address,address,uint256)",
        _funder,
        address(this),
        _oracleFee
      )
    );
    didXfer = success;
    xferReturn = string(data);
    require(success);

    return true;

  }

  function attackCallback(bytes32 _requestId, uint256 _price)
    public
  {
      getPriceCallback(_requestId, _price);
  }

  function getPriceCallback(bytes32 _requestId, uint256 _price)
    public
    //recordChainlinkFulfillment(_requestId)
    returns (bool)
  {
    lastPrice = _price;
    (bool success, bytes memory data) = address(requests[_requestId].requester).call(
      abi.encodeWithSignature(
        "_callback(uint256,uint256,uint8)",
        requests[_requestId].tokenId,
        _price,
        requests[_requestId].requestType
      )
    );
    priceReturn = string(data);
    require(success);
    return true;
  }

  /**
  ** For local testing
  **/
  function generateId()
    internal
    view
    returns (bytes32)
  {
    return bytes32(block.timestamp);
  }

  function getOwner()
    public
    view
    returns (address)
  {
    return owner;
  }

  function getAddress()
    public
    view
    returns (address)
  {
    return address(this);
  }

  function setAddress(address _spAddy)
    public
  {
    smartpiggies = _spAddy;
  }

  function setTokenId(uint256 _id)
    public
  {
    tokenId = _id;
  }

  function kill()
    public
  {
    require(msg.sender == owner);
    selfdestruct(owner);
  }
}
