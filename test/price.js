const assert = require('assert');

const { calculateBuyAmount, calculateSellAmount } = require('../src/utils/price');

describe('price', () => {
    it('calculate buy amount', () => {
        const point = {
            fee: 100,
            cw: 10000,
            supply: '1004587.194 CATS',
            reserve: '1001029.0374 COMMUN',
        };

        const result = calculateBuyAmount(point, '2.000 COMMUN');

        assert.equal(result, 2.007);
    });

    it('calculate sell amount', () => {
        const point = {
            fee: 100,
            cw: 10000,
            supply: '1004587.201 CATS',
            reserve: '1001029.0645 COMMUN',
        };

        const result = calculateSellAmount(point, '2.000 CATS');

        assert.equal(result, 1.9729);
    });

    it('calculate sell amount => amount gt supply', () => {
        const point = {
            fee: 100,
            cw: 10000,
            supply: '1004587.201 CATS',
            reserve: '1001029.0645 COMMUN',
        };

        try {
            calculateSellAmount(point, '10046666.000 CATS');
            assert(false, 'should not be reached');
        } catch (err) {
            assert.equal(err.message, "can't convert more than supply");
        }
    });

    it('calculate sell amount -> throws if amount = 0', () => {
        const point = {
            fee: 100,
            cw: 10000,
            supply: '1004587.201 CATS',
            reserve: '1001029.0645 COMMUN',
        };

        try {
            calculateSellAmount(point, -1);
            assert(false, 'should not be reached');
        } catch (err) {
            assert.equal(err.message, "can't convert negative quantity");
        }
    });
});
