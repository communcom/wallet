const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const env = require('../../data/env');
const TransferModel = require('../../models/Transfer');
const Claim = require('../../models/Claim');
const HistoryModel = require('../../models/History');
const DonationModel = require('../../models/Donation');
const PointModel = require('../../models/Point');

const { calculateBuyAmount, calculateSellAmount } = require('../../utils/price');

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

        let balanceEvent, feeEvent, currencyEvent;

        for (const event of action.events) {
            switch (event.event) {
                case 'exchange':
                    balanceEvent = event;
                    break;
                case 'fee':
                    feeEvent = event;
                    break;
                case 'currency':
                    currencyEvent = event;
                    break;
            }
        }

        if (balanceEvent) {
            const { amount: exchangeAmount } = Utils.parseAsset(balanceEvent.args.amount);
            const { amount: feeAmount } = Utils.parseAsset(feeEvent.args.amount);

            meta.exchangeAmount = exchangeAmount;
            meta.actionType = 'convert';
            meta.transferType = 'point';
            meta.feePercent = currencyEvent.args.fee / 100;
            meta.feeAmount = feeAmount;
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

        await this._processDonate({ sender: from, quantity, memo, trxId: trxData.trxId }, meta);

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

    _processReferral({ from, memo }, meta) {
        if (!env.GLS_BOUNTY_ACCOUNT || env.GLS_BOUNTY_ACCOUNT !== from) {
            return;
        }

        const referralRegistrationMatch = memo.match(
            /^referral registration bonus from: [\w\d.-]+ \(([\w0-5]+)\)$/
        );

        if (referralRegistrationMatch) {
            meta.actionType = 'referralRegisterBonus';
            meta.referralInitiator = referralRegistrationMatch[1];
            return;
        }

        const referralPurchaseMatch = memo.match(
            /^referral purchase bonus \((\d+)%\) from: [\w\d.-]+ \(([\w0-5]+)\)$/
        );

        if (referralPurchaseMatch) {
            meta.actionType = 'referralPurchaseBonus';
            meta.referralInitiator = referralPurchaseMatch[2];
            meta.referralData = {
                percent: Number(referralPurchaseMatch[1]),
            };
        }
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

        const meta = {
            actionType: 'transfer',
            transferType: 'token',
        };

        this._processReferral({ from: sender, memo }, meta);

        await this._processDonate({ sender, quantity, memo, trxId: trxData.trxId }, meta);

        await this._createTransfer({
            contractReceiver,
            trxData,
            sender,
            receiver,
            quantity,
            memo,
            meta,
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

        verbose(`Created transfer: ${sender}->${receiver} ${quantity} ${memo}`);
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
        const {
            transferType,
            exchangeAmount,
            feePercent,
            feeAmount,
            referralInitiator,
            referralData,
        } = meta;
        let { actionType } = meta;

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

        if (receiver === 'cyber.null') {
            actionType = 'burn';
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
            feePercent,
            feeAmount,
            referralInitiator,
            referralData,
        });

        verbose('Created history transfer', receiver, actionType);
    }

    async _processDonate({ sender, quantity, memo, trxId }, meta) {
        const donationRegExp = new RegExp(
            /donation for (?<communityId>[A-Z]+):(?<userId>[a-z0-9]+):(?<permlink>[0-9a-z-]+)/g
        );

        const donationMatch = donationRegExp.exec(memo);

        if (!donationMatch) {
            return;
        }

        const { communityId, userId, permlink } = donationMatch.groups;

        const { amount, symbol } = Utils.parseAsset(quantity);

        const donationObj = {
            communityId,
            userId,
            permlink,
            trxId,
            sender,
            quantity: amount,
            symbol,
        };

        let communityPoint;
        if (communityId !== symbol) {
            donationObj.initial = quantity;
            donationObj.symbol = communityId;

            communityPoint = await PointModel.findOne(
                { symbol: communityId },
                {
                    _id: false,
                    reserve: true,
                    supply: true,
                    cw: true,
                    fee: true,
                },
                { lean: true }
            );
        }

        if (symbol === 'CMN') {
            if (communityPoint) {
                donationObj.quantity = calculateBuyAmount(communityPoint, amount);
            }
        } else {
            const sellPoint = await PointModel.findOne(
                { symbol },
                {
                    _id: false,
                    reserve: true,
                    supply: true,
                    cw: true,
                    fee: true,
                },
                { lean: true }
            );

            if (communityPoint && sellPoint) {
                const sellPointsPrice = calculateSellAmount(sellPoint, amount);
                donationObj.quantity = calculateBuyAmount(communityPoint, sellPointsPrice);
            }
        }

        await DonationModel.create(donationObj);

        meta.actionType = 'donation';
    }
}

module.exports = Transfer;
