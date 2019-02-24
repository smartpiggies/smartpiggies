const sequentialPromise = require("./sequentialPromise.js");

/**
 * @param {!string} richAccount, an address.
 * @param {!Array.<!string>} recipients, an array of addresses.
 * @param {Number | string | BigNumber} wei, represents a number.
 * @returns {!Promise.<!Array.<!string>>} transaction hashes.
 */
module.exports = function makeSureHasAtLeast(richAccount, recipients, wei) {
    const self = this;
    return sequentialPromise(
        recipients.map(
            recipient =>
                () => self.getBalancePromise(recipient)
                    .then(balance => {
                        if (balance.lessThan(wei)) {
                            return self.sendTransactionPromise({
                                from: richAccount,
                                to: recipient,
                                value: wei
                            });
                        }
                    }),
            []))
        .reduce( // Remove non transactions
        (reduced, txHash) => {
            if (typeof txHash === "string") {
                reduced.push(txHash);
            }
            return reduced;
        },
        []);
}; 