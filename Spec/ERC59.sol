pragma solidity ^0.4.20;

// massive thanks to ERC-721 spec for this D:

// references to "oracles" could use a different / more general term
// so that the spec could use signed data directly from "source" w/ same interface

/** @title ERC-59 (or whatever) Smart Option Standard
 */
interface ERC59 /* is ERC165 */ {

    /* EVENTS:
    when a piggy is created (incl. RFP state)
    when a piggy is transferred
    when a piggy is set to auction (as RFP or option)
    when an auction is satisfied pre-expiry (separate events for option / RFP ?)
    when an auction expires
    when the oracle is called
    when the settlement is calculated (after oracle callback)
    when a payout is claimed after settlement

    stuff about receipt of collateral ?
    approval stuff ? do we want to allow delegated parties to control piggies ?
    */

    /** @dev This emits when ownership of an ERC-59 token is transferred by any mechanism.
         Mechanisms include direct transfer by owner, or via the embedded auction mechanism.
         This event emits when a token is created (`_from` == 0) and destroyed (`_to` == 0).
         The `_asRequest` bool indicates if the transferred (created / destroyed) token is in
         the "RFP" state requesting fulfillment of a particular desired option.
     */
    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId, bool _asRequest);

    /** @dev This emits when the embedded auction mechanism for a specific ERC-59 token is triggered
         by the owner. This pertains to tokens in the "RFP" state and in the "option" state,
         as identified by the `_asRequest` bool.
     */
    // should this contain more info about the auction parameters (prices, etc.) ? no info about them ?
    event AuctionStarted(uint256 indexed _tokenId, bool indexed _asRequest, uint256 indexed _startPrice);

    /** @dev This emits when an auction for a particular ERC-59 token is satisfied by a counterparty.
         This pertains to tokens in the "RFP" state and the "option" state, as identified via the 
         `_asRequest` bool.
      */
    // change "_asRequest" name here for readability ? make all such bools the same name as each other ?
    event AuctionSatisfied(uint256 indexed _tokenId, address indexed _satisfier, bool _asRequest);

    /** @dev This emits if an auction for a particular ERC-59 token is attempted to be satisfied
         after it has expired.
     */
    event AuctionExpired(uint256 indexed _tokenId);

    /** @dev This emits if the owner of a particular ERC-59 token cancels an active auction for
         that token.
     */
    event AuctionCanceled(uint256 indexed _tokenId);

    /** @dev This emits when an oracle service is called to settle a particular ERC-59 token.
        As oracle services may differ in their design, the address of the oracle contract is a 
        minimum requirement; additional information related to the exact resource queried may 
        also be included in this event.
     */
    // the latter sentence is actually a lie if we want this to be ERC-165, which I like the idea of...
    event OracleCalled(uint256 indexed _tokenId, address indexed _oracle);

    /** @dev This is emitted when settlement is calculated for a particular ERC-59 token, using
         settlement price data returned by the oracle.
     */
    event SettlementCalculated(uint256 indexed _tokenId, uint256 indexed _settlementPrice);

    /** @dev This is emitted when an address claims reference ERC-20 tokens from the ERC-59 contract. */
    // does this need to be associated w/ a token ID, per se ? it seems maybe not...
    // do we even need this one at all ? it is mostly in reference to the ERC-20 token, which would
    // presumably emit all the relevant information... probably remove this
    // alternatively could try to have an event that explicitly associates a certain ERC-20 claim
    // with a specific ERC-59 token, I guess ?
    event PayoutClaimed(address indexed _claimant, uint256 _amount);

    /* FUNCTIONS:
    balance of address (# of piggies owned)
    owner of token ID
    transfer from
    token ID is for sale (?)
    state of token ID (?) (RFP or option)
    start auction
    satisfy auction (either purchase piggy, or fulfill RFP)
    call oracle
    calculate settlement
    claim payout (does this work for auction settlement as well perhaps ?) (is this a function of the piggy, or just incidental / handled by the reference ERC-20?)
    */

    // constructor should throw if various things aren't properly set
    // also should throw if the contract is not delegated an amount of collateral designated
    // in the reference ERC-20 which is >= the collateral value of the piggy


    // token should capture claim fields --> "getSellerClaim()" / "getOwnerClaim()" ?
    // the oracle has to do a lot of heavy lifting in the current design, and the token needs
    // to be created with extreme care wrt the oracle metadata
    // if we want to do "capped" options as traditional, need more metadata re: endpoints i guess
    /** @notice Create a new ERC-59 token
        @dev Throws if `_collateralERC` is not a valid Ethereum (ERC-20) address.
         Throws if `_premiumERC` is not a valid Ethereum (ERC-20) address (may be same
         as `_collateralERC`).
         Throws if `_oracle` is not a valid Ethereum address.
         Throws if `_expiry` < block.number.
         If `_asRequest` is true, throws if `_reqCollateral` == 0.
         If `_asRequest` is false, throws if msg.sender has not delegated at least `_collateral`
         in the ERC-20 token whose contract is `_collateralERC` to the ERC-59 contract.
         When a new token is created, msg.sender should be recorded as the creator and owner.
         If `_asRequest` is true, the zero address should be recorded as the seller.
         If `_asRequest` is false, msg.sender should be recorded as the seller.
         If `_asRequest` is false, `_reqCollateral` will be irrelevant and should be captured as 0.
         If `_asRequest` is false, the ERC-59 contract must take ownership of `_collateral` amount
         of ERC-20 tokens governed by the `_collateralERC` contract.
        @param _collateralERC The address of the reference ERC-20 token to be used as collateral
        @param _premiumERC The address of the reference ERC-20 token to be used to pay the premium
        @param _oracle The address of a service contract which will return the settlement price
        @param _asRequest If true, will create the token as an "RFP" / request for a particular option
        @param _underlyingNow An identifier for the reference underlying which the contract at `_oracle`
         is able to parse to return the current price of the underlying
        @param _underlyingExpiry An identifier for the reference underlying which the contract at
         `_oracle` is able to parse to return the price of the underlying at `_expiry`
        @param _collateral The amount of collateral for the option, denominated in units of the token
         at the `_collateralERC` address
        @param _lotSize A multiplier on the settlement price used to determine settlement claims
        @param _strikePrice The strike value of the option, in the same units as the settlement price
        @param _expiry The block height at which the option will expire
        @param _reqCollateral The amount of collateral desired in the option, if creating with 
         `_asRequest` == true, denominated in units of the token at the `_collateralERC` address
        @param _isEuro If true, the option can only be settled at or after `_expiry` is reached, else
         it can be settled at any time
        @param _isPut If true, the settlement claims will be calculated for a put option; else they
         will be calculated for a call option
     */
    function createToken(
        address _collateralERC,
        address _premiumERC,
        address _oracle,
        bool _asRequest,
        string _underlyingNow,
        string _underlyingExpiry,
        uint256 _collateral,
        uint256 _lotSize,
        uint256 _strikePrice,
        uint256 _expiry,
        uint256 _reqCollateral,
        bool _isEuro,
        bool _isPut)
        external;
    
    /** @notice Burn an ERC-59 token
        @dev Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `_tokenId` is not a valid ERC-59 token.
         This function should "zero out" relevant state variables to clean up the chain. (?)
         Assigns the owner of the _tokenId to the zero address.
        @param _tokenId The identifier for a specific ERC-59 token to be burned
     */
    function burnToken(uint256 _tokenId) external; // ?

    /** @notice Reclaim collateral from a token and burn it
        @dev Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `isRequest(_tokenId)` is true (there is no true collateral to reclaim).
         Throws if `onMarket(_tokenId)` is true.
         If the function does not throw, the ERC-59 contract must return `_collateral` amount of
         the ERC-20 token governed by the contract at `_collateralERC` to msg.sender, and then
         must call `burnToken(_tokenId)`.
        @param _tokenId The identifier for a specific ERC-59 token
     */
    function reclaimAndBurn(uint256 _tokenId) external;

    /** @notice Split an ERC-59 token's collateral into two tokens
        @dev Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `_splitSize` >= `_collateral` value of the specified token.
         Throws if `isRequest(_tokenId)` is true.
         If the function does not throw, it should create two new ERC-59 tokens and transfer
         them to msg.sender, with all variables the same as those used to create `_tokenId`
         except for the collateral: one token should have as collateral `_splitSize`, and
         the other should have as collateral the `_collateral` value of `_tokenId` minus
         `_splitSize`. After the tokens are created and transferred, `burnToken(_tokenId)`
         must be called to burn the original token.
        @param _tokenId The identifier for a specific ERC-59 token to have its collateral split
        @param _splitSize The amount of collateral to split out of the collateral of the token; 
         the remainder will become the collateral for a second token
     */
    function splitToken(uint256 _tokenId, uint256 _splitSize) external;

    /** @notice Count the number of ERC-59 tokens owned by a particular address
        @dev ERC-59 tokens assigned to the zero address are considered invalid, and this
         function throws for queries about the zero address.
        @param _owner An address for which to query the balance of ERC-59 tokens
        @return The number of ERC-59 tokens owned by `_owner`, possibly zero
     */
    function balanceOf(address _owner) external view returns (uint256);

    /** @notice Find the owner (long counterparty) of a particular ERC-59 token
        @dev ERC-59 tokens assigned to the zero address are considered invalid, and this
         function throws for queries about such tokens.
        @param _tokenId The identifier for a specific ERC-59 token
        @return The address of the owner of the token, if not the zero address
     */
    function ownerOf(uint256 _tokenId) external view returns (address);

    /** @notice Find the seller (short counterparty) of a particular ERC-59 token
        @dev ERC-59 tokens with a zero-address seller are considered invalid, and this function
         throws for queries about such tokens.
        @param _tokenId The identifier for a specific ERC-59 token
        @return The address of the seller of the token, if not the zero address
     */
    // necessary ? could also make this not throw for zero address and have the zero address as 
    // the default "seller" if a token was created as an RFP
    function sellerOf(uint256 _tokenId) external view returns (address);

    /** @notice Find the original creator of a particular ERC-59 token
        @dev Throws if `_tokenId` is not a valid ERC-59 token.
        @param _tokenId The identifier for a specific ERC-59 token
        @return The address of the original creator of the specified token
     */
    // useful ?
    function creatorOf(uint256 _tokenId) external view returns (address);

    /** @notice Get the amount of collateral associated with a particular ERC-59 token
        @dev ERC-59 tokens assigned to the zero address are considered invalid, and this
         function throws for queries about such tokens.
        @param _tokenId The identifier for a specific ERC-59 token
        @return The amount of collateral designated in the `_collateralERC` token associated with
         the queried `_tokenId`; in the case that `isRequest(_tokenId)` is true, this is a desired
         amount of collateral rather than an amount actually controlled by the ERC-59 contract
     */
    function getCollateral(uint256 _tokenId) external view returns (uint256);

    /** @notice See if a specific ERC-59 token is currently holding an active auction for itself
        @dev This applies to tokens regardless of the return value of `isRequest(_tokenId)`.
         Throws if `tokenId` is not a valid ERC-59 token.
        @param _tokenId The identifier for a specific ERC-59 token
        @return True if the auction state of the queried `_tokenId` is currently active
     */
    // is this necessary ? or just rely on external scanners to scrape state variable bools ?
    function onMarket(uint256 _tokenId) external view returns (bool);

    /** @notice Get the block height at the start of an active auction for an ERC-59 token
        @dev This applies to tokens regardless of the return value of `isRequest(_tokenId)`.
         Throws if `onMarket(_tokenId)` is false.
        @param _tokenId The identifier for a specific ERC-59 token
        @return The block height at which the current auction for the specified token was triggered
     */
    function getAuctionStart(uint256 _tokenId) external view returns (uint256);

    /** @notice See if a specific ERC-59 token is currently in the "RFP" state
        @dev This state may only be specified at creation of an ERC-59 token. It may only move
         from "RFP" state to "option" state once for a particular `_tokenId`, and may never move
         in the reverse direction (that is, from "option" to "RFP" state) for any token.
        @param _tokenId The identifier for a specific ERC-59 token
        @return True if the "RFP" state of the queried `_tokenId` is currently true
     */
    // is this necessary ? or just rely on external scanners to scrape state variable bools ?
    function isRequest(uint256 _tokenId) external view returns (bool);

    /** @notice See if a settlement price has been returned by the oracle for a particular ERC-59 token
        @dev Throws if `_tokenId` is an invalid ERC-59 token.
         The value returned by this function must default to false and only be set to true upon
         successful return of a value from the oracle after calling `requestSettlementPrice()`.
        @param _tokenId The identifier of a specific ERC-59 token
        @return True if a settlement price has been fetched from the oracle for the queried `_tokenId`
     */
    function hasSettlementPrice(uint256 _tokenId) external view returns (bool);

    /** @notice Get the settlement price which was fetched by the oracle
        @dev Throws if `_tokenId` is an invalid ERC-59 token.
         The value returned by this function must have been set after successful return of a value
         from the oracle after calling `requestSettlementPrice()`.
        @param _tokenId The identifier of a specific ERC-59 token
        @return The settlement price for the option identified by `_tokenId`
     */
    function getSettlementPrice(uint256 _tokenId) external view returns (uint256);

    /** @notice See if a particular ERC-59 token has been settled (i.e. collateral has been assigned)
        @dev Throws if `_tokenId` is an invalid ERC-59 token.
        @param _tokenId The identifier of a specific ERC-59 token
        @return True if settlement has occured for the queried `_tokenId`
     */
    function hasBeenSettled(uint256 _tokenId) external view returns (bool);

    /** @notice Transfer a specific _tokenId to a new owner
        @dev Throws if msg.sender is not the owner (or an approved sender ?) of `_tokenId`.
         Throws if `_from` is not the owner of `_tokenId`.
         Throws if `_to` is the zero address.
         Throws if `_tokenId` is not a valid ERC-59 token.
         Throws if `onMarket(_tokenId)` is true.
         Throws if the `_expiry` value of the specified token is less than block.height.
         Throws if `hasBeenSettled(_tokenId)` is true.
        @param _from The current owner of the ERC-59 token
        @param _to The new owner of the ERC-59 token
        @param _tokenId The identifier of the specific ERC-59 token to be transferred 
     */
    // any reason this would need extra parameters like "_data" in ERC-721 ?
    // implement a "safeTransferFrom" similar to ERC-721 as well ?
    function transferFrom(address _from, address _to, uint256 _tokenId) external;

    // be careful with logic here
    /** @notice Start a collateralized autonomous auction for a token
        @dev This applies to tokens regardless of the return value of `isRequest(_tokenId)`.
         Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `onMarket(_tokenId)` is true.
         Throws if `_expiry` of the specified token is < block.number.
         Throws if `_auctionExpiry` < block.number (+ some padding adjustment ??).
         Throws if `_auctionExpiry` > `_expiry` for the specified token.
         Throws if `hasSettlementPrice(_tokenId)` is true [I think ?].
         Throws if `isRequest(_tokenId)` is true and msg.sender has not delegated at least
         `_reservePrice` in the ERC-20 token governed by `_premiumERC` to this contract.
         All state variables specified in this function should be captured and associated with
         `_tokenId` for reference when settling the auction. Additional state should be captured
         such that `onMarket(_tokenId)` will return true after execution of this function,
         and `getAuctionStart(_tokenId)` will return the block height at which this function
         was triggered. The ERC-59 contract must also take ownership of `_reservePrice` amount of the
         ERC-20 token governed by `_premiumERC` for the auction to successfully start.
        @param _tokenId The identifier of the specific ERC-59 token to be auctioned
        @param _startPrice The starting price for the auction, denominated in the reference
         ERC-20 token
        @param _reservePrice The minimum sale price that the owner will accept for the token
         (if `isRequest(_tokenId)` is false) or maximum premium that the owner will pay for 
         fulfillment of the desired parameterized token (if `isRequest(_tokenId)` is true)
        @param _auctionExpiry The block height at which the auction will expire
        @param _timeStep The time step in blocks on which `_startPrice` will move towards `_reservePrice`
        @param _priceStep The amount by which the required price to satisfy the auction will move
         towards `_reservePrice` on each time step
        @param _reqCollateral The amount of requested collateral if the auction is for an ERC-59 token in the "RFP" state.
         Will be ignored for tokens in the "option" state regardless of value.
     */
    function startAuction(
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _auctionExpiry,
        uint256 _timeStep,
        uint256 _priceStep,
        uint256 _reqCollateral)
        external;

    /** @notice End an auction for a token
        @dev Throws if msg.sender is not the owner of the token.
         Throws if `_tokenId` is not a valid ERC-59 token.
         Throws if `onMarket(_tokenId)` is false.
         If the function does not throw, changes the state of the token such that `onMarket(_tokenId)`
         will return false. If `isRequest(_tokenId)` is true, returns the `_reservePrice` collateral
         to msg.sender, denominated in the ERC-20 token governed by the contract at `_premiumERC`.
        @param _tokenId The identifier of the specific ERC-59 token for which to end the auction
     */
    function endAuction(uint256 _tokenId) external;

    /** @notice Satisfy an active auction
        @dev For purposes of this explanation, it is assumed that the contract has associated state
         variables with `_tokenId` which correspond to the auction parameter variables in the 
         `startAuction()` function.
         Throws if msg.sender is the owner of `_tokenId`.
         Throws if `_tokenId` is not a valid ERC-59 token.
         Throws if `onMarket(_tokenId)` is false.
         If `isRequest(_tokenId)` is false, throws if `_auctionPrice` is less than:
         `_startPrice` - (block.number - `getAuctionStart(_tokenId))` * `_priceStep` / `_timeStep`.
         If `isRequest(_tokenId)` is true, throws if `_auctionPrice` is less than:
         `_startPrice` + (block.number - `getAuctionStart(_tokenId)`) * `_priceStep` / `_timeStep`.
         If `isRequest(_tokenId)` is false, throws if the ERC-59 contract has not been delegated
         an amount of the ERC-20 governed by the contract at `_premiumERC` by msg.sender 
         which is >= `_auctionPrice`.
         If `isRequest(_tokenId)` is true, throws if the ERC-59 contract has not been
         delegated an amount of the ERC-20 token governed by the contract at `_collateralERC`
         which is >= `_reqCollateral` by msg.sender.
         If `getAuctionStart(_tokenId)` + `_expiry` < block.number, emits an `AuctionExpired` event
         and changes the state such that `onMarket(_tokenId)` will return false then exits.
         If the function does not throw and the auction is not expired and `isRequest(_tokenId)`
         is false, takes ownership of an amount of the ERC-20 token governed by the `_premiumERC`
         contract which is == `_auctionPrice` from msg.sender, then transfers ownership of 
         `_tokenId` to msg.sender and ownership of an amount of the ERC-20 token governed by the
         `_premiumERC` contract which is  == `_auctionPrice` to the address which started the auction.
         If the function does not throw and the auction is not expired and `isRequest(_tokenId)`
         is true, takes ownership of an amount of the ERC-20 token governed by the contract at 
         `_premiumERC` == `_auctionPrice` from the owner of `_tokenId`, takes ownership of an amount
         of the ERC-20 token governed by the contract at `_collateralERC` == `_reqCollateral` from
         msg.sender, changes the state such that `isRequest(_tokenId)` will return false and that
         `sellerOf(_tokenId)` == msg.sender, transfers an amount of the ERC-20 token governed by the
         contract at `_premiumERC` == `_auctionPrice` to msg.sender, and an amount of the same ERC-20
         token == `getCollateral(_tokenId)` - `_auctionPrice` to `ownerOf(_tokenId)` (if this value
         is > 0), then finally updates the state such that `getCollateral(_tokenId)` will return
         `reqCollateral` [is this last actually required ? I think it falls out by definition...].
        @param _tokenId The identifier of the specific ERC-59 token for which to satisfy the auction
        @param _auctionPrice The price / premium for which to settle the auction, depending on state
     */
    // owner's collateral regardless of option / RFP should have been satisfied already by the 
    // time the auction starts, so this function just needs to confirm the satisfier's "collateral"
    // when satisfying an auction, the ERC-59 contract temporarily escrows the amounts of the relevant
    // ERC-20 tokens by taking control of them and distributing them to the appropriate parties
    // then updating any ERC-59 token state to reflect ownership / seller / collateral changes
    function satisfyAuction(uint256 _tokenId, uint256 _auctionPrice) external;

    /** @notice Call the oracle to fetch the settlement price
        @dev Throws if `_tokenId` is not a valid ERC-59 token.
         Throws if `_oracle` is not a valid contract address.
         Throws if `onMarket(_tokenId)` is true.
         If `isEuro` is true for the specified token, throws if `_expiry` > block.number.
         If `isEuro` is true for the specified token, throws if `_priceNow` is true. [OR specify that it flips that to false always (?)]
         If `priceNow` is true, throws if block.number > `_expiry` for the specified token.
         If `priceNow` is false, throws if block.number < `_expiry` for the specified token.
         If `priceNow` is true, calls the oracle to request the `_underlyingNow` value for the token.
         If `priceNow` is false, calls the oracle to request the `_underlyingExpiry` value for the token.
         Depending on the oracle service implemented, additional state will need to be referenced in
         order to call the oracle, e.g. an endpoint to fetch. This state handling will need to be
         managed on an implementation basis for specific oracle services.
        @param _tokenId The identifier of the specific ERC-59 token for which to fetch a settlement price
        @param _oracle The address of the oracle contract used to fetch the external settlement price
        @param _priceNow A boolean for specifying whether to fetch a "live" price or a fixed price at 
         expiry of the option
        @return The settlement price from the oracle to be used in `settleOption()`
     */
    // might need to be payable if oracle demands ETH
    function requestSettlementPrice(uint256 _tokenId, address _oracle, bool _priceNow) external returns (uint256);

    // calculate settlement using oracle's callback data
    // needs to have _settlementPrice from oracle
    // options math goes here -- conditionals based on call/put
    // if it doesn't throw, should delegate the amount of ERC-20 collateral to counterparties
    // who then have to pull the payments
    // also MUST flag the option as "settled" -- will disallow transfer of the option
    // e.g. `hasBeenSettled(_tokenId)` must return true after successful execution of this function
    /** @notice Calculate the settlement of ownership of option collateral
        @dev Throws if `_tokenId` is not a valid ERC-59 token.
         Throws if msg.sender is not one of: seller, owner of `_tokenId`.
         Throws if `hasSettlementPrice(_tokenId)` is false.
         
         [Option settlement math goes here for call / put situations]

     */
    function settleOption(uint256 _tokenId) external;

    // claim payout - pull payment
    // sends any reference ERC-20 which the _claimant is owed (as a result of an auction or settlement)
    // I guess this would basically just dispatch a call to the reference ERC-20 contract ?
    // calling that contract's equivalent of "transferFrom()" with msg.sender (non-forwarded) as
    // the "from" address, and _claimant as the "to" address?
    function claimPayout(uint256 _tokenId, address _claimant) external;
}