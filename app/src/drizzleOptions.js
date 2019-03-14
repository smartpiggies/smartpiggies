import SmartPiggies from "./contracts/SmartPiggies.json";
import StableToken from "./contracts/StableToken.json";
import StableTokenFaucet from "./contracts/StableTokenFaucet.json";
import TestnetLINK from "./contracts/TestnetLINK.json";

const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: "ws://127.0.0.1:8545",
    },
  },
  contracts: [SmartPiggies, StableToken, StableTokenFaucet, TestnetLINK],
  events: {
  },
  polls: {
    accounts: 1500,
  },
  syncAlways: true,
};

export default options;
