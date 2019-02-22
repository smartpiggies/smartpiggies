# SmartPiggies

<img align="right" width="300" src="app/src/Assets/Logo/piggieface_02.png">

### An open source standard for a free peer-to-peer global derivatives market.

[SmartPiggies](https://smartpiggies.com) are non-fungible digital contracts that provide their owners with protection against undesirable changes in the price of any asset, product, or service. In traditional finance terms, SmartPiggies could be compared to a capped option. For more information on the project and to read the pinkpaper please visit the [website](https://smartpiggies.com).

This repository is a front-end dApp that will connect to the testnet contracts defining a SmartPiggies implementation.

## Getting Started
SmartPiggies takes advantage of stable tokens and oracles, which are currently available technologies on the ethereum test networks, e.g. Ropsten and Rinkeby. Because these technologoes already exist, the demo dApp is expected to be available shortly (if you would like to view it on our dev server email: real smart piggies @ gmail dot com). In the mean time, to build this repo follow the instructions below.

### Prerequisites
In order to interact with the deployed SmartPiggies contracts there are a couple steps that need to be taken.

#### Tokens
SmartPiggies uses stable tokens as collateral. You will need to have some stable tokens to use with the dApp. We deployed our own stable token contract to play with. The dApp has these addresses hardcoded into the components.

#### Approvals
Stable Tokens: In order to create smartpiggies, the creating account (i.e. the writer) has to approve transfer of stable tokens, used as collateral, from their account to the SmartPiggies contract. This is done in the ERC20 Stable Token contract with the `approve` method.

Oracle Fees: This dApp uses [Chainlink](https://chain.link/) as an oracle provider. To use Chainlink on the testnet, LINK tokens are required to pay for oracle fees. A fee of 1 LINK will retrieve a data request from an oracle. The account requesting to clear a smartpiggie by resolving the price of the underlying from the oracle will need to have LINK tokens and approve the transfer of these tokens from their account to the Oracle Resolver contract. The approval process is the same as approving stable tokens, however in this case the approval is from the requesting account to the resolver address.


### Building
To build the dApp clone this respository:
```
git clone https://github.com/smartpiggies/smartpiggies.git
```

Navigate to the app folder:

```
cd smartpiggies/app/
```

Install the node_modules from the app folder:

```
yarn install
```

Run the server:

```
npm run start
```

This will deploy the react server and host the dApp at localhost:3000
Use a web browser to access the dApp by typing in  `localhost:3000` into the address bar.

#### Risks:
This work is experimantal and a work-in-progress. Use at your own risk, and review all risk sections in the [pinkpaper](https://docs.wixstatic.com/ugd/ecf251_d6f41d70720b4ee994a2e782b377af41.pdf).
