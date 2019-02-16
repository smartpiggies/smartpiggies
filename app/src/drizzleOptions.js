import SmartPiggies from "./contracts/SmartPiggies.json";
import TableToken from "./contracts/TableToken.json";
import StableLINK from "./contracts/StableLINK.json";

const options = {
  web3: {
    block: false,
    fallback: {
      type: "ws",
      url: "ws://127.0.0.1:8545",
    },
  },
  contracts: [SmartPiggies, TableToken, StableLINK],
  events: {
  },
  polls: {
    accounts: 1500,
  },
};

export default options;
