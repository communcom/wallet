function buildQuery({
    userId,
    direction,
    symbol,
    transferType,
    rewards,
    donations,
    claim,
    holdType,
}) {
    const symbolFilter = {};
    const typeFilters = [];

    if (symbol !== 'all') {
        if (symbol === 'CMN') {
            const directionFilter = [];

            switch (direction) {
                case 'receive':
                    directionFilter.push({ receiver: userId });
                    break;
                case 'send':
                    directionFilter.push({ sender: userId });
                    break;
                case 'all':
                default:
                    directionFilter.push({ sender: userId }, { receiver: userId });
            }

            return {
                $and: [
                    symbolFilter,
                    { $or: directionFilter },
                    {
                        $or: [
                            {
                                $and: [
                                    {
                                        actionType: {
                                            $in: [
                                                'transfer',
                                                'referralRegisterBonus',
                                                'referralPurchaseBonus',
                                                'donation',
                                            ],
                                        },
                                    },
                                    { transferType: 'token' },
                                ],
                            },
                            { $and: [{ actionType: 'convert' }, { transferType: 'point' }] },
                        ],
                    },
                ],
            };
        } else {
            symbolFilter.$or = [{ symbol }, { memo: symbol }];
        }
    }

    switch (transferType) {
        case 'none':
            break;
        case 'transfer':
            typeFilters.push(_getTransferActionByDirection(direction, userId));
            break;
        case 'convert':
            typeFilters.push(_getConvertActionByDirection(direction, userId));
            break;
        case 'all':
        default:
            typeFilters.push(
                _getTransferActionByDirection(direction, userId),
                _getConvertActionByDirection(direction, userId)
            );
    }

    switch (rewards) {
        case 'none':
            break;
        case 'all':
        default:
            typeFilters.push(_getRewardActionByDirection(direction, userId));
    }

    switch (donations) {
        case 'none':
            break;
        case 'all':
        default:
            typeFilters.push(_getDonationActionByDirection(direction, userId));
    }

    switch (claim) {
        case 'none':
            break;
        case 'all':
        default:
            typeFilters.push(_getClaimActionByDirection(direction, userId));
    }

    switch (holdType) {
        case 'none':
            break;
        case 'like':
            typeFilters.push({
                ..._getHoldActionTypeByDirection(direction, userId),
                holdType: 'like',
            });
            break;
        case 'dislike':
            typeFilters.push({
                ..._getHoldActionTypeByDirection(direction, userId),
                holdType: 'dislike',
            });
            break;
        case 'all':
        default:
            typeFilters.push(_getHoldActionTypeByDirection(direction, userId));
    }

    return {
        $and: [symbolFilter, { $or: typeFilters.length ? typeFilters : [{}] }],
    };
}

function _getConvertActionByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return {
                $and: [
                    { actionType: 'convert' },
                    { transferType: 'token' },
                    // TODO don't save restock to history
                    { memo: { $regex: /^(?!restock:)/ } },
                    { receiver: 'c.point', sender: userId },
                ],
            };
        case 'send':
            return {
                $and: [
                    { actionType: 'convert' },
                    { transferType: 'point' },
                    { receiver: 'c.point', sender: userId },
                ],
            };
        case 'all':
        default:
            return { actionType: 'convert', sender: userId };
    }
}

function _getTransferActionByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return { actionType: 'transfer', receiver: userId };
        case 'send':
            return { actionType: 'transfer', sender: userId };
        case 'all':
        default:
            return {
                $or: [
                    { actionType: 'transfer', receiver: userId },
                    { actionType: 'transfer', sender: userId },
                ],
            };
    }
}

function _getDonationActionByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return { actionType: 'donation', transferType: 'point', receiver: userId };
        case 'send':
            return { actionType: 'donation', transferType: 'point', sender: userId };
        case 'all':
        default:
            return {
                $or: [
                    { actionType: 'donation', transferType: 'point', receiver: userId },
                    { actionType: 'donation', transferType: 'point', sender: userId },
                ],
            };
    }
}

function _getClaimActionByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return { actionType: 'claim', receiver: userId };
        case 'send':
            return { actionType: 'claim', sender: userId };
        case 'all':
        default:
            return { actionType: 'claim', receiver: userId };
    }
}

function _getRewardActionByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return { actionType: 'reward', receiver: userId };
        case 'send':
            return { actionType: 'reward', sender: userId };
        case 'all':
        default:
            return { actionType: 'reward', receiver: userId };
    }
}

function _getHoldActionTypeByDirection(direction, userId) {
    switch (direction) {
        case 'receive':
            return { actionType: 'unhold', sender: userId };
        case 'send':
            return { actionType: 'hold', sender: userId };
        case 'all':
        default:
            return {
                $or: [
                    { actionType: 'hold', sender: userId },
                    { actionType: 'unhold', sender: userId },
                ],
            };
    }
}

module.exports = { buildQuery };
