const core = require('cyberway-core-service');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const Utils = require('../../utils/Utils');
const TransferModel = require('../../models/Transfer');
const BalanceModel = require('../../models/Balance');
const PointModel = require('../../models/Point');
const UserMeta = require('../../models/UserMeta');
const DelegateVote = require('../../models/DelegateVote');
const Claim = require('../../models/Claim');
const Proposals = require('./Proposals');
const { verbose } = require('../../utils/logs');

const REVERSIBLE_MODELS = [TransferModel, Claim];

class Main {
    constructor() {
        this._proposals = new Proposals();
    }

    async disperse({ transactions, blockTime, blockNum }) {
        for (const transaction of transactions) {
            await this._disperseTransaction({
                ...transaction,
                blockNum,
                blockTime,
            });
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

        for (const model of REVERSIBLE_MODELS) {
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

    async _disperseTransaction(transaction) {
        if (!transaction) {
            Logger.error('Empty transaction! But continue.');
            return;
        }

        const trxData = {
            trxId: transaction.id,
            blockNum: transaction.blockNum,
            timestamp: transaction.blockTime,
        };

        for (const action of transaction.actions) {
            await this._handleEvents({ events: action.events });

            if (action.code === 'cyber.token' && action.receiver === 'cyber.token') {
                switch (action.action) {
                    case 'transfer':
                    case 'payment':
                        await this._handleTransferAction(action, trxData);
                        break;
                    case 'bulkpayment':
                    case 'bulktransfer':
                        await this._handleBulkTransferAction(action, trxData);
                        break;
                    case 'claim':
                        await this._handleClaimAction(action, trxData);
                        break;
                }
            }

            if (action.code === 'cyber.token' && action.receiver === 'comn.point') {
                switch (action.action) {
                    case 'transfer':
                        await this._handleRestockTokens(action);
                        break;
                }
            }

            if (action.action === 'newusername') {
                await this._handleCreateUsernameAction(action, trxData);
            }

            if (
                action.receiver === 'cyber.stake' &&
                action.code === 'cyber.stake' &&
                action.action === 'delegatevote'
            ) {
                await this._handleDelegateVoteAction(action);
            }

            if (
                action.receiver === 'cyber.stake' &&
                action.code === 'cyber.stake' &&
                action.action === 'recallvote'
            ) {
                await this._handleRecallVoteAction(action);
            }

            if (action.receiver === 'comn.point' && action.code === 'comn.point') {
                switch (action.action) {
                    case 'create':
                        await this._handlePointCreateEvent(action);
                        break;
                    case 'issue':
                        await this._handleIssuePoint(action);
                        break;
                    case 'open':
                        await this._handleOpenBalance(action);
                        break;
                    case 'transfer':
                        await this._handlePointTransfer(action, trxData);
                        break;
                }
            }

            if (action.receiver === 'comn.list' && action.code === 'comn.list') {
                switch (action.action) {
                    case 'setinfo':
                        await this._handleSetInfo(action);
                        break;
                }
            }

            await this._proposals.disperseAction(action, transaction);
        }
    }

    async _handleEvents({ events }) {
        for (const event of events) {
            switch (event.code) {
                case 'cyber.token':
                case 'comn.point':
                    await this._handleBalanceEvent(event);
                    // Disabled
                    // await this._handleCurrencyEvent(event);
                    break;
                default:
                    return;
            }
        }
    }

    async _handleBalanceEvent(event) {
        if (!(event.event === 'balance')) {
            return;
        }

        const { account, balance } = event.args;
        const { sym, quantityRaw } = Utils.parseAsset(balance);

        await this._createOrUpdateUserBalance({
            account,
            symbol: sym,
            balance: quantityRaw,
        });
    }

    async _createOrUpdateUserBalance({ account, balance, symbol }) {
        const balanceModel = await BalanceModel.findOne({ account });

        if (balanceModel) {
            const balances = balanceModel.balances.filter(b => b.symbol === symbol);

            if (balances.length > 0) {
                await BalanceModel.updateOne(
                    { account, 'balances.symbol': symbol },
                    { $set: { 'balances.$.balance': balance } }
                );
                verbose('Updated balance:', account, balance, symbol);
            } else {
                await BalanceModel.updateOne(
                    { account },
                    {
                        $push: {
                            balances: {
                                symbol,
                                balance,
                            },
                        },
                    }
                );
                verbose('Added balance:', account, balance, symbol);
            }
        } else {
            const newBalance = {
                account,
                balances: [
                    {
                        symbol,
                        balance,
                    },
                ],
            };

            await BalanceModel.create(newBalance);

            verbose('Created balance:', account, balance, symbol);
        }
    }

    async _handleCurrencyEvent(event) {
        if (!(event.event === 'currency')) {
            return;
        }

        const { sym } = Utils.parseAsset(args.quantity);
        const pointObject = await PointModel.findOne({ symbol: sym });

        if (pointObject) {
            const { supply, reserve, max_supply, cw, fee, issuert } = event.args;
            await PointModel.updateOne(
                { _id: pointObject._id },
                {
                    $set: {
                        supply,
                        reserve,
                        max_supply,
                        cw,
                        fee,
                        issuert,
                    },
                }
            );

            verbose('Updated point', sym);
        }
    }

    async _handleClaimAction(action, trxData) {
        const { owner: userId, quantity } = action.args;

        const { quantityRaw, sym } = Utils.parseAsset(quantity);

        const claim = new Claim({
            userId,
            quantity: quantityRaw,
            sym,
            ...trxData,
        });

        await claim.save();

        verbose('Created claim object: ', claim.toObject());
    }

    async _handleBulkTransferAction(action, trxData) {
        const sender = action.args.from;

        for (const { to: receiver, quantity, memo } of action.args.recipients) {
            await this._handleTransfer({
                trxData,
                sender,
                receiver,
                quantity,
                memo,
            });
        }
    }

    async _handleTransferAction(action, trxData) {
        await this._handleTransfer({
            trxData,
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity,
            memo: action.args.memo,
        });
    }

    async _createTransferEvent({ trxData, sender, receiver, quantity, memo }) {
        const { quantityRaw, sym } = Utils.parseAsset(quantity);
        const transferObject = {
            ...trxData,
            sender,
            receiver,
            quantity: quantityRaw,
            sym,
            memo,
        };

        await TransferModel.create(transferObject);

        verbose('Created transfer object:', transferObject);
    }

    async _handleTransfer({ trxData, sender, receiver, quantity, memo }) {
        return await this._createTransferEvent({ trxData, sender, quantity, receiver, memo });
    }

    async _handleCreateUsernameAction(action) {
        if (!action.args) {
            throw { code: 812, message: 'Invalid action object' };
        }

        const userId = action.args.owner;
        const username = action.args.name;

        const savedUserMeta = await UserMeta.findOne({ userId });

        if (savedUserMeta) {
            await UserMeta.updateOne(
                { _id: savedUserMeta._id },
                { $set: { 'meta.username': username } }
            );
            verbose(
                `Changed meta data of user ${userId}: ${JSON.stringify(
                    { username, userId },
                    null,
                    2
                )}`
            );
        } else {
            await UserMeta.create({ userId, username });
            verbose(
                `Created meta data of user ${userId}: ${JSON.stringify(
                    { username, userId },
                    null,
                    2
                )}`
            );
        }
    }

    async _handleUpdateMetaAction(action) {
        if (!action.args) {
            throw { code: 812, message: 'Invalid action object' };
        }

        const meta = {
            userId: action.args.account,
            name: action.args.meta.name,
        };

        const savedUserMeta = await UserMeta.findOne({ userId: meta.userId });

        if (savedUserMeta) {
            await UserMeta.updateOne({ _id: savedUserMeta._id }, { $set: meta });
            verbose(`Changed meta data of user ${meta.userId}: ${JSON.stringify(meta, null, 2)}`);
        } else {
            const userMeta = new UserMeta(meta);
            await userMeta.save();
            verbose(`Created meta data of user ${meta.userId}: ${JSON.stringify(meta, null, 2)}`);
        }
    }

    async _handlePointCreateEvent(action) {
        const { args } = action;
        const { sym, quantityRaw } = Utils.parseAsset(args.maximum_supply);

        const [_, decs] = quantityRaw.split('.');

        const newPointObject = {
            symbol: sym,
            decs: decs.length, // FIXME bad way
            issuer: args.issuer,
            maximum_supply: args.maximum_supply,
            cw: args.cw,
            fee: args.fee,
        };

        await PointModel.create(newPointObject);

        verbose('Created point', sym, 'info:', newPointObject);
    }

    async _handleRestockTokens(action) {
        const { args } = action;

        const match = args.memo.match(/^restock\: ([A-Z]+)$/);
        if (!match) {
            return;
        }

        const [_, symbol] = match;

        const pointObject = await PointModel.findOne({ symbol });

        if (pointObject) {
            const reserve = Utils.calculateQuantity(pointObject.reserve, args.quantity);
            await PointModel.updateOne(
                { _id: pointObject._id },
                {
                    $set: {
                        reserve,
                    },
                }
            );

            verbose('Updated', symbol, args.memo, reserve);
        }
    }

    async _handleIssuePoint(action) {
        const { args } = action;

        const { sym } = Utils.parseAsset(args.quantity);
        const pointObject = await PointModel.findOne({ symbol: sym });

        if (pointObject) {
            const supply = Utils.calculateQuantity(pointObject.supply, args.quantity);
            await PointModel.updateOne(
                { _id: pointObject._id },
                {
                    $set: {
                        supply,
                    },
                }
            );

            verbose('Updated point', sym, 'supply:', supply);
        }
    }

    async _handleOpenBalance(action) {
        const { args } = action;

        await this._createOrUpdateUserBalance({
            account: args.owner,
            symbol: args.commun_code,
            balance: 0,
        });
    }

    async _handlePointTransfer(action, trxData) {
        await this._handleTransfer({
            trxData,
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity,
            memo: action.args.memo,
        });
    }

    async _handleSetInfo(action) {
        const { args } = action;

        const pointObject = await PointModel.findOne({ symbol: args.commun_code });

        if (pointObject) {
            await PointModel.updateOne(
                { _id: pointObject._id },
                {
                    $set: {
                        logo: args.avatar_image,
                    },
                }
            );

            verbose('Updated point logo', args.commun_code);
        }
    }

    async _handleDelegateVoteAction(action) {
        const { grantor_name: grantor, recipient_name: recipient, quantity } = action.args;

        const { quantity: bigNumQuantity, sym } = Utils.parseAsset(quantity);

        const delegateVoteInfo = {
            grantor,
            recipient,
            sym,
        };

        const savedVote = await DelegateVote.findOne(delegateVoteInfo);

        if (savedVote) {
            const quantityNew = new BigNum(savedVote.quantity).plus(bigNumQuantity);
            const newDelegateVoteInfo = {
                ...delegateVoteInfo,
                quantity: quantityNew,
            };

            await DelegateVote.updateOne(
                { _id: savedVote._id },
                {
                    $set: newDelegateVoteInfo,
                }
            );
            verbose(
                `Changed delegate vote for ${recipient}: ${JSON.stringify(
                    newDelegateVoteInfo,
                    null,
                    2
                )}`
            );
        } else {
            const newDelegateVoteInfo = {
                ...delegateVoteInfo,
                quantity: bigNumQuantity,
            };

            await DelegateVote.create(newDelegateVoteInfo);
            verbose(
                `Created delegate vote for ${recipient}: ${JSON.stringify(
                    newDelegateVoteInfo,
                    null,
                    2
                )}`
            );
        }
    }

    async _handleRecallVoteAction(action) {
        const {
            grantor_name: grantor,
            recipient_name: recipient,
            token_code: sym,
            pct,
        } = action.args;

        const vote = await DelegateVote.findOne({
            grantor,
            recipient,
            sym,
        });

        if (vote) {
            await DelegateVote.updateOne(
                { _id: vote._id },
                { $set: { quantity: vote.quantity.times(1 - pct / 10000) } }
            );
        }
    }
}

module.exports = Main;
