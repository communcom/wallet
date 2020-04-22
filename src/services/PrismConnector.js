const core = require('cyberway-core-service');
const BasicConnector = core.services.Connector;

const env = require('../data/env');

const Block = require('../controllers/Block');

class Connector extends BasicConnector {
    constructor({ prism }) {
        super({ port: env.GLS_CONNECTOR_WRITER_PORT });

        this._block = new Block({ prismService: prism });
    }

    async start() {
        await super.start({
            serverRoutes: {
                waitForBlock: {
                    handler: this._block.waitForBlock,
                    scope: this._block,
                    validation: {
                        required: ['blockNum'],
                        properties: {
                            blockNum: {
                                type: 'number',
                                minValue: 0,
                            },
                        },
                    },
                },
                waitForTransaction: {
                    handler: this._block.waitForTransaction,
                    scope: this._block,
                    validation: {
                        required: ['transactionId'],
                        properties: {
                            transactionId: {
                                type: 'string',
                            },
                        },
                    },
                },
            },
        });
    }
}

module.exports = Connector;
