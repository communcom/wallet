const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const PointModel = require('../../models/Point');

class Currency {
    async handleCurrencyEvent({ event, args }) {
        if (event !== 'currency') {
            return;
        }

        const { symbol } = Utils.parseAsset(args.max_supply);

        const pointObject = await PointModel.findOne(
            { symbol },
            { issueHistory: false, restockHistory: false },
            { lean: true }
        );

        if (pointObject) {
            const {
                supply,
                reserve,
                max_supply,
                cw,
                fee,
                issuer,
                transfer_fee,
                min_transfer_fee_points,
            } = args;

            await PointModel.updateOne(
                { symbol },
                {
                    $set: {
                        supply,
                        reserve,
                        maximumSupply: max_supply,
                        cw,
                        fee,
                        issuer,
                        transferFee: transfer_fee,
                        minTransferFeePoints: min_transfer_fee_points,
                    },
                }
            );

            verbose('Updated point', symbol);
        }
    }
}

module.exports = Currency;
