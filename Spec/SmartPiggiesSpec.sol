/**
This specification defines a solidity implementation for SmartPiggies.

SmartPiggies is an open source standard for
a free peer to peer global derivatives market.

Copyright (C) 2019, Arief, Algya, Lee

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
pragma experimental ABIEncoderV2;

/** @title SmartPiggies Decentralized Option Standard
    @dev See https://github.com/smartpiggies/smartpiggies for an example implementation
*/

/** @notice Define an interface for payment tokens
    @dev This interface is used to interact with ERC-20 tokens used for payment
     of premium and collateral
 */
interface PaymentToken {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function decimals() external returns (uint8);
}

/** @notice Define the SmartPiggies standard
     N.B. this interface can be made ERC-165-compliant after finalization.
*/
interface SmartPiggies /* is ERC165 */ {
    /** @dev This emits when ownership of a SmartPiggies token is transferred by any mechanism.
         Mechanisms include direct transfer by owner, or via the embedded auction mechanism.
         This event emits when a token is created (`_from` == 0) and destroyed (`_to` == 0).
         The `_isRequest` bool indicates if the transferred (created / destroyed) token is in
         the "RFP" state requesting fulfillment of a particular desired option.
     */
    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId, bool _isRequest);

    /** @dev This emits when the embedded auction mechanism for a specific SmartPiggies token is
         triggered by the owner. This pertains to tokens in the "RFP" state and in the "option"
         state, as identified by the `_isRequest` bool. All information relevant to calculating
         the piecewise price schedule for the auction is contained in the event.
     */
    event AuctionStarted(
    uint256 indexed _tokenId,
    bool indexed _isRequest,
    uint256 indexed _startPrice,
    uint256 _reservePrice,
    uint256 _expiryBlock,
    uint256 _timeStep,
    uint256 _priceStep
    );

    /** @dev This emits when an auction for a particular SmartPiggies token is satisfied by a
         counterparty. This pertains to tokens in the "RFP" state and the "option" state, as
         identified via the `_isRequest` bool.
      */
    event AuctionSatisfied(uint256 indexed _tokenId, address indexed _satisfier, bool _isRequest);

    /** @dev This emits if an auction for a particular SmartPiggies token is attempted to be
         satisfied after it has expired.
     */
    event AuctionExpired(uint256 indexed _tokenId);

    /** @dev This emits if the owner of a particular SmartPiggies token cancels an active auction
         for that token.
     */
    event AuctionCanceled(uint256 indexed _tokenId);

    /** @dev This emits when a data source resolver is called to settle a particular SmartPiggies
         token.
     */
    event ResolverCalled(uint256 indexed _tokenId, address indexed _resolverAddress);

    /** @dev This is emitted when settlement is calculated for a particular SmartPiggies token,
         using settlement price data returned by the resolver.
     */
    event SettlementCalculated(uint256 indexed _tokenId, uint256 indexed _settlementPrice);

    /** @dev This is emitted when an address claims reference ERC-20 tokens used for collateral or
         premia from the SmartPiggies contract.
     */
    event PayoutClaimed(address indexed _claimant, uint256 _amount);

    /** @notice Create a new SmartPiggies token
        @dev When a new token is created, if `_isRequest` is false, msg.sender should be recorded as
         both the writer and holder of the token; if `_isRequest` is true, msg.sender should be
         recorded as the holder of the token only.
        Throws if `_collateralERC` is not a valid Ethereum (ERC-20) address.
        Throws if `_premiumERC` is not a valid Ethereum (ERC-20) address (may be same
         as `_collateralERC`).
        Throws if `_dataResolverNow` is not a valid Ethereum address.
        Throws if `_dataResolverAtExpiry` is not a valid Ethereum address.
        Throws if `_collateral` == 0.
        Throws if `_lotSize` == 0.
        Throws if `_strikePrice` == 0.
        Throws if `_expiry` == 0.
        If `_isRequest` is false, throws if msg.sender has not delegated at least `_collateral`
         in the ERC-20 token whose contract is `_collateralERC` to the SmartPiggies contract. The
         SmartPiggies contract must take control of that collateral when the token is created.
        @param _collateralERC The address of the reference ERC-20 token to be used as collateral.
        @param _premiumERC The address of the reference ERC-20 token to be used to pay the premium.
        @param _dataResolverNow The address of a service contract which will return a current price
         (as of the query) for the underlying. The underlying is implicit in the choice of a data
         resolver.
        @param _dataResolverAtExpiry The address of a service contract which will return a price for
         the underlying at the expiration date specifically. The expiration will be defined by the
         `_expiry` parameter. The price resolved by `dataResolverAtExpiry` should be the same
         underlying as specified by `_dataResolverNow`.
        @param _collateral The amount of collateral for the option, denominated in units of the token
         at the `_collateralERC` address. If `_isRequest` is true, this is the desired amount of
         collateral that the token creator wishes an underwriter to provide.
        @param _lotSize A multiplier on the settlement price used to determine settlement claims.
        @param _strikePrice The strike price of the option, which must be declared in the same units
         as the settlement price.
        @param _expiry The number of blocks until the option expires.
        @param _isEuro If true, the option can only be settled at or after the expiration block heigh
         is reached, else it can be settled at any time.
        @param _isPut If true, the settlement claims will be calculated for a put option; else they
         will be calculated for a call option.
        @param _isRequest If true, the token will be created as an "RFP" token requesting the
         fulfillment of the token specified by the rest of the parameters.
        @return true on successful token creation.
    */
   function createPiggy(
   address _collateralERC,
   address _premiumERC,
   address _dataResolverNow,
   address _dataResolverAtExpiry,
   uint256 _collateral,
   uint256 _lotSize,
   uint256 _strikePrice,
   uint256 _expiry,
   bool _isEuro,
   bool _isPut,
   bool _isRequest
   )
   external
   returns (bool);

    /** @notice Count the number of SmartPiggies tokens owned by a particular address
        @dev SmartPiggies tokens assigned to the zero address are considered invalid, and this
         function throws for queries about the zero address.
        @param _owner An address for which to query the balance of SmartPiggies tokens.
        @return An array of SmartPiggies token IDs tokens owned by `_owner`, possibly empty.
     */
    function getOwnedPiggies(address _owner) external view returns (uint256[] memory);

    /** @notice Find the holder (long counterparty) of a particular Smartpiggies token
        @dev SmartPiggies tokens assigned to the zero address are considered invalid, and this
         function throws for queries about such tokens.
        @param _tokenId The identifier for a specific SmartPiggies token.
        @return The address of the owner of the token, if not the zero address.
     */
    function holderOf(uint256 _tokenId) external view returns (address);

    /** @notice Find the writer (short counterparty) of a particular SmartPiggies token
        @dev SmartPiggies tokens in the "RFP" state should have the zero address designated as
         the writer of the token until fulfilled by an underwriter.
        @param _tokenId The identifier for a specific SmartPiggies token.
        @return The address of the seller of the token, or the zero address if the token is in
         the "RFP" state.
     */
    function writerOf(uint256 _tokenId) external view returns (address);

    /** @notice Transfer a SmartPiggies token
        @dev Throws if `_from` is not the owner of `_tokenId`.
        Throws if `_to` is the zero address.
        @param _from The address from which to transfer a SmartPiggies token.
        @param _to The new owner of the SmartPiggies token.
        @param _tokenId The identifier of the specific token to be transferred.
        @return true on successful transfer
     */
    function transferFrom(address _from, address _to, uint256 _tokenId) external returns (bool);

    /** @notice Update option parameters of a SmartPiggies token in the "RFP" state
        @dev Throws if `msg.sender` is not the owner of `_tokenId`.
        Throws if `_tokenId` is currently on auction.
        If `_collateralERC` is the zero address, it will be unchanged by this function.
        If `_premiumERC` is the zero address, it will be unchanged by this function.
        If `_dataResolverNow` is the zero address, it will be unchanged by this function.
        If `_dataResolverAtExpiry` is the zero address, it will be unchanged by this function.
        If `_collateral` == 0, it will be unchanged by this function.
        If `_lotSize` == 0, it will be unchanged by this function.
        If `_strikePrice` == 0, it will be unchanged by this function.
        If `_expiry` == 0, it will be unchanged by this function.
        @param _tokenId The token ID of the (RFP) token to update.
        @param _collateralERC The new ERC-20 contract address to use for collateral
        @param _premiumERC The new ERC-20 contract address to use for premium payments
        @param _dataResolverNow The new data resolver address to be used to query a live price
         of the underlying.
        @param _dataResolverAtExpiry The new data resolver address to be used to query a price
         of the underlying at expiry.
        @param _collateral The new amount of desired collateral for the option, in the event the
         RFP is fulfilled.
        @param _lotSize The new lot size multiplier for the desired option.
        @param _strikePrice The new strike price for the desired option.
        @param _expiry The new number of blocks until expiration of the option.
        @param _isEuro The new identifier determining if the desired option is European
         (when true) or American (when false).
        @param _isPut The new identifier determining if the desired option is a put (when true)
         or a call (when false).
        @return true on successful update of the RFP option parameters.
     */
    function updateRFP(
        uint256 _tokenId,
        address _collateralERC,
        address _premiumERC,
        address _dataResolverNow,
        address _dataResolverAtExpiry,
        uint256 _collateral,
        uint256 _lotSize,
        uint256 _strikePrice,
        uint256 _expiry,
        bool _isEuro,
        bool _isPut
    )
        external
        returns (bool);

    /** @notice Reclaim collateral from a token and burn it
        @dev Throws if `msg.sender` is not the owner of `_tokenId`.
        Throws if `_tokenId` is currently being auctioned.
        If `_tokenId` is in the "RFP" state, burns the token by zeroing out all storage fields
         related to the token.
        If `_tokenId` is not in the "RFP" state, transfers the ERC-20 collateral originally
         designated during token creation back to `msg.sender`, then burns the token in the
         manner described above.
        @param _tokenId The ID of the token to be burned (after reclaiming collateral)
        @return true on successful reclaim and burn of `_tokenId`.
     */
    function reclaimAndBurn(uint256 _tokenId) external returns (bool);

    /** @notice Split a SmartPiggies token's collateral into two tokens
        @dev Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `_splitSize` >= `_collateral` value of the specified token.
         Throws if `_tokenId` is in the "RFP" state.
         If the function does not throw, it should create two new SmartPiggies tokens and
         transfer them to msg.sender, with all variables the same as those used to create
         `_tokenId` except for the collateral: one token should have as collateral
         `_splitSize`, and the other should have as collateral the `_collateral` value of
         `_tokenId` minus `_splitSize`. After the tokens are created and transferred,
         the original token must be burned.
        @param _tokenId The identifier for a specific SmartPiggies token to have its
         collateral split.
        @param _splitSize The amount of collateral to split out of the collateral of the token;
         the remainder will become the collateral for a second token
     */
    function splitToken(uint256 _tokenId, uint256 _splitSize) external returns (bool);

    /** @notice Start a collateralized autonomous auction for a token
        @dev This function may be called on tokens regardless of whether they are in the "RFP"
         state or not.
         Throws if msg.sender is not the owner of `_tokenId`.
         Throws if `_tokenId` is already currently on auction.
         Throws if `_auctionLength` == 0.
         Throws if `block.number + _auctionExpiry` > the expiration block height for the
          specified token (i.e. the option expiry parameter).
         Throws if `_tokenId` has already been cleared by a data resolver (i.e. a settlement
          price has been returned for the option).
         Throws if `_tokenId` is in the "RFP" state and `msg.sender` has not delegated at least
         `_reservePrice` in the ERC-20 token governed by `_premiumERC` to this contract.
         All state variables specified in this function should be captured and associated with
         `_tokenId` for reference when settling the auction. Additional state should be captured
         such that `_tokenId` will be defined as on auction after execution of this function.
         The SmartPiggies contract must also take ownership of `_reservePrice` amount of the
         ERC-20 token governed by `_premiumERC` for the auction to successfully start.
        @param _tokenId The identifier of the specific SmartPiggies token to be auctioned.
        @param _startPrice The starting price for the auction, denominated in the reference
         ERC-20 token.
        @param _reservePrice The minimum sale price that the owner will accept for the token
         (if `_tokenId` is not in the "RFP" state) or maximum premium that the owner will pay
         for fulfillment of the desired parameterized token (if `_tokenId` is in the "RFP" state).
        @param _auctionLength The number of blocks after which the auction will expire.
        @param _timeStep The time step in blocks on which `_startPrice` will move towards
         `_reservePrice`.
        @param _priceStep The amount by which the required price to satisfy the auction will move
         towards `_reservePrice` on each time step.
        @return true on successful auction start.
     */
    function startAuction(
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _auctionLength,
        uint256 _timeStep,
        uint256 _priceStep
    )
        external
        returns (bool);

    /** @notice End an auction for a token
        @dev Throws if `msg.sender` is not the owner of the token.
         Throws if `_tokenId` is not currently on auction.
         Throws if `_tokenId` is on auction and that auction is currently in the process of being
          satisfied.
         If the function does not throw, changes the state of the token such that `_tokenId` will
          no longer be designated as on auction. If `_tokenId` is in the "RFP" state, returns the
          auction's `_reservePrice` collateral to `msg.sender`, denominated in the ERC-20 token
          governed by the contract at `_premiumERC`.
        @param _tokenId The identifier of the specific SmartPiggies token for which to end the
         auction.
        @return true on successful ending of auction.
     */
    function endAuction(uint256 _tokenId) external returns (bool);

    /** @notice Satisfy an active auction for a SmartPiggies token
        @dev For purposes of this explanation, it is assumed that the contract has associated state
         variables with `_tokenId` which correspond to the auction parameter variables in the
         `startAuction()` function.
        Throws if msg.sender is the owner of `_tokenId`.
        Throws if `_tokenId` is not currently on auction.
        Throws if `_tokenId` is on auction and that auction is currently in the process of being
         satisfied (i.e. no reentry into this function).
        If `_tokenId` is in the "RFP" state, the price to satisfy the auction will be:
         `_startPrice` + (block.number - `getAuctionStart(_tokenId)`) * `_priceStep` / `_timeStep`.
        If `_tokenId` is not in the "RFP" state, the price to satisfy the auction will be:
         `_startPrice` - (block.number - `getAuctionStart(_tokenId))` * `_priceStep` / `_timeStep`.
        If `_tokenId` is in the "RFP" state, throws if the SmartPiggies contract has not been
         delegated an amount of the ERC-20 token governed by the contract at `_collateralERC` by
         `msg.sender` which is >= the `_collateral` value of `_tokenId` (option underwriter must be
         able to put up the full requested collateral amount).
        If `_tokenId` is not in the "RFP" state, throws if the SmartPiggies contract has not been
         delegated an amount of the ERC-20 token governed by the contract at `_premiumERC` by
         `msg.sender` which is >= the price to satisfy the auction (option buyer must be able to pay
         the full premium amout).
        If `_tokenId` is on auction but the current block height exeeds the expiration block height
         for that auction, emits an `AuctionExpired` event and changes the state of the token such
         that it is no longer on auction, then returns `false`.
        If the function does not throw or exit, and `_tokenId` is in the "RFP" state, the SmartPiggies
         contract takes ownership of an amount of the `_collateralERC` token from `msg.sender` == the
         `_collateral` amount of `_tokenId` (i.e. underwriter collateralizes the option), and the
         SmartPiggies contract transfers an amount of the `_premiumERC` token == the price to satisfy
         the auction to `msg.sender` (i.e. the underwriter is paid her premium). If the price to satisfy
         was less than `_reservePrice`, the difference in the `_premiumERC` token is refunded to the
         holder of the option. Once assignment of all ERC-20 tokens is complete, the state of `_tokenId`
         must change such that it is no longer an RFP.
        If the function does not throw or exit, and `_tokenId` is not in the "RFP" state, the SmartPiggies
         contract transfers ownership of an amount of the `_premiumERC` token to the current holder of
         `_tokenId` equal to the price to satisfy the auction, and transfers ownership of `_tokenId` to
         `msg.sender`.
        After successful facilitation of the auction, changes the auction state of `_tokenId` such that
         all parameters related to the auction are zeroed out, and the token is marked as no longer on
         auction.
        @param _tokenId The identifier of the specific SmartPiggies token for which to satisfy the auction.
        @return true on successful auction satisfaction.
     */
     function satisfyAuction(uint256 _tokenId) external returns (bool);

    /** @notice Call the data resolver to fetch a settlement price
        @dev Throws if `_tokenId` is currently on auction.
        Throws if `_tokenId` has already had a settlement price fetched.
        If `_tokenId` is a European option, or if `_tokenId` has already reached the option
         expiry block height, `_dataResolverAtExpiry` must be queried.
        If `_tokenId` is an American option and has not yet reached the expiry block height,
         `_dataResolverNow` must be queried.
        @param _tokenId The identifier of the specific SmartPiggies token for which to fetch
         a settlement price.
        @param _oracleFee The fee to pay the oracle service (if required), which must be delegated to the
         SmartPiggies contract to pay the data resolver interacting with that oracle service's contract.
        @return true on successful submission of price request to the resolver.
   */
    function requestSettlementPrice(uint256 _tokenId, uint256 _oracleFee) external returns (bool);

    /** @notice A callback function for data resolvers to deliver settlement prices
        @dev Throws if `msg.sender` is not the address of the data resolver called by
         `requestSettlementprice`.
        On successful call of this function, the price returned by the resolver should be set in the state
         data of `_tokenId`.
        @param _tokenId The ID of the token for which a settlement price is to be returned.
        @param _price The settlement price for the option specified by `_tokenId`.
     */
    function _callback(uint256 _tokenId, uint256 _price) external;

    /** @notice Calculate the settlement of ownership of option collateral
        @dev Throws if msg.sender is not one of: writer, holder of `_tokenId`.
        Throws if `_tokenId` has not had a settlement price fetched yet.
        If `_tokenId` is a put option (i.e. `_isPut` was true on creation), the payout to the holder (long
         counterparty) is 0 if the settlement price is >= the strike price, otherwise:
         payout = (strike price - exercise price) * `_lotSize`
        If `_tokenId` is a call option, the payout to the holder is 0 if the settlement price is <= the
         strike price, otherwise:
         payout = (exercise price - strike price) * `_lotSize`
        In the case of both put and call options, the payout to the writer (short counterparty) is equal to
         the `_collateral` amount associated with `_tokenId` minus the payout to the long counterparty.
        On successful calculation of these payouts, the balances due to each counterparty (denominated in
         `_collateralERC`) must be accounted for by the SmartPiggies contract for later withdrawal by the
         counterparties. After this accounting is done, the token must be burned.
        @param _tokenId The ID of the SmartPiggies token to be settled.
        @return true on successful settlement of the option.
     */
    function settlePiggy(uint256 _tokenId) external returns (bool);

    /** @notice Claim a payout due as a result of option settlement
        @dev Throws if `_amount` is greater than the balance due to `msg.sender` in the `_paymentToken`
         ERC-20 contract.
        @param _paymentToken The address of the ERC-20 contract to claim a balance from.
        @param _amount The amount of ERC-20 tokens to withdraw.
        @return true on successful withdrawal from `_paymentToken`.
     */
    function claimPayout(address _paymentToken, uint256 _amount) external returns (bool);
}
