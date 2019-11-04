const { verbose } = require('../../utils/logs');

const UserMeta = require('../../models/UserMeta');

class Username {
    async handleCreateUsernameAction(action) {
        const { creator, owner, name } = action.args;

        if (creator !== 'c') {
            return;
        }

        const userId = owner;
        const username = name;

        const userMetaModel = await UserMeta.findOne({ userId });

        if (userMetaModel) {
            await UserMeta.updateOne({ userId }, { $set: { 'meta.username': username } });

            verbose('Changed meta data of user:', userId, username);
        } else {
            await UserMeta.create({ userId, username });

            verbose('Created meta data of user:', userId, username);
        }
    }
}

module.exports = Username;
