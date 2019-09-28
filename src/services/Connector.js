const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;
const Wallet = require('../controllers/Wallet');

class Connector extends BasicConnector {
    constructor() {
        super();

        this._wallet = new Wallet({ connector: this });
    }

    async start() {
        await super.start({
            serverRoutes: {
                getBalance: {
                    inherits: ['userSpecific'],
                    handler: this._wallet.getBalance,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            type: {
                                type: 'string',
                                enum: ['all', 'liquid'],
                                default: 'all',
                            },
                        },
                    },
                },
                getTransferHistory: {
                    inherits: ['userSpecific', 'pagination'],
                    handler: this._wallet.getTransferHistory,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                            direction: {
                                type: 'string',
                                enum: ['in', 'out', 'all'],
                                default: 'all',
                            },
                        },
                    },
                },
                getTokensInfo: {
                    inherits: ['pagination'],
                    handler: this._wallet.getTokensInfo,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            currencies: {
                                type: 'array',
                                default: ['all'],
                            },
                        },
                    },
                },
                getClaimHistory: {
                    handler: this._wallet.getClaimHistory,
                    scope: this._wallet,
                    inherits: ['pagination', 'userSpecific'],
                    validation: {
                        properties: {
                            tokens: {
                                type: 'array',
                                default: ['all'],
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },

            serverDefaults: {
                parents: {
                    pagination: {
                        validation: {
                            properties: {
                                sequenceKey: {
                                    type: ['string', 'null'],
                                },
                                limit: {
                                    type: 'number',
                                    default: 10,
                                },
                            },
                        },
                    },
                    userSpecific: {
                        validation: {
                            required: ['userId'],
                            properties: {
                                userId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    userRelativity: {
                        validation: {
                            properties: {
                                currentUserId: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        });

        await super.setDefaultResponse(null);
    }
}

module.exports = Connector;
