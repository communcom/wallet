const assert = require('assert');

const { calculateFrozenQuantity } = require('../src/utils/Utils');

describe('Utils', () => {
    it('calculateFrozenQuantity', () => {
        assert.equal(calculateFrozenQuantity(58.408, 58.408), 0);
        assert.equal(calculateFrozenQuantity(58.408, 58.409), 0);
        assert.equal(calculateFrozenQuantity(58.408, 58.407), 0.001);
    });
});
