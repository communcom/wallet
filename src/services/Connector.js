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
                        required: ['direction', 'symbol', 'transferType'],
                        properties: {
                            direction: {
                                type: 'string',
                                enum: ['all', 'send', 'receive'],
                                default: 'all',
                            },
                            symbol: {
                                type: 'string',
                                default: 'all',
                            },
                            transferType: {
                                type: 'string',
                                enum: ['all', 'transfer', 'convert', 'none'],
                                default: 'all',
                            },
                            rewards: {
                                type: 'string',
                                enum: ['all', 'none'],
                                default: 'all',
                            },
                            holdType: {
                                type: 'string',
                                enum: ['all', 'like', 'dislike', 'none'],
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
                getPointInfo: {
                    handler: this._wallet.getPointInfo,
                    scope: this._wallet,
                    validation: {
                        required: ['symbol'],
                        properties: {
                            symbol: {
                                type: 'string',
                            },
                        },
                    },
                },
                getTransfer: {
                    handler: this._wallet.getTransfer,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            blockNum: {
                                type: 'number',
                            },
                            trxId: {
                                type: 'string',
                            },
                        },
                    },
                },
                getBlockSubscribeStatus: {
                    handler: this._wallet.getBlockSubscribeStatus,
                    scope: this._wallet,
                },
                getVersion: {
                    handler: this._wallet.getVersion,
                    scope: this._wallet,
                },
                getDonations: {
                    handler: this._wallet.getDonations,
                    scope: this._wallet,
                    validation: {
                        required: ['userId', 'permlink'],
                        properties: {
                            userId: {
                                type: 'string',
                            },
                            permlink: {
                                type: 'string',
                            },
                        },
                    },
                },
                getDonationsBulk: {
                    handler: this._wallet.getDonationsBulk,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            posts: {
                                maxItems: 20,
                                items: {
                                    required: ['userId', 'permlink'],
                                    properties: {
                                        userId: {
                                            type: 'string',
                                        },
                                        permlink: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                getPointsPrices: {
                    handler: this._wallet.getPointsPrices,
                    scope: this._wallet,
                    validation: {
                        properties: {
                            symbols: {
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
