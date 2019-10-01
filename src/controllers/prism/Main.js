const core = require('gls-core-service');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const Utils = require('../../utils/Utils');
const TransferModel = require('../../models/Transfer');
const BalanceModel = require('../../models/Balance');
const TokenModel = require('../../models/Token');
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
                        // TODO
                        break;
                    case 'transfer':
                        await this._handlePointTransfer(action, trxData);
                        break;
                }
            }

            await this._proposals.disperseAction(action, transaction);
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

    async _handleEvents({ events }) {
        for (const event of events) {
            await this._handleBalanceEvent(event);
            await this._handleCurrencyEvent(event);
        }
    }

    async _createOrUpdateUserBalance({ name, balance, payments }) {
        // todo: refactor this!
        const balanceModel = await BalanceModel.findOne({ name }, {}, { lean: true });
        const { sym } = Utils.parseAsset(balance);
        if (balanceModel) {
            // Check balance of tokens listed in balance.balances array
            const neededSym = sym;
            let neededTokenBalanceId = null;
            let neededTokenPaymentsId = null;

            for (let i = 0; i < balanceModel.balances.length; i++) {
                const { sym: tokenSym } = await Utils.parseAsset(balanceModel.balances[i]);
                if (tokenSym === neededSym) {
                    neededTokenBalanceId = i;
                }
            }

            for (let i = 0; i < balanceModel.payments.length; i++) {
                const { sym: tokenSym } = await Utils.parseAsset(balanceModel.payments[i]);
                if (tokenSym === neededSym) {
                    neededTokenPaymentsId = i;
                }
            }

            // Modify if such token is present and create new one otherwise
            if (neededTokenBalanceId !== null) {
                balanceModel.balances[neededTokenBalanceId] = balance;
            } else {
                balanceModel.balances.push(balance);
            }

            if (neededTokenPaymentsId !== null) {
                balanceModel.payments[neededTokenPaymentsId] = payments;
            } else {
                balanceModel.payments.push(payments);
            }

            await BalanceModel.updateOne({ _id: balanceModel._id }, balanceModel);

            verbose('Updated balance object of user', name, ':', {
                balance,
                payments,
            });
        } else {
            const newBalance = new BalanceModel({
                name,
                balances: [balance],
            });

            await newBalance.save();

            verbose('Created balance object of user', name, ':', {
                balance,
                payments,
            });
        }
    }

    async _handleBalanceEvent(event) {
        // Ensure given event is balance event
        if (!(event.code === 'cyber.token' && event.event === 'balance')) {
            return;
        }

        await this._createOrUpdateUserBalance({
            name: event.args.account,
            balance: event.args.balance,
            payments: event.args.payments,
        });
    }

    async _handleCurrencyEvent(event) {
        // Ensure given event is currency event
        if (!(event.code === 'cyber.token' && event.event === 'currency')) {
            return;
        }
        const { sym } = await Utils.parseAsset(event.args.supply);
        const tokenObject = await TokenModel.findOne({ sym });

        const newTokenInfo = {
            sym,
            issuer: event.args.issuer,
            supply: event.args.supply,
            max_supply: event.args.max_supply,
        };

        if (tokenObject) {
            await TokenModel.updateOne({ _id: tokenObject._id }, { $set: newTokenInfo });

            verbose('Updated', sym, 'token info:', newTokenInfo);
        } else {
            const newToken = new TokenModel(newTokenInfo);

            await newToken.save();

            verbose('Created', sym, 'token info:', newTokenInfo);
        }
    }

    async _handlePointCreateEvent(action) {
        const { args } = action;
        const { sym, quantityRaw } = Utils.parseAsset(args.maximum_supply);

        const [_, decs] = quantityRaw.split('.');

        const newPointObject = {
            sym,
            decs: decs.length, // FIXME bad way
            issuer: args.issuer,
            maximum_supply: args.maximum_supply,
        };

        await PointModel.create(newPointObject);

        verbose('Created point', sym, 'info:', newPointObject);
    }

    async _handleRestockTokens(action) {
        const { args } = action;
        const [memo, symbol] = args.memo.match(/^restock\: ([A-Z]+)$/);
        if (!memo) {
            return;
        }

        const pointObject = await PointModel.findOne({ sym: symbol });

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
        const pointObject = await PointModel.findOne({ sym });

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

    async _handlePointTransfer(action, trxData) {
        await this._handleTransfer({
            trxData,
            sender: action.args.from,
            receiver: action.args.to,
            quantity: action.args.quantity,
            memo: action.args.memo,
        });
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
