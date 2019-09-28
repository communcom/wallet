const core = require('cyberway-core-service');
const fetch = require('node-fetch');
const { JsonRpc, Api } = require('cyberwayjs');
const { TextEncoder, TextDecoder } = require('text-encoding');
const env = require('../data/env');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;
const BalanceModel = require('../models/Balance');
const TokenModel = require('../models/Token');

const RPC = new JsonRpc(env.GLS_CYBERWAY_HTTP_URL, { fetch });

const API = new Api({
    rpc: RPC,
    signatureProvider: null,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
});

class Utils {
    static getCyberApi() {
        return API;
    }

    static async getAccount({ userId }) {
        return await RPC.fetch('/v1/chain/get_account', { account_name: userId });
    }

    static checkAsset(asset) {
        if (typeof asset !== 'string') {
            return;
        }

        const parts = asset.split(' ');

        let amountString = parts[0];
        amountString = amountString.replace('.', '');

        let decsString = parts[0];
        decsString = decsString.split('.')[1];

        const sym = parts[1];
        const amount = parseInt(amountString);
        const decs = decsString.length;

        return { sym, amount, decs };
    }

    static convertAssetToString({ sym, amount, decs }) {
        const divider = new BigNum(10).pow(decs);
        const leftPart = new BigNum(amount).div(divider).toString();

        return `${leftPart} ${sym}`;
    }

    static checkDecsValue({ decs, requiredValue }) {
        if (decs !== requiredValue) {
            Logger.error(`convert: invalid argument ${decs}. decs must be equal ${requiredValue}`);
            throw { code: 805, message: 'Wrong arguments' };
        }
    }

    static parseAsset(asset) {
        if (!asset) {
            throw new Error('Asset is not defined');
        }
        const [quantityRaw, sym] = asset.split(' ');
        const quantity = new BigNum(asset);
        return {
            quantityRaw,
            quantity,
            sym,
        };
    }

    // Converts transfers quantity data to asset string
    // Like: "123.000 GLS"
    static formatQuantity(quantity) {
        return (
            new BigNum(quantity.amount).shiftedBy(-quantity.decs).toString() + ' ' + quantity.sym
        );
    }

    static async getBalance({ userId, currencies, shouldFetchStake = false }) {
        const result = {
            userId,
        };

        let tokensMap = {};

        const balanceObject = await BalanceModel.findOne({ name: userId });

        if (balanceObject) {
            result.liquid = {
                balances: {},
                payments: {},
            };
            if (currencies.includes('all')) {
                const allCurrencies = await TokenModel.find(
                    {},
                    { _id: false, sym: true },
                    { lean: true }
                );

                for (const currency of allCurrencies) {
                    tokensMap[currency.sym] = true;
                }
            } else {
                for (const token of currencies) {
                    tokensMap[token] = true;
                }
            }
            for (const tokenBalance of balanceObject.balances) {
                const { sym, quantityRaw } = await Utils.parseAsset(tokenBalance);
                if (tokensMap[sym]) {
                    result.liquid.balances[sym] = quantityRaw;
                }
            }
            for (const tokenPayments of balanceObject.payments) {
                const { sym, quantityRaw } = await Utils.parseAsset(tokenPayments);
                if (tokensMap[sym]) {
                    result.liquid.payments[sym] = quantityRaw;
                }
            }
        }

        if (shouldFetchStake) {
            const { stake_info: stakeInfo } = await Utils.getAccount({ userId });
            result.stakeInfo = stakeInfo;
        }

        return result;
    }

    static calculateConvertAmount({ baseRaw, multiplierRaw, dividerRaw }) {
        const base = new BigNum(baseRaw);
        const multiplier = new BigNum(multiplierRaw);
        const divider = new BigNum(dividerRaw);

        return base
            .times(multiplier)
            .div(divider)
            .dp(0)
            .toString();
    }
}

module.exports = Utils;
