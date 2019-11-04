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
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
