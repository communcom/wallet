const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'Donation',
    {
        communityId: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        permlink: {
            type: String,
            required: true,
        },
        sender: {
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
        trxId: {
            type: String,
            required: true,
        },
    },
    {
        index: [
            {
                fields: {
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                    'contentId.communityId': 1,
                },
            },
            {
                fields: {
                    'contentId.userId': 1,
                    'contentId.permlink': 1,
                },
            },
        ],
    }
);
