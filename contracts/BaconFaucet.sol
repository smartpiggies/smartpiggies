pragma solidity >=0.4.24 <0.6.0;


import "./SafeMath.sol";

interface PaymentToken {
  function transferFrom(address from, address to, uint256 value) external returns (bool);
  function transfer(address to, uint256 value) external returns (bool);
  function decimals() external returns (uint8);
}

contract BaconFaucet {
    using SafeMath for uint256;

    bytes32 constant TX_SUCCESS = bytes32(0x0000000000000000000000000000000000000000000000000000000000000001);
    uint256 constant BACON_AMOUNT = 100000000000000000000000;
    uint256 constant LINK_AMOUNT = 5000000000000000000;
    address payable owner;
    address public baconAddress;
    address public linkAddress;

    mapping(address => uint256) public grantees;

    constructor(address _bacon, address _link)
        public
    {
        owner = msg.sender;
        baconAddress = _bacon;
        linkAddress = _link;
    }

    function gimme()
        public
        returns (bool)
    {
        // update first in case of re-entry
        ++grantees[msg.sender];

        require(grantees[msg.sender] < 5);
        (bool success, bytes memory result) = address(PaymentToken(baconAddress)).call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                msg.sender,
                BACON_AMOUNT
            )
        );

        bytes32 txCheck = abi.decode(result, (bytes32));
        require(success && txCheck == TX_SUCCESS, "ERC20 token transfer failed");

        (success, result) = address(PaymentToken(linkAddress)).call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                msg.sender,
                LINK_AMOUNT
            )
        );

        txCheck = abi.decode(result, (bytes32));
        require(success && txCheck == TX_SUCCESS, "ERC20 token transfer failed");

        return true;
    }

    function resetGrantee(address _address)
        public
        returns (bool)
    {
         require(msg.sender == owner, "Only the owner can do reset a grantee.");
         grantees[_address] = 0;
         return true;
    }

    function getGrantCount(address _address)
        public
        view
        returns (uint256)
    {
        return grantees[_address];
    }

    function changeBaconAddress(address _newAddress)
        public
        returns (bool)
    {
        require(msg.sender == owner);
        baconAddress = _newAddress;
    }

    function changeLinkAddress(address _newAddress)
        public
        returns (bool)
    {
        require(msg.sender == owner);
        linkAddress = _newAddress;
    }

    function getOwner()
        public
        view
    returns (address)
    {
    return owner;
    }

    function changeOwner(address payable _newAddress)
        public
        returns (bool)
    {
        require(msg.sender == owner);
        owner = _newAddress;
        return true;
    }

    function kill()
        public
    {
        require(msg.sender == owner);
        selfdestruct(owner);
    }
}
