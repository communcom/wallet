const core = require('cyberway-core-service');
const BigNum = core.types.BigNum;

const CYBERWAY_100_PERCENT = 10000;

function getCW(cw) {
    return cw / CYBERWAY_100_PERCENT;
}

// calc_bancor_amount
function calculateBuyAmount(point, amount, strict = true) {
    amount = parseFloat(amount);
    const reserve = parseFloat(point.reserve);
    const supply = parseFloat(point.supply);

    if (!strict && !reserve) {
        return amount;
    }

    const buyProp = amount / reserve;
    const newSupply = supply * Math.pow(1.0 + buyProp, getCW(point.cw));

    return new BigNum(newSupply - supply).toFixed(3);
}

// calc_reserve_quantity
function calculateSellAmount(point, amount, applyFee = true) {
    amount = parseFloat(amount);
    const { cw, fee } = point;
    const reserve = parseFloat(point.reserve);
    const supply = parseFloat(point.supply);

    if (amount < 0) {
        throw new Error("can't convert negative quantity");
    }

    if (amount >= supply) {
        throw new Error("can't convert more than supply");
    }

    if (amount == 0) {
        return 0;
    }

    let ret = 0;
    if (amount == supply) {
        ret = reserve;
    } else if (cw === CYBERWAY_100_PERCENT) {
        ret = (amount * reserve) / supply;
    } else {
        const sellProp = amount / supply;
        ret = reserve * (1.0 - Math.pow(1.0 - sellProp, 1.0 / getCW(cw)));
    }

    if (applyFee && fee) {
        ret = (ret * (CYBERWAY_100_PERCENT - fee)) / CYBERWAY_100_PERCENT;
    }

    return new BigNum(ret).toFixed(4, BigNum.ROUND_DOWN);
}

module.exports = {
    calculateBuyAmount,
    calculateSellAmount,
};
