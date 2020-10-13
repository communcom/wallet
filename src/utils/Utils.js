const core = require('cyberway-core-service');

const BigNum = core.types.BigNum;

class Utils {
    static calculateFrozenQuantity(frozenAmount, unfrozenAmount) {
        const result = new BigNum(frozenAmount).minus(new BigNum(unfrozenAmount)).toString();

        if (result < 0) {
            return 0;
        }

        return result;
    }
}

module.exports = Utils;
