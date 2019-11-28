const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Transfer',
    {
        sender: {
            type: String,
            required: true,
        },
        receiver: {
            type: String,
            required: true,
        },
        quantity: {
            type: String,
            required: true,
        },
        symbol: {
            type: String,
            required: true,
        },
        memo: {
            type: String,
        },
        blockNum: {
            type: Number,
            required: true,
        },
        trxId: {
            type: String,
            default: null,
        },
        isIrreversible: {
            type: Boolean,
            default: false,
        },
        timestamp: {
            type: Date,
            required: true,
        },
        meta: {
            transferType: {
                type: String,
                enum: ['transfer', 'convert', 'reward'],
            },
            assetType: {
                type: String,
                enum: ['token', 'point'],
            },
            exchangeAmount: {
                type: Number,
                default: undefined,
            },
            tracery: {
                type: String,
                default: undefined,
            },
        },
    },
    {
        index: [
            {
                fields: {
                    sender: 1,
                    receiver: 1,
                    symbol: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    receiver: 1,
                    symbol: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    sender: 1,
                    symbol: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    symbol: 1,
                    _id: -1,
                },
                options: {
                    background: true,
                },
            },
            // for irreversible search
            {
                fields: {
                    blockNum: 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
