import SmartPiggies from "./contracts/SmartPiggies.json";
import StableToken from "./contracts/StableToken.json";
import RopstenLINK from "./contracts/RopstenLINK.json";

const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: "ws://127.0.0.1:8545",
    },
  },
  contracts: [SmartPiggies, StableToken, RopstenLINK],
  events: {
  },
  polls: {
    accounts: 1500,
  },
};

export default options;
