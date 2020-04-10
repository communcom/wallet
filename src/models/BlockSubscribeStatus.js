const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel('BlockSubscribeStatus', {
    blockNum: {
        type: Number,
    },
    blockId: {
        type: String,
    },
    blockTime: {
        type: Date,
    },
    lastIrreversible: {
        type: Number,
        default: 0,
    },
    lastFork: {
        type: Number,
        default: 0,
    },
});
