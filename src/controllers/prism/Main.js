const core = require('cyberway-core-service');
const { Logger } = core.utils;

const TransferModel = require('../../models/Transfer');

const Balance = require('./Balance');
const Currency = require('./Currency');
const Gem = require('./Gem');
const Point = require('./Point');
const Transfer = require('./Transfer');
const UserMeta = require('./UserMeta');

const REVERSIBLE_MODELS = [TransferModel];

class Main {
    constructor() {
        this._balance = new Balance();
        this._currency = new Currency();
        this._gem = new Gem();
        this._point = new Point();
        this._transfer = new Transfer();
        this._userMeta = new UserMeta();
    }
    async disperse({ id, blockNum, blockTime, transactions }) {
        for (const transaction of transactions) {
            if (!transaction || !transaction.actions) {
                Logger.error('Empty transaction! But continue.', blockNum);
                return;
            }

            const trxData = {
                trxId: id,
                blockNum,
                timestamp: blockTime,
            };

            for (const action of transaction.actions) {
                await this._disperseAction(action, trxData);
            }
        }
    }

    async registerLIB(blockNum) {
        const markAsIrreversibleOperations = [];
        for (const model of REVERSIBLE_MODELS) {
            markAsIrreversibleOperations.push(
                model.updateMany({ blockNum }, { $set: { isIrreversible: true } }).catch(error => {
                    Logger.error(
                        `Error during setting block ${blockNum} in model ${model.modelName} as irreversible`,
                        error
                    );
                })
            );
        }

        return Promise.all(markAsIrreversibleOperations);
    }

    async handleFork(baseBlockNum) {
        const irrelevantDataDeleteOperations = [];

        // FIXME
        for (const model of [] /* REVERSIBLE_MODELS */) {
            irrelevantDataDeleteOperations.push(
                model.deleteMany({ blockNum: { $gt: baseBlockNum } }).catch(error => {
                    Logger.error(
                        `Error during reversion to base block ${baseBlockNum} during fork`,
                        error
                    );
                    process.exit(1);
                })
            );
        }

        return Promise.all(irrelevantDataDeleteOperations);
    }

    async _disperseAction(action, trxData) {
        if (action.code === 'cyber.token' && action.receiver === 'cyber.token') {
            switch (action.action) {
                case 'transfer':
                case 'payment':
                    await this._transfer.handleTokenTransfer(action, trxData);
                    break;
                case 'bulkpayment':
                case 'bulktransfer':
                    await this._transfer.handleBulkTransfer(action, trxData);
                    break;
                case 'claim':
                    // disabled
                    // await this._transfer.handleClaim(action, trxData);
                    break;
                case 'open':
                    await this._balance.handleOpenCommunBalance(action);
                    break;
            }
        }

        if (action.code === 'cyber.token' && action.receiver === 'c.point') {
            switch (action.action) {
                case 'transfer':
                    await this._point.handleRestock(action, trxData);
                    await this._transfer.handleBuyPoint(action, trxData);
                    break;
            }
        }

        if (action.receiver === 'c.point' && action.code === 'c.point') {
            switch (action.action) {
                case 'create':
                    await this._point.handlePointCreateEvent(action);
                    break;
                case 'issue':
                    await this._point.handleIssuePoint(action, trxData);
                    break;
                case 'open':
                    await this._balance.handleOpenBalance(action);
                    break;
                case 'transfer':
                    await this._transfer.handlePointTransfer(action, trxData);
                    break;
                case 'setparams':
                    await this._point.handlePointSetParams(action);
                    break;
            }
        }

        if (action.action === 'newusername') {
            await this._userMeta.handleCreateUsernameAction(action);
        }

        if (action.receiver === 'c.social' && action.code === 'c.social') {
            switch (action.action) {
                case 'updatemeta':
                    await this._userMeta.handleUpdateMetaAction(action);
                    break;
            }
        }

        if (action.receiver === 'c.list' && action.code === 'c.list') {
            switch (action.action) {
                case 'create':
                    await this._point.handleCreateCommunity(action);
                    break;
                case 'setinfo':
                    await this._point.handleCommunitySetInfo(action);
                    break;
            }
        }

        for (const event of action.events) {
            switch (event.code) {
                case 'cyber.token':
                case 'c.point':
                    await this._balance.handleBalanceEvent(event);
                    await this._currency.handleCurrencyEvent(event);
                    break;
                case 'c.gallery':
                    await this._gem.handleUserGemState(event, trxData);
                    await this._gem.handleUserGemChop(event, trxData);
                    await this._balance.handleInclstateEvent(event);
                    // handle unfrozen points
                    await this._balance.handleGemChopEvent(event);
                    break;
                default:
                    return;
            }
        }
    }
}

module.exports = Main;
