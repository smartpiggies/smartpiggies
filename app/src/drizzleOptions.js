import SmartPiggies from "./contracts/SmartPiggies.json";
import TableToken from "./contracts/TableToken.json";
import StableLink from "./contracts/StableLink.json";

const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: "ws://127.0.0.1:8545",
    },
  },
  contracts: [SmartPiggies, TableToken, StableLink],
  events: {
  },
  polls: {
    accounts: 1500,
  },
};

export default options;
