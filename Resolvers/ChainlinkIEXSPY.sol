/**
This Oracle Resolver is a solidity proxy contract for use
with Smartpiggies.
SmartPiggies is an open source standard for
a free peer to peer global derivatives market.
Copyright (C) <2019>  <Arief, Algya, Lee>

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
pragma solidity >=0.4.24 <0.6.0;

import "./RopstenConsumer.sol";

contract ChainlinkIEXSPY is Chainlinked {
  address public owner; //only for testing
  bytes32 public lastId; //for testing

  string public dataSource;
  string public underlying;
  string public oracle;
  string public endpoint;
  string public path;
  bytes32 public jobId; //493610cff14346f786f88ed791ab7704
  address public oracleTokenAddress;

  mapping(bytes32 => address) public callers;

  struct Request {
    address requester;
    address payee;
    uint256 tokenId;
  }

  mapping(bytes32 => Request) public requests;

  constructor(
    string memory _dataSource,
    string memory _underlying,
    string memory _oracleService,
    string memory _endpoint,
    string memory _path
  )
    public
  {
    owner = msg.sender;
    dataSource = _dataSource;
    underlying = _underlying;
    oracle = _oracleService;
    jobId = bytes32("493610cff14346f786f88ed791ab7704");
    endpoint = _endpoint;
    path = _path;
    oracleTokenAddress = address(0x20fE562d797A42Dcb3399062AE9546cd06f63280);
    setLinkToken(0x20fE562d797A42Dcb3399062AE9546cd06f63280);
    setOracle(0xc99B3D447826532722E41bc36e644ba3479E4365);
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
  /*
  function generateId()
    internal
    view
    returns (bytes32)
  {
    return bytes32(block.timestamp);
  }
  */

  function kill()
    public
  {
    require(msg.sender == owner);
    selfdestruct(owner);
  }
}
