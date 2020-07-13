function buildQuery({ userId, direction, symbol, transferType, rewards, holdType }) {
    const directionFilter = [];
    const symbolFilter = {};
    const actionTypes = [];
    const typeFilters = [];

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

    if (symbol !== 'all') {
        if (symbol === 'CMN') {
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
            actionTypes.push('transfer');
            typeFilters.push({ transferType: 'point' }, { transferType: 'token' });
            break;
        case 'convert':
            actionTypes.push('convert');
            if (direction === 'receive') {
                typeFilters.push({
                    $and: [
                        { actionType: 'convert' },
                        { transferType: 'token' },
                        // TODO don't save restock to history
                        { memo: { $regex: /^(?!restock:)/ } },
                    ],
                });

                directionFilter.shift();
                directionFilter.push({ receiver: 'c.point' });
            } else if (direction === 'send') {
                typeFilters.push({ $and: [{ actionType: 'convert' }, { transferType: 'point' }] });

                directionFilter.shift();
                directionFilter.push({ receiver: 'c.point' });
            } else {
                typeFilters.push({ transferType: 'point' }, { transferType: 'token' });
            }
            break;
        case 'all':
        default:
            actionTypes.push('transfer', 'convert');
            typeFilters.push(
                { actionType: 'transfer', transferType: 'point' },
                { actionType: 'convert', transferType: 'token' },
                { actionType: 'donation', transferType: 'point' }
            );
    }

    switch (rewards) {
        case 'none':
            break;
        case 'claim':
            actionTypes.push('claim');
            break;
        case 'donation':
            actionTypes.push('donation');
            typeFilters.push({ actionType: 'donation', transferType: 'point' });
            break;
        case 'all':
        default:
            actionTypes.push('reward', 'claim', 'donation');
            typeFilters.push({ actionType: 'donation', transferType: 'point' });
    }

    const holdTypes = _getHoldActionTypesByDirection(direction);

    switch (holdType) {
        case 'none':
            break;
        case 'like':
            actionTypes.push(...holdTypes);
            typeFilters.push({ holdType: 'like' });
            break;
        case 'dislike':
            actionTypes.push(...holdTypes);
            typeFilters.push({ holdType: 'dislike' });
            break;
        case 'all':
        default:
            actionTypes.push(...holdTypes);
            typeFilters.push({ holdType: 'like' }, { holdType: 'dislike' });
    }

    return {
        $and: [
            symbolFilter,
            { $or: directionFilter },
            {
                $and: [
                    {
                        actionType: {
                            $in: actionTypes,
                        },
                    },
                    { $or: typeFilters.length ? typeFilters : [{}] },
                ],
            },
        ],
    };
}

function _getHoldActionTypesByDirection(direction) {
    switch (direction) {
        case 'receive':
            return ['unhold'];
        case 'send':
            return ['hold'];
        case 'all':
        default:
            return ['hold', 'unhold'];
    }
}

module.exports = { buildQuery };
