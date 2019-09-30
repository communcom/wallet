const core = require('gls-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Point',
    {
        sym: {
            type: String,
            required: true,
        },
        decs: {
            type: Number,
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
        maximum_supply: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            // Default
            {
                fields: {
                    sym: 1,
                },
                options: {
                    unique: true,
                    background: true,
                },
            },
        ],
    }
);
