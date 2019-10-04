const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Point',
    {
        symbol: {
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
        logo:{
            type: String,
        },
        cw: {
            type: String,
        },
        fee: {
            type: String,
        },
    },
    {
        index: [
            // Default
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
