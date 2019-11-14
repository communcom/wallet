const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Point',
    {
        symbol: {
            type: String,
            required: true,
        },
        supply: {
            type: String,
        },
        reserve: {
            type: String,
        },
        issuer: {
            type: String,
            required: true,
        },
        maximumSupply: {
            type: String,
            required: true,
        },
        logo: {
            type: String,
        },
        cw: {
            type: Number,
        },
        fee: {
            type: Number,
        },
        transferFee: {
            type: Number,
        },
        minTransferFeePoints: {
            type: Number,
        },
        issueHistory: {
            type: [
                {
                    quantity: {
                        type: String,
                        required: true,
                    },
                    memo: {
                        type: String,
                    },
                    timestamp: {
                        type: Date,
                        required: true,
                    },
                },
            ],
        },
        restockHistory: {
            type: [
                {
                    quantity: {
                        type: String,
                        required: true,
                    },
                    timestamp: {
                        type: Date,
                        required: true,
                    },
                },
            ],
        }
    },
    {
        index: [
            {
                fields: {
                    symbol: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
