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

        await this._createOrUpdateUserBalance({
            userId: args.owner,
            symbol: args.commun_code,
            balance: 0,
        });
    }

    async _createOrUpdateUserBalance({ userId, balance, symbol }) {
        const balanceModel = await BalanceModel.findOne({ userId });

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
}

module.exports = Balance;
