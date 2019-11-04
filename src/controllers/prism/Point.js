const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const PointModel = require('../../models/Point');

class Point {
    async handlePointCreateEvent(action) {
        const { args } = action;
        const { amount, symbol } = Utils.parseAsset(args.maximum_supply);

        const [_, decs] = amount.split('.');

        const newPointObject = {
            symbol,
            decs: decs.length, // FIXME bad way
            issuer: args.issuer,
            maximum_supply: args.maximum_supply,
            cw: args.cw,
            fee: args.fee,
        };

        await PointModel.create(newPointObject);

        verbose('Created point', symbol, 'info:', newPointObject);
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
