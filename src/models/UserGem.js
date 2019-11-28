const core = require('cyberway-core-service');
const MongoDB = core.services.MongoDB;

module.exports = MongoDB.makeModel(
    'usergem',
    {
        userId: {
            type: String,
            required: true,
        },
        gemstates: {
            type: [
                {
                    tracery: {
                        type: String,
                        required: true,
                    },
                    owner: {
                        type: String,
                        required: true,
                    },
                    creator: {
                        type: String,
                        required: true,
                    },
                    points: {
                        type: String,
                        required: true,
                    },
                    pledge_points: {
                        type: String,
                        required: true,
                    },
                    damn: {
                        type: Boolean,
                        required: true,
                    },
                    shares: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
        gemchops: {
            type: [
                {
                    tracery: {
                        type: String,
                        required: true,
                    },
                    owner: {
                        type: String,
                        required: true,
                    },
                    creator: {
                        type: String,
                        required: true,
                    },
                    reward: {
                        type: String,
                        required: true,
                    },
                    unfrozen: {
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
                    background: true,
                    unique: true,
                },
            },
            {
                fields: {
                    'gemstates.tracery': 1,
                },
                options: {
                    background: true,
                },
            },
            {
                fields: {
                    'gemchops.tracery': 1,
                },
                options: {
                    background: true,
                },
            },
        ],
    }
);
