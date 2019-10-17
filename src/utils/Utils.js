const core = require('cyberway-core-service');
const fetch = require('node-fetch');
const { JsonRpc, Api } = require('cyberwayjs');
const { TextEncoder, TextDecoder } = require('text-encoding');
const env = require('../data/env');
const Logger = core.utils.Logger;
const BigNum = core.types.BigNum;


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

    static calculateQuantity(q1, q2) {
        if (!q1) {
            return q2;
        }
        const paresedQ1 = Utils.parseAsset(q1);
        const paresedQ2 = Utils.parseAsset(q2);
        return `${paresedQ1.quantity.plus(paresedQ2.quantity)} ${paresedQ2.sym}`;
    }
}

module.exports = Utils;
