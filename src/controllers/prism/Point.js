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

    async handleCommunitySetInfo(action) {
        const { args } = action;

        if (!args.avatar_image) {
            return;
        }

        const { commun_code: symbol, avatar_image: logo } = args;

        const pointObject = await PointModel.findOne(
            { symbol },
            { issueHistory: false, restockHistory: false },
            { lean: true }
        );

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $set: {
                        logo,
                    },
                }
            );

            verbose('Updated point logo', args.commun_code);
        }
    }

    async handlePointSetParams({ args }) {
        const {
            commun_code: symbol,
            fee,
            transfer_fee: transferFee,
            min_transfer_fee_points: minTransferFeePoints,
        } = args;

        const pointObject = await PointModel.findOne(
            { symbol },
            { issueHistory: false, restockHistory: false },
            { lean: true }
        );

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $set: {
                        fee,
                        transferFee,
                        minTransferFeePoints,
                    },
                }
            );

            verbose('Updated point info', symbol);
        }
    }

    async handleCreateCommunity(action) {
        const { args } = action;

        const { commun_code: symbol, community_name: name } = args;

        const pointObject = await PointModel.findOne(
            { symbol },
            { issueHistory: false, restockHistory: false },
            { lean: true }
        );

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $set: {
                        name,
                    },
                }
            );
            verbose('Updated point name', args.commun_code);
        }
    }

    async handleChangeCommunityName(action) {
        const { args } = action;

        if (!args.community_name) {
            return;
        }

        const { commun_code: symbol, community_name: name } = args;

        const pointObject = await PointModel.findOne(
            { symbol },
            { issueHistory: false, restockHistory: false },
            { lean: true }
        );

        if (pointObject) {
            await PointModel.updateOne(
                { symbol },
                {
                    $set: {
                        name,
                    },
                }
            );
            verbose('Updated point name', args.commun_code);
        }
    }
}

module.exports = Point;
