const Utils = require('../../utils/Utils');
const { verbose } = require('../../utils/logs');

const BalanceModel = require('../../models/Balance');

class Balance {
    async handleBalanceEvent(event) {
        if (event.event !== 'balance') {
            return;
        }

        const { account, balance } = event.args;
        const { amount, symbol } = Utils.parseAsset(balance);

        if (symbol === 'GOLOS' || symbol === 'CYBER') {
            return;
        }

        await this._createOrUpdateUserBalance({
            userId: account,
            symbol,
            balance: amount,
        });
    }

    async handleOpenBalance({ args }) {
        if (!args.commun_code) {
            return;
        }

        const balanceModel = await BalanceModel.findOne(
            { userId: args.owner },
            { _id: false },
            { lean: true }
        );

        if (balanceModel) {
            const balances = balanceModel.balances.filter(b => b.symbol === args.commun_code);

            if (balances.length > 0) {
                return;
            }
        }

        await this._createOrUpdateUserBalance({
            userId: args.owner,
            symbol: args.commun_code,
            balance: 0,
        });
    }

    async handleOpenCommunBalance({ args }) {
        const [_, symbol] = args.symbol.split(',');

        if (symbol !== 'CMN') {
            return;
        }

        await this._createOrUpdateUserBalance({
            userId: args.owner,
            symbol,
            balance: 0,
        });
    }

    async _createOrUpdateUserBalance({ userId, balance, symbol }) {
        const balanceModel = await BalanceModel.findOne({ userId }, { _id: false }, { lean: true });

        if (balanceModel) {
            const balances = balanceModel.balances.filter(b => b.symbol === symbol);

            if (balances.length > 0) {
                await BalanceModel.updateOne(
                    { userId, 'balances.symbol': symbol },
                    { $set: { 'balances.$.balance': balance } }
                );
                verbose('Updated balance:', userId, balance, symbol);
            } else {
                await BalanceModel.updateOne(
                    { userId },
                    {
                        $push: {
                            balances: {
                                symbol,
                                balance,
                            },
                        },
                    }
                );
                verbose('Added balance:', userId, balance, symbol);
            }
        } else {
            const newBalance = {
                userId,
                balances: [
                    {
                        symbol,
                        balance,
                    },
                ],
            };

            await BalanceModel.create(newBalance);

            verbose('Created balance:', userId, balance, symbol);
        }
    }

    async handleInclstateEvent({ event, args }) {
        if (event !== 'inclstate') {
            return;
        }

        const { account, quantity } = args;
        const { amount, symbol } = Utils.parseAsset(quantity);

        if (!parseFloat(amount)) {
            return;
        }

        const balanceModel = await BalanceModel.findOne(
            {
                userId: account,
                'balances.symbol': symbol,
            },
            { _id: false },
            { lean: true }
        );

        if (balanceModel) {
            await BalanceModel.updateOne(
                { userId: account, 'balances.symbol': symbol },
                { $set: { 'balances.$.frozen': amount } }
            );

            verbose('Updated frozen points:', account, quantity);
        }
    }

    async handleGemChopEvent({ event, args }) {
        if (event !== 'gemchop') {
            return;
        }

        const { owner, unfrozen } = args;
        const { amount, symbol } = Utils.parseAsset(unfrozen);

        if (!parseFloat(amount)) {
            return;
        }

        const balanceModel = await BalanceModel.findOne(
            {
                userId: owner,
                'balances.symbol': symbol,
            },
            { _id: false },
            { lean: true }
        );

        if (balanceModel) {
            const point = balanceModel.balances.find(b => b.symbol === symbol);
            const frozenQuantity = Utils.calculateFrozenQuantity(point.frozen, amount);

            await BalanceModel.updateOne(
                { userId: owner, 'balances.symbol': symbol },
                {
                    $set: {
                        'balances.$.frozen': frozenQuantity,
                    },
                }
            );
            verbose('Updated unfrozen points:', owner, amount);
        }
    }
}

module.exports = Balance;
