pragma solidity ^0.5.0;

contract StructTest {
    address payable owner;
    uint256 public counter;

    struct detail {
        string  title;
        uint256 docNumber;
        uint256 count;
        bool    isChanged;
    }

    mapping(uint256 => detail) public details;

    constructor()
      public
    {
        owner = msg.sender;
    }

    function setStruct(string memory _title, uint256 _doc)
        public
    {
        counter++;
        details[counter] = detail(_title, _doc, counter, true);
    }

    function kill() public
    {
        require(msg.sender == owner);
        selfdestruct(owner);
    }
}
