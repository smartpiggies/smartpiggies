pragma solidity >=0.4.24 <0.6.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract StableToken is ERC20, ERC20Detailed, ERC20Mintable, ERC20Burnable {
    //string public name = "Stable";
    //string public symbol = "STBLE";
    //uint8 public decimals = 18;

  address payable owner;

  constructor()
    ERC20Burnable()
    ERC20Mintable()
    ERC20Detailed("StableToken","STBLE",18)
    ERC20()
    public
  {
    owner = msg.sender;
  }

  function kill() public
  {
    require(msg.sender == owner);
    selfdestruct(owner);
  }

}
