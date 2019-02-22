pragma solidity >=0.4.24 <0.6.0;

//import "./RopstenConsumer.sol";
import "./Chainlinked.sol";

contract ResolverCLIEXSPYRinkeby is Chainlinked {
  address public owner; //only for testing
  bytes32 public lastId; //for testing
  uint256 public lastPrice; //for testing
  //uint256 public price;
  string public dataSource;
  string public underlying;
  string public oracle;
  string public endpoint; //https://api.iextrading.com/1.0/stock/spy/price
  string public path; //""
  bytes32 public jobId; //6d1bfe27e7034b1d87b5270556b17277
  address public oracleTokenAddress;

  struct Request {
    address requester;
    address payee;
    uint256 tokenId;
  }

  mapping(bytes32 => Request) public requests;
  mapping(bytes32 => address) public callers;

  constructor(
    string memory _dataSource,
    string memory _underlying,
    string memory _oracleService,
    string memory _endpoint,
    string memory _path,
    address _oracleTokenAddress
  )
    public
  {
    owner = msg.sender;
    dataSource = _dataSource;
    underlying = _underlying;
    oracle = _oracleService;
    jobId = bytes32("6d1bfe27e7034b1d87b5270556b17277");
    endpoint = _endpoint;
    path = _path;
    oracleTokenAddress = _oracleTokenAddress;
    setLinkToken(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
    setOracle(0x7AFe1118Ea78C1eae84ca8feE5C65Bc76CcF879e);
  }

  function fetchData(address _funder, uint256 _oracleFee, uint256 _tokenId)
    public
    returns (bool)
  {
    require(
      address(oracleTokenAddress).call(
        bytes4(
          keccak256("transferFrom(address,address,uint256)")),
          _funder,
          address(this),
          _oracleFee
      )
    );

    Chainlink.Request memory run = newRequest(jobId, address(this), this.getPriceCallback.selector);
    run.add("get", endpoint);
    //run.add("path", path);
    run.addInt("times", 100);
    bytes32 requestId = chainlinkRequest(run, _oracleFee);
    lastId = requestId; //for testing | live network
    requests[requestId] = Request({
      requester: msg.sender,
      payee: _funder,
      tokenId: _tokenId
      });
    return true;

  }

  function getPriceCallback(bytes32 _requestId, uint256 _price)
    public
    recordChainlinkFulfillment(_requestId)
    returns (bool)
  {
    lastPrice = _price;
    require(
      address(requests[_requestId].requester).call(bytes4(keccak256("_callback(uint256,uint256)")),
      requests[_requestId].tokenId,
      _price
      )
    );
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
