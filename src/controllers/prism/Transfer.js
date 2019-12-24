const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const TransferModel = require('../../models/Transfer');
const Claim = require('../../models/Claim');
const HistoryModel = require('../../models/History');

class Transfer {
    async handleTokenTransfer(action, trxData) {
        const { from, to, quantity, memo } = action.args;

        await this._handleTransfer({
            contractReceiver: action.receiver,
            trxData,
            sender: from,
            receiver: to,
            quantity,
            memo,
        });
    }

    async handlePointTransfer(action, trxData) {
        const { from, to, quantity, memo } = action.args;

        const meta = {
            actionType: 'transfer',
            transferType: 'point',
        };

        const [balanceEvent] = action.events.filter(e => e.event === 'exchange');
        if (balanceEvent) {
            const { amount } = Utils.parseAsset(balanceEvent.args.amount);

            meta.exchangeAmount = amount;
            meta.actionType = 'convert';
            meta.transferType = 'point';
        }

        const rewardMatch = memo.match(/^reward for ([0-9]+)$/);

        if (rewardMatch) {
            const [_, tracery] = rewardMatch;

            meta.actionType = 'reward';
            meta.rewardType = 'post';
            meta.tracery = tracery;

            delete meta.transferType;
        }

        const claimMatch = memo.match(/^claimed points/);

        if (claimMatch) {
            meta.actionType = 'claim';
            
            delete meta.transferType;
        }

        await this._createTransfer({
            contractReceiver: action.receiver,
            trxData,
            sender: from,
            receiver: to,
            quantity,
            memo,
            meta,
        });
    }

    async handleBulkTransfer(action, trxData) {
        const sender = action.args.from;

        for (const { to: receiver, quantity, memo } of action.args.recipients) {
            await this._handleTransfer({
                contractReceiver: action.receiver,
                trxData,
                sender,
                receiver,
                quantity,
                memo,
            });
        }
    }

    async _handleTransfer({ contractReceiver, trxData, sender, receiver, quantity, memo }) {
        const { symbol } = Utils.parseAsset(quantity);

        if (symbol !== 'CMN') {
            return;
        }

        await this._createTransfer({
            contractReceiver,
            trxData,
            sender,
            receiver,
            quantity,
            memo,
            meta: {
                actionType: 'transfer',
                transferType: 'token',
            },
        });
    }

    async handleBuyPoint(action, trxData) {
        const { from, to, quantity, memo } = action.args;

        const meta = {
            actionType: 'convert',
            transferType: 'token',
        };

        const [balanceEvent] = action.events.filter(e => e.event === 'exchange');
        if (balanceEvent) {
            const { amount } = Utils.parseAsset(balanceEvent.args.amount);
            meta.exchangeAmount = amount;
        }

        await this._createTransfer({
            contractReceiver: action.receiver,
            trxData,
            sender: from,
            receiver: to,
            quantity,
            memo,
            meta,
        });
    }

    async _createTransfer({ contractReceiver, trxData, sender, receiver, quantity, memo, meta }) {
        const { amount, symbol } = Utils.parseAsset(quantity);

        const transferObject = {
            contractReceiver,
            ...trxData,
            sender,
            receiver,
            quantity: amount,
            symbol,
            memo,
        };

        await TransferModel.create(transferObject);
        await this.handleTransferHistory(transferObject, meta);

        verbose('Created transfer object:', transferObject);
    }

    async handleClaim(action, trxData) {
        const { owner: userId, quantity } = action.args;

        const { amount, symbol } = Utils.parseAsset(quantity);

        const claim = new Claim({
            userId,
            quantity: amount,
            symbol,
            ...trxData,
        });

        await claim.save();

        verbose('Created claim object: ', claim.toObject());
    }

    async handleTransferHistory(transferObject, meta) {
        const {
            trxId,
            timestamp,
            sender,
            receiver,
            quantity,
            symbol,
            memo,
            tracery,
        } = transferObject;
        const { actionType, transferType, exchangeAmount } = meta;

        if (
            actionType === 'transfer' &&
            (transferType === 'token' || transferType === 'point') &&
            (receiver === 'c.point' || sender === 'c.point')
        ) {
            return;
        }

        if (actionType === 'convert' && transferType === 'token' && sender === 'c.point') {
            return;
        }

        await HistoryModel.create({
            trxId,
            timestamp,
            sender,
            receiver,
            quantity,
            symbol,
            memo,
            actionType,
            transferType,
            exchangeAmount,
            tracery,
        });

        verbose('Created history transfer');
    }
}

module.exports = Transfer;
