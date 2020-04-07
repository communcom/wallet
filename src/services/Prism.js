const core = require('cyberway-core-service');
const BasicService = core.services.Basic;
const BlockSubscribe = core.services.BlockSubscribe;
const Logger = core.utils.Logger;

const env = require('../data/env');

const MainPrismController = require('../controllers/prism/Main');

const BlockSubscribeStatusModel = require('../models/BlockSubscribeStatus');

class Prism extends BasicService {
    constructor() {
        super();

        this._mainPrismController = new MainPrismController();
    }

    async start() {
        this._recentTransactions = new Set();
        this._currentBlockNum = 0;

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

    getCurrentBlockNum() {
        return this._currentBlockNum;
    }

    hasRecentTransaction(id) {
        return this._recentTransactions.has(id);
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

        this._emitHandled(data);

        await BlockSubscribeStatusModel.updateOne({}, status, { upsert: true });
    }

    _emitHandled(block) {
        const blockNum = block.blockNum;

        this._currentBlockNum = blockNum;

        this.emit('blockDone', blockNum);

        for (const transaction of block.transactions) {
            if (!transaction || !transaction.actions) {
                Logger.warn(`Empty transaction - ${blockNum}`);
                return;
            }

            const id = transaction.id;

            this.emit('transactionDone', id);

            this._recentTransactions.add(id);

            setTimeout(
                // Clean lexical scope for memory optimization
                (id => () => this._recentTransactions.delete(id))(id),
                env.GLS_RECENT_TRANSACTION_ID_TTL
            );
        }
    }
}

module.exports = Prism;
