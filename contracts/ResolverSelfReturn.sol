pragma solidity >=0.4.24 <0.6.0;

//import "./RopstenConsumer.sol";

contract ResolverSelfReturn {
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

  function fetchData(address _funder, uint256 _oracleFee, uint256 _tokenId, uint8 _requestType)
    public
    returns (bool)
  {
    (bool success, ) = address(oracleTokenAddress).call(
      abi.encodeWithSignature(
        "transferFrom(address,address,uint256)",
        _funder,
        address(this),
        _oracleFee
      )
    );
    require(success);

    //Chainlink.Request memory run = newRequest(jobId, address(this), this.getPriceCallback.selector);
    //run.add("get", endpoint);
    //run.add("path", path);
    //run.addInt("times", 100);
    //bytes32 requestId = chainlinkRequest(run, _oracleFee);
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
    return true;

  }

  function getPriceCallback(bytes32 _requestId, uint256 _price)
    public
    //recordChainlinkFulfillment(_requestId)
    returns (bool)
  {
    lastPrice = _price;
    (bool success, ) = address(requests[_requestId].requester).call(
      abi.encodeWithSignature(
        "_callback(uint256,uint256,uint8)",
        requests[_requestId].tokenId,
        _price,
        requests[_requestId].requestType
      )
    );
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

  function kill()
    public
  {
    require(msg.sender == owner);
    selfdestruct(owner);
  }
}
