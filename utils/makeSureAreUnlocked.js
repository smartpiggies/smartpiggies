const sequentialPromise = require("./sequentialPromise.js");

/**
 * @param {!Array.<string>} accounts, an array of addresses.
 * @returns {!Promise.<!Array.<!string>>}
 */
module.exports = function makeSureAreUnlocked(accounts) {
    const self = this;
    return sequentialPromise(accounts.map(
        (account, index) => {
            return () => self.signPromise(
                account,
                "0x0000000000000000000000000000000000000000000000000000000000000000")
                .catch(error => {
                    if (error.message == "account is locked") {
                        throw Error("account " + account + " at index " + index + " is locked");
                    } else {
                        throw error;
                    }
                });
        }));
};