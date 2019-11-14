const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const PointModel = require('../../models/Point');

class Point {
    async handlePointCreateEvent({ args }) {
        const { maximum_supply, cw, fee, issuer } = args;

        const { symbol } = Utils.parseAsset(maximum_supply);

        await PointModel.create({
            symbol,
            issuer,
            maximumSupply: maximum_supply,
            cw,
            fee,
        });

        verbose('Created point', symbol);
    }

    async handleIssuePoint({ args }, { timestamp }) {
        const { symbol, amount } = Utils.parseAsset(args.quantity);

        const pointObject = await PointModel.findOne({ symbol });

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $push: {
                        issueHistory: {
                            quantity: amount,
                            memo: args.memo,
                            timestamp,
                        },
                    },
                }
            );

            verbose('Updated point issue', symbol);
        }
    }

    async handleRestock({ args }, { timestamp }) {
        const match = args.memo.match(/^restock\: ([A-Z]+)$/);

        if (!match) {
            return;
        }

        const [_, symbol] = match;

        const pointObject = await PointModel.findOne({ symbol });

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $push: {
                        restockHistory: {
                            quantity: args.quantity,
                            timestamp,
                        },
                    },
                }
            );

            verbose('Updated', symbol);
        }
    }

    async handleSetInfo(action) {
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
}

module.exports = Point;
