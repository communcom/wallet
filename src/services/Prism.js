const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const { Logger } = core.utils;
const env = require('../data/env');
const MainPrismController = require('../controllers/prism/Main');
const ServiceMetaModel = require('../models/ServiceMeta');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
        const info = await this._getMeta();

        const subscriber = new BlockSubscribe({
            handler: this._handleBlock.bind(this),
        });

        try {
            await subscriber.start();
        } catch (error) {
            Logger.error('Cant start block subscriber:', error);
            process.exit(1);
        }
    }

    async _handleBlock({ type, data }) {
        switch (type) {
            case 'IRREVERSIBLE_BLOCK':
                await this._mainPrismController.registerLIB(data.blockNum);
                break;
            case 'BLOCK':
                try {
                    await this._mainPrismController.disperse(data);
                } catch (error) {
                    Logger.error('Cant disperse block:', error);
                    process.exit(1);
                }
                break;

            case 'FORK':
                Logger.info('STARTING FORK ON BLOCK', data.baseBlockNum);
                await this._mainPrismController.handleFork(data.baseBlockNum);
        }
    }

    async _getMeta() {
        return await ServiceMetaModel.findOne({}, {}, { lean: true });
    }

    async _updateMeta(params) {
        await ServiceMetaModel.updateOne({}, { $set: params });
    }
}

module.exports = Prism;
