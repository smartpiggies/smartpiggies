pragma solidity >=0.5.15;

contract CodeSize {

    function getSize(address _address)
      public
      view
      returns (uint256)
    {
        uint size;
        assembly { size := extcodesize(_address) }
        return size;
    }
}
