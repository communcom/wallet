const core = require('cyberway-core-service');
const BasicController = core.controllers.Basic;
const BigNum = core.types.BigNum;

const packageJson = require('../../package.json');

const BlockSubscribeModel = require('../models/BlockSubscribeStatus');
const BalanceModel = require('../models/Balance');
const HistoryModel = require('../models/History');
const PointModel = require('../models/Point');
const Claim = require('../models/Claim');
const Transfer = require('../models/Transfer');

const Utils = require('../utils/Utils');
const { calculateBuyAmount, calculateSellAmount } = require('../utils/price');

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

    async getTransferHistory({
        userId,
        direction,
        symbol,
        transferType,
        rewards,
        holdType,
        offset,
        limit,
    }) {
        const directionFilter = [];
        const symbolFilter = {};
        const transferTypeFilter = {};
        const rewardsFilter = {};
        const holdTypeFilter = {};

        if (symbol !== 'all') {
            if (symbol === 'CMN') {
                transferTypeFilter.$or = [
                    {
                        $and: [
                            {
                                actionType: {
                                    $in: [
                                        'transfer',
                                        'referralRegisterBonus',
                                        'referralPurchaseBonus',
                                    ],
                                },
                            },
                            { transferType: 'token' },
                        ],
                    },
                    { $and: [{ actionType: 'convert' }, { transferType: 'point' }] },
                ];
            } else {
                symbolFilter.$or = [{ symbol }, { memo: symbol }];
            }
        }

        switch (direction) {
            case 'receive':
                directionFilter.push({ receiver: userId });
                break;
            case 'send':
                directionFilter.push({ sender: userId });
                break;
            case 'all':
            default:
                directionFilter.push({ sender: userId }, { receiver: userId });
        }

        switch (transferType) {
            case 'transfer':
                transferTypeFilter.$and = [{ $or: [{ actionType: 'transfer' }] }];
                break;
            case 'convert':
                transferTypeFilter.$and = [{ $or: [{ actionType: 'convert' }] }];
                break;
            case 'none':
                transferTypeFilter.$nor = [
                    { $or: [{ actionType: 'transfer' }, { actionType: 'convert' }] },
                ];
                break;
            case 'all':
            default:
        }

        if (!['all', 'none'].includes(transferType) && rewards === 'all') {
            transferTypeFilter.$and[0].$or.push({ actionType: 'reward' });
        }

        switch (rewards) {
            case 'none':
                rewardsFilter.actionType = { $not: { $eq: 'reward' } };
            case 'all':
            default:
        }

        switch (holdType) {
            case 'like':
                holdTypeFilter.holdType = 'like';
                break;
            case 'dislike':
                holdTypeFilter.holdType = 'dislike';
                break;
            case 'none':
                holdTypeFilter.$nor = [{ holdType: 'like' }, { holdType: 'dislike' }];
                break;
            case 'all':
            default:
        }

        const filterQuery = {
            $and: [
                { $or: directionFilter },
                symbolFilter,
                transferTypeFilter,
                rewardsFilter,
                holdTypeFilter,
            ],
        };

        const pipeline = [
            {
                $match: filterQuery,
            },
            {
                $sort: {
                    _id: -1,
                },
            },
            {
                $skip: offset,
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
            {
                $lookup: {
                    from: 'usermetas',
                    localField: 'referralInitiator',
                    foreignField: 'userId',
                    as: 'referralInitiatorMeta',
                },
            },
            {
                $lookup: {
                    from: 'points',
                    let: { symbol: '$symbol', memo: '$memo' },
                    as: 'pointInfo',
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: ['$symbol', '$$symbol'] },
                                        { $eq: ['$symbol', '$$memo'] },
                                    ],
                                },
                            },
                        },
                        { $project: { issueHistory: 0, restockHistory: 0 } },
                    ],
                },
            },
        ];

        const transfers = await HistoryModel.aggregate(pipeline);

        const items = [];

        for (const transfer of transfers) {
            const receiver = {
                userId: transfer.receiver,
            };
            const sender = {
                userId: transfer.sender,
            };
            const referral = {
                userId: transfer.referralInitiator,
            };

            const point = {};

            const receiverMeta = transfer.receiverMeta[0];
            if (receiverMeta) {
                receiver.username = receiverMeta.username;
                receiver.avatarUrl = receiverMeta.avatarUrl;
            }

            const senderMeta = transfer.senderMeta[0];
            if (senderMeta) {
                sender.username = senderMeta.username;
                sender.avatarUrl = senderMeta.avatarUrl;
            }

            const referralMeta = transfer.referralInitiatorMeta[0];
            if (referralMeta) {
                referral.username = referralMeta.username;
                referral.avatarUrl = referralMeta.avatarUrl;
            }

            const [pointInfo] = transfer.pointInfo;

            if (pointInfo) {
                point.name = pointInfo.name;
                point.logo = pointInfo.logo;
                point.symbol = pointInfo.symbol;
            }

            const meta = {
                actionType: transfer.actionType,
                transferType: transfer.transferType,
                holdType: transfer.holdType,
                exchangeAmount: transfer.exchangeAmount,
                direction: transfer.sender === userId ? 'send' : 'receive',
                ...transfer.referralData,
            };

            items.push({
                id: transfer._id,
                sender: sender,
                receiver: receiver,
                referral: referral.userId ? referral : undefined,
                quantity: transfer.quantity,
                symbol: transfer.symbol,
                point,
                trxId: transfer.trxId,
                memo: transfer.memo,
                blockNum: transfer.blockNum,
                timestamp: transfer.timestamp,
                isIrreversible: transfer.isIrreversible,
                meta,
            });
        }

        return { items };
    }

    // TODO improve
    async getBalance({ userId }) {
        const result = {
            userId,
            balances: [],
        };

        const balanceObject = await BalanceModel.findOne({ userId });
        if (balanceObject) {
            const pointsSymbols = [];
            const balancesMap = new Map();

            for (const { symbol, balance, frozen } of balanceObject.balances) {
                pointsSymbols.push({ symbol });

                balancesMap.set(symbol, {
                    symbol,
                    balance,
                    frozen,
                });
            }

            const points = await PointModel.find(
                {
                    $or: pointsSymbols,
                },
                {
                    restockHistory: false,
                    issueHistory: false,
                }
            );

            for (const point of points) {
                const balanceObj = balancesMap.get(point.symbol);

                let price = 0;
                if (balanceObj.balance != 0) {
                    price = new BigNum(
                        balanceObj.balance / calculateBuyAmount(point, `1 ${point.symbol}`)
                    ).toFixed(4);
                }

                balancesMap.set(point.symbol, {
                    symbol: balanceObj.symbol,
                    balance: balanceObj.balance,
                    logo: point.logo,
                    name: point.name,
                    frozen: balanceObj.frozen,
                    price, // calculateSellAmount(point, balanceObj.balance),
                    transferFee: point.transferFee,
                });
            }

            result.balances = Array.from(balancesMap.values());
        }

        return result;
    }

    async getSellPrice({ quantity }) {
        const { symbol } = Utils.parseAsset(quantity);

        const point = await PointModel.findOne(
            { symbol },
            {
                _id: false,
                issueHistory: false,
                restockHistory: false,
            }
        );

        if (!point) {
            return {};
        }

        const price = calculateSellAmount(point, quantity);

        return { price: `${price} CMN` };
    }

    async getBuyPrice({ pointSymbol, quantity }) {
        const point = await PointModel.findOne(
            { symbol: pointSymbol },
            {
                _id: false,
                issueHistory: false,
                restockHistory: false,
            }
        );

        if (!point) {
            return {};
        }

        const price = calculateBuyAmount(point, quantity);

        return { price: `${price} ${pointSymbol}` };
    }

    async getPointInfo({ symbol }) {
        const point = await PointModel.findOne(
            { symbol },
            {
                _id: false,
                issueHistory: false,
                restockHistory: false,
                createdAt: false,
                updatedAt: false,
                __v: false,
            }
        );

        if (!point) {
            return {};
        }

        return point;
    }

    async getTransfer({ blockNum, trxId }) {
        const transfers = await Transfer.find(
            { $or: [{ blockNum }, { trxId }] },
            {
                _id: false,
                __v: false,
                createdAt: false,
                updatedAt: false,
            },
            { lean: true }
        ).sort({ _id: -1 });

        return {
            items: transfers || [],
        };
    }

    async getBlockSubscribeStatus() {
        const {
            blockId,
            blockNum,
            blockTime,
            lastIrreversible,
            lastFork,
        } = await BlockSubscribeModel.findOne();

        return {
            blockId,
            blockNum,
            blockTime,
            lastIrreversible,
            lastFork,
            status: 'running',
        };
    }

    async getVersion() {
        return {
            version: packageJson.version,
        };
    }
}

module.exports = Wallet;
