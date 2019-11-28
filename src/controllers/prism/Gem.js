const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const UserGem = require('../../models/UserGem');

class Gem {
    async handleUserGemState({ event, args }) {
        if (event !== 'gemstate') {
            return;
        }

        const { tracery, owner, creator, points, pledge_points, damn, shares } = args;

        const { amount } = Utils.parseAsset(points);

        if (!parseFloat(amount)) {
            return;
        }

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
    }

    async handleUserGemChop({ event, args }) {
        if (event !== 'gemchop') {
            return;
        }

        const { tracery, owner, creator, reward, unfrozen } = args;

        const { amount } = Utils.parseAsset(reward);

        if (!parseFloat(amount)) {
            return;
        }

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
                    },
                ],
            });

            verbose('Created user gemchop:', owner, tracery);
        }
    }
}

module.exports = Gem;
