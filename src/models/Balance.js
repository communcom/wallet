const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Balance',
    {
        userId: {
            type: String,
            required: true,
        },
        balances: {
            type: [
                {
                    symbol: {
                        type: String,
                        required: true,
                    },
                    balance: {
                        type: String,
                        required: true,
                    },
                    frozen: {
                        type: String,
                    }
                },
            ],
        },
    },
    {
        index: [
            {
                fields: {
                    userId: 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    userId: 1,
                    'balances.symbol': 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
