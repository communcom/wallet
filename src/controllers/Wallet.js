const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;

const BalanceModel = require('../models/Balance');
const TransferModel = require('../models/Transfer');
const PointModel = require('../models/Point');
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

    async getTransferHistory({ userId, direction, offset, limit }) {
        const directionFilter = [];

        if (direction !== 'in') {
            directionFilter.push({ sender: userId });
        }

        if (direction !== 'out') {
            directionFilter.push({ receiver: userId });
        }

        const filter = {
            $and: [{ $or: [...directionFilter] }],
        };

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

        const transfers = await TransferModel.aggregate(pipeline)
            .skip(offset)
            .limit(limit);

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

        return { items };
    }

    async getBalance({ userId }) {
        const result = {
            userId,
            balances: [],
        };

        const balanceObject = await BalanceModel.findOne({ account: userId });
        if (balanceObject) {
            const pointsSymbols = [];
            const balancesMap = new Map();

            for (const { symbol, balance } of balanceObject.balances) {
                pointsSymbols.push({ symbol });

                balancesMap.set(symbol, {
                    symbol,
                    balance,
                });
            }

            const points = await PointModel.find({
                $or: pointsSymbols,
            });

            for (const point of points) {
                balancesMap.set(point.symbol, {
                    ...balancesMap.get(point.symbol),
                    decs: point.decs,
                    issuer: point.issuer,
                    logo: point.logo,
                });
            }

            result.balances = Array.from(balancesMap.values());
        }

        return result;
    }
}

module.exports = Wallet;
