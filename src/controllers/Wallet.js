const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const Utils = require('../utils/Utils');

const TransferModel = require('../models/Transfer');
const TokenModel = require('../models/Token');
const Claim = require('../models/Claim');

class Wallet extends BasicController {
    constructor({ ...params }) {
        super(params);
    }

    async getClaimHistory({ userId, tokens, limit, sequenceKey }) {
        const filter = { userId };

        if (!tokens.includes('all')) {
            filter.$or = tokens.map(sym => ({ sym }));
        }

        if (sequenceKey) {
            filter._id = { $gt: sequenceKey };
        }

        const claims = await Claim.find(
            filter,
            {
                _id: false,
                __v: false,
                createdAt: false,
                updatedAt: false,
            },
            { lean: true }
        )
            .sort({ _id: -1 })
            .limit(limit);

        let newSequenceKey = null;
        if (claims.length === limit) {
            newSequenceKey = claims[claims.length - 1]._id;
        }

        return {
            claims,
            newSequenceKey,
        };
    }

    async getTokensInfo({ currencies, limit, sequenceKey }) {
        const filter = {};

        if (!currencies.includes('all')) {
            filter.$or = currencies.map(currency => ({
                sym: currency,
            }));
        }

        if (sequenceKey) {
            filter._id = {
                $gt: sequenceKey,
            };
        }

        const tokensList = await TokenModel.find(filter, {}, { lean: true }).limit(limit);

        let newSequenceKey;

        if (tokensList.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = tokensList[tokensList.length - 1]._id;
        }

        return {
            tokens: tokensList.map(tokenObject => ({
                id: tokenObject._id,
                sym: tokenObject.sym,
                issuer: tokenObject.issuer,
                supply: tokenObject.supply,
                maxSupply: tokenObject.max_supply,
            })),
            newSequenceKey,
        };
    }

    async getTransferHistory({ userId, direction, currencies, sequenceKey, limit }) {
        const directionFilter = [];
        const currenciesFilter = [];

        if (direction !== 'in') {
            directionFilter.push({ sender: userId });
        }

        if (direction !== 'out') {
            directionFilter.push({ receiver: userId });
        }

        if (!currencies.includes('all')) {
            for (const sym of currencies) {
                currenciesFilter.push({ sym });
            }
        }

        const filter = {
            $and: [{ $or: [...directionFilter] }],
        };

        if (currenciesFilter.length > 0) {
            filter.$and.push({ $or: [...currenciesFilter] });
        }

        if (sequenceKey) {
            filter._id = { $lt: sequenceKey };
        }

        const pipeline = [
            {
                $match: filter,
            },
            {
                $sort: {
                    _id: -1,
                },
            },
            {
                $limit: limit,
            },
            {
                $lookup: {
                    from: 'usermetas',
                    localField: 'sender',
                    foreignField: 'userId',
                    as: 'senderMeta',
                },
            },
            {
                $lookup: {
                    from: 'usermetas',
                    localField: 'receiver',
                    foreignField: 'userId',
                    as: 'receiverMeta',
                },
            },
        ];

        const transfers = await TransferModel.aggregate(pipeline);

        const items = [];

        for (const transfer of transfers) {
            const receiverName = {
                userId: transfer.receiver,
            };
            const senderName = {
                userId: transfer.sender,
            };

            if (transfer.receiverMeta[0]) {
                receiverName.username = transfer.receiverMeta[0].username;
                receiverName.name = transfer.receiverMeta[0].name;
            }

            if (transfer.senderMeta[0]) {
                senderName.username = transfer.senderMeta[0].username;
                senderName.name = transfer.senderMeta[0].name;
            }

            items.push({
                id: transfer._id,
                sender: senderName,
                receiver: receiverName,
                quantity: transfer.quantity,
                sym: transfer.sym,
                trxId: transfer.trxId,
                memo: transfer.memo,
                blockNum: transfer.blockNum,
                timestamp: transfer.timestamp,
                isIrreversible: transfer.isIrreversible,
            });
        }

        let newSequenceKey;

        if (items.length < limit) {
            newSequenceKey = null;
        } else {
            newSequenceKey = items[items.length - 1].id;
        }

        return { items, sequenceKey: newSequenceKey };
    }

    async getBalance({ userId, currencies, type }) {
        const balances = await Utils.getBalance({
            userId,
            currencies,
            type,
            shouldFetchStake: true,
        });

        return balances;
    }
}

module.exports = Wallet;
