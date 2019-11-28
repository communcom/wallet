const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const TransferModel = require('../../models/Transfer');
const Claim = require('../../models/Claim');

class Transfer {
    async handleTokenTransfer(action, trxData) {
        const { from, to, quantity, memo } = action.args;

        await this._handleTransfer({
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
            transferType: 'transfer',
            assetType: 'point',
        };

        const [balanceEvent] = action.events.filter(e => e.event === 'exchange');
        if (balanceEvent) {
            const { amount } = Utils.parseAsset(balanceEvent.args.amount);

            meta.exchangeAmount = amount;
            meta.transferType = 'convert';
            meta.assetType = 'point';
        }

        const match = memo.match(/^reward for ([0-9]+)$/);

        if (match) {
            const [_, tracery] = match;

            meta.assetType = 'point';
            meta.transferType = 'reward';
            meta.tracery = tracery;
        }

        await this._createTransfer({
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
                trxData,
                sender,
                receiver,
                quantity,
                memo,
            });
        }
    }

    async _handleTransfer({ trxData, sender, receiver, quantity, memo }) {
        const { symbol } = Utils.parseAsset(quantity);

        if (symbol !== 'CMN') {
            return;
        }

        await this._createTransfer({
            trxData,
            sender,
            receiver,
            quantity,
            memo,
            meta: {
                transferType: 'transfer',
                assetType: 'token',
            },
        });
    }

    async handleBuyPoint(action, trxData) {
        const { from, to, quantity, memo } = action.args;

        const meta = {
            transferType: 'convert',
            assetType: 'token',
        };

        const [balanceEvent] = action.events.filter(e => e.event === 'exchange');
        if (balanceEvent) {
            const { amount } = Utils.parseAsset(balanceEvent.args.amount);
            meta.exchangeAmount = amount;
        }

        await this._createTransfer({
            trxData,
            sender: from,
            receiver: to,
            quantity,
            memo,
            meta,
        });
    }

    async _createTransfer({ trxData, sender, receiver, quantity, memo, meta }) {
        const { amount, symbol } = Utils.parseAsset(quantity);

        const transferObject = {
            ...trxData,
            sender,
            receiver,
            quantity: amount,
            symbol,
            memo,
            meta,
        };

        await TransferModel.create(transferObject);

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
}

module.exports = Transfer;
