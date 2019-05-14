pragma solidity >=0.4.24 <0.6.0;
pragma experimental ABIEncoderV2;

//import "https://github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
//import "https://github.com/OpenZeppelin/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract StableTokenFaucet is ERC20, ERC20Detailed, ERC20Mintable, ERC20Burnable {
    //string public name = "Stable";
    //string public symbol = "STBLE";
    //uint8 public decimals = 18;

  address payable owner;
  uint256 public previousGiveaway;
  uint256 public lastGiveaway;

  struct Recipient {
    address receiver;
    uint256 nextGiveawayBlock;
  }

  mapping(address => Recipient) private recipients;

  constructor()
    ERC20Burnable()
    ERC20Mintable()
    ERC20Detailed("StableTokenFaucet","STBLE-F",18)
    ERC20()
    public
  {
    owner = msg.sender;
  }

  function drip()
    public
    returns (bool)
  {
    require(msg.sender != address(0));
    require(recipients[msg.sender].nextGiveawayBlock < block.number);
    recipients[msg.sender].nextGiveawayBlock = block.number + 20;
    _mint(msg.sender, 100000000000000000000);
  }

  function getRecipient(address _recipient)
    public
    view
    returns(Recipient memory)
  {
    return recipients[_recipient];
  }

  function kill() public
  {
    require(msg.sender == owner);
    selfdestruct(owner);
  }

}
