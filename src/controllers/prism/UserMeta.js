const { verbose } = require('../../utils/logs');

const UserMeta = require('../../models/UserMeta');

class UserMetaInfo {
    async handleCreateUsernameAction(action) {
        const { creator, owner, name } = action.args;

        if (creator !== 'c') {
            return;
        }

        const userId = owner;
        const username = name;

        if(!username) {
            return;
        }

        const userMetaModel = await UserMeta.findOne({ userId });

        if (userMetaModel) {
            await UserMeta.updateOne({ userId }, { $set: { 'meta.username': username } });

            verbose('Changed meta data of user:', userId, username);
        } else {
            await UserMeta.create({ userId, username });

            verbose('Created meta data of user:', userId, username);
        }
    }

    async handleUpdateMetaAction(action) {
        const { account, meta } = action.args;

        if (!meta.avatar_url) {
            return;
        }

        const userId = account;

        const userMetaModel = await UserMeta.findOne({ userId });

        if (userMetaModel) {
            await UserMeta.updateOne({ userId }, { avatarUrl: meta.avatar_url });

            verbose('Changed meta data of user:', userId);
        } else {
            await UserMeta.create({ userId, avatarUrl: meta.avatar_url });

            verbose('Created meta data of user:', userId);
        }
    }
}

module.exports = UserMetaInfo;
