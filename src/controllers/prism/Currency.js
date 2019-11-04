const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const PointModel = require('../../models/Point');

class Currency {
    async handleCurrencyEvent({ event, args }) {
        if (event !== 'currency') {
            return;
        }

        const { symbol } = Utils.parseAsset(args.max_supply);

        const pointObject = await PointModel.findOne({ symbol });

        if (pointObject) {
            const { supply, reserve, max_supply, cw, fee, issuert } = args;

            await PointModel.updateOne(
                { _id: pointObject._id },
                {
                    $set: {
                        supply,
                        reserve,
                        max_supply,
                        cw,
                        fee,
                        issuert,
                    },
                }
            );

            verbose('Updated point', symbol);
        }
    }
}

module.exports = Currency;