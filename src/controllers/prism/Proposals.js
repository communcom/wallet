const Utils = require('../../utils/Utils');

class Proposals {
    async disperseAction(action, transaction) {
        if (action.receiver !== action.code) {
            return;
        }

        const method = `${action.code}->${action.action}`;

        switch (method) {
            case 'cyber.msig->propose':
                await this._handleNewProposal(action.args);
                break;
            case 'cyber.msig->approve':
            case 'cyber.msig->unapprove':
                break;
            case 'cyber.msig->exec':
            case 'cyber.msig->cancel':
                break;
        }
    }

    async _handleNewProposal({ proposer, proposal_name: proposalId, requested, trx }) {
        // Обрабатываем пропозалы содержащие одно действие, на сайте создаем именно такие.
        if (trx.actions.length !== 1) {
            return;
        }

        const action = trx.actions[0];
        const [communityId, type] = action.account.split('.');
        const pathName = `${type}->${action.name}`;

        // TODO
    }
}

module.exports = Proposals;
