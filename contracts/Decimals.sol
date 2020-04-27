pragma solidity >0.6.0;

contract Decimals {
    address public tokenContract;
    bool public didComplete;
    bytes public result;
    uint8 public decoded;
    bool public test;

    constructor()
      public
    {

    }

    function fetchDecimals()
      public
    {
      (bool success, bytes memory data) = address(tokenContract).call(
            abi.encodeWithSignature(
                "decimals()"
            )
        );

      didComplete = success;
      result = data;
      decoded = abi.decode(data, (uint8));

      if (decoded > 255) {
          test = true;
      }
    }

    function setContract(address _newAddress)
      public
    {
        tokenContract = _newAddress;
    }

    function setTestFalse()
      public
    {
        test = false;
    }
}
