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
                    validation: {},
                },
                getTransferHistory: {
                    inherits: ['userSpecific', 'pagination'],
                    handler: this._wallet.getTransferHistory,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            direction: {
                                type: 'string',
                                enum: ['in', 'out', 'all'],
                                default: 'all',
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
                getSellPrice: {
                    handler: this._wallet.getSellPrice,
                    scope: this._wallet,
                    validation: {
                        required: ['quantity'],
                        properties: {
                            quantity: {
                                type: 'string',
                            },
                        },
                    },
                },
                getBuyPrice: {
                    handler: this._wallet.getBuyPrice,
                    scope: this._wallet,
                    validation: {
                        required: ['pointSymbol', 'quantity'],
                        properties: {
                            pointSymbol: {
                                type: 'string',
                            },
                            quantity: {
                                type: 'string',
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
                                offset: {
                                    type: 'number',
                                    default: 0,
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
    }
}

module.exports = Connector;
