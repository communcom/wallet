const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;

const MainPrismController = require('../controllers/prism/Main');

const BlockSubscribeStatusModel = require('../models/BlockSubscribeStatus');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
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
        const status = {
            blockNum: data.blockNum,
            blockId: data.id,
            blockTime: data.blockTime,
        };

        switch (type) {
            case 'IRREVERSIBLE_BLOCK':
                status.lastIrreversible = data.blockNum;
                await this._mainPrismController.registerLIB(data.blockNum);
                break;

            case 'BLOCK':
                try {
                    await this._mainPrismController.disperse(data);
                } catch (error) {
                    Logger.error('Cant disperse block: ', data.blockNum, error);
                    process.exit(1);
                }
                break;

            case 'FORK':
                status.lastFork = data.baseBlockNum;
                Logger.info('STARTING FORK ON BLOCK', data.baseBlockNum);
                await this._mainPrismController.handleFork(data.baseBlockNum);
        }

        await BlockSubscribeStatusModel.updateOne({}, status, { upsert: true });
    }
}

module.exports = Prism;
