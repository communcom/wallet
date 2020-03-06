const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'History',
    {
        symbol: {
            type: String,
            required: true,
        },
        sender: {
            type: String,
        },
        receiver: {
            type: String,
        },
        quantity: {
            type: String,
        },
        memo: {
            type: String,
            default: undefined,
        },
        trxId: {
            type: String,
            default: null,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        exchangeAmount: {
            type: Number,
            default: undefined,
        },
        tracery: {
            type: String,
            default: undefined,
        },
        frozen: {
            type: Number,
            default: undefined,
        },
        unfrozen: {
            type: Number,
            default: undefined,
        },
        feePercent: {
            type: Number,
            default: undefined,
        },
        feeAmount: {
            type: Number,
            default: undefined,
        },
        actionType: {
            type: String,
            enum: ['transfer', 'convert', 'reward', 'hold', 'claim', 'unhold', 'burn'],
        },
        transferType: {
            type: String,
            enum: ['point', 'token'],
        },
        rewardType: {
            type: String,
            enum: ['post', 'comment'],
        },
        holdType: {
            type: String,
            enum: ['like', 'dislike'],
        },
    },
    {
        index: [
            {
                fields: {
                    sender: 1,
                    receiver: 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    symbol: 1,
                    sender: 1,
                    receiver: 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    symbol: 1,
                    sender: 1,
                    receiver: 1,
                    memo: 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    symbol: 1,
                    sender: 1,
                    receiver: 1,
                    actionType: 1,
                    transferType: 1,
                    rewardType: 1,
                    holdType: 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    symbol: 1,
                    sender: 1,
                    receiver: 1,
                    tracery: 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
