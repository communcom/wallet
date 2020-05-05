const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const UserGem = require('../../models/UserGem');
const HistoryModel = require('../../models/History');

class Gem {
    async handleUserGemState({ event, args }, trxData) {
        if (event !== 'gemstate') {
            return;
        }

        const { tracery, owner, creator, points, pledge_points, damn, shares } = args;

        const { amount } = Utils.parseAsset(points);

        if (!parseFloat(amount)) {
            return;
        }

        /* TODO refactor
        const userGemModel = await UserGem.findOne({ userId: owner });

        if (userGemModel) {
            await UserGem.updateOne(
                { userId: owner },
                {
                    $push: {
                        gemstates: {
                            tracery,
                            owner,
                            creator,
                            points,
                            pledge_points,
                            damn,
                            shares,
                        },
                    },
                }
            );

            verbose('Added user gemstate:', owner, tracery);
        } else {
            await UserGem.create({
                userId: owner,
                gemstates: [
                    {
                        tracery,
                        owner,
                        creator,
                        points,
                        pledge_points,
                        damn,
                        shares,
                    },
                ],
            });

            verbose('Created user gemstate:', owner, tracery);
        }
        */

        this.handleHoldHistory(
            trxData,
            {
                tracery,
                owner,
                creator,
                asset: points,
            },
            {
                actionType: 'hold',
                holdType: damn ? 'dislike' : 'like',
                frozen: amount,
            }
        );
    }

    async handleUserGemChop({ event, args }, trxData) {
        if (event !== 'gemchop') {
            return;
        }

        const { tracery, owner, creator, reward, unfrozen } = args;

        const { amount } = Utils.parseAsset(reward);

        if (!parseFloat(amount)) {
            return;
        }

        /* TODO refactor
        const userGemModel = await UserGem.findOne({ userId: owner });

        if (userGemModel) {
            await UserGem.updateOne(
                { userId: owner },
                {
                    $push: {
                        gemchops: {
                            tracery,
                            owner,
                            creator,
                            reward,
                            unfrozen,
                        },
                    },
                }
            );

            verbose('Added user gemchop:', owner, tracery);
        } else {
            await UserGem.create({
                userId: owner,
                gemchops: [
                    {
                        tracery,
                        owner,
                        creator,
                        reward,
                        unfrozen,
                    },
                ],
            });

            verbose('Created user gemchop:', owner, tracery);
        }
        */

        const { amount: unfrozenAmount } = Utils.parseAsset(unfrozen);

        if (!parseFloat(unfrozenAmount)) {
            return;
        }

        this.handleHoldHistory(
            trxData,
            {
                tracery,
                owner,
                creator,
                asset: unfrozen,
            },
            {
                actionType: 'unhold',
                unfrozen: unfrozenAmount,
            }
        );
    }

    async handleHoldHistory(trxData, gemObject, meta) {
        const { tracery, owner, creator, asset } = gemObject;
        const { actionType, holdType, frozen, unfrozen } = meta;

        const { amount, symbol } = Utils.parseAsset(asset);

        const userHistoryModel = await HistoryModel.findOne({
            symbol,
            sender: owner,
            receiver: creator,
            tracery,
        });

        if (actionType === 'hold' && userHistoryModel) {
            return;
        }

        let userHoldType = holdType;
        if (userHistoryModel) {
            userHoldType = actionType === 'unhold' ? userHistoryModel.holdType : holdType;
        }

        await HistoryModel.create({
            trxId: trxData.trxId,
            timestamp: trxData.timestamp,
            sender: owner,
            receiver: creator,
            quantity: amount,
            symbol,
            actionType,
            holdType: userHoldType,
            tracery,
            frozen,
            unfrozen,
        });

        verbose('Created history transfer');
    }
}

module.exports = Gem;
