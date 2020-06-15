# wallet

###getDonations

=> Запрос

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getDonations",
    "params": {
        "userId": "cmn3sthptuic",
        "permlink": "post-1592177159440"
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "contentId": {
            "userId": "cmn3sthptuic",
            "permlink": "post-1592177159440",
            "communityId": "BIKE"
        },
        "donations": [
            {
                "quantity": "10.000",
                "sender": {
                    "username": "joker",
                    "avatarUrl": null,
                    "userId": "tst5gcpyhltm"
                }
            }
        ],
        "totalAmount": 10
    }
}
```

###getDonationsBulk

=> Запрос

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getDonationsBulk",
    "params": {
        "posts": [
            { "userId": "cmn3sthptuic", "permlink": "post-1592177159440" },
            { "userId": "cmn2cgadipiy", "permlink": "post-1592164531408" }
        ]
    }
}
```

<= Ответ

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "items": [
            {
                "contentId": {
                    "userId": "cmn3sthptuic",
                    "permlink": "post-1592177159440",
                    "communityId": "BIKE"
                },
                "donations": [
                    {
                        "quantity": "10.000",
                        "sender": {
                            "username": "joker",
                            "avatarUrl": null,
                            "userId": "tst5gcpyhltm"
                        }
                    },
                    {
                        "quantity": "2.000",
                        "sender": {
                            "username": "bob",
                            "avatarUrl": "https://img.commun.com/proxy/100x100/https://i.pravatar.cc/300?u=9512c4ec51af7492f63e3e8e2a3152797487718a",
                            "userId": "tst3gcpyf4tm"
                        }
                    }
                ],
                "totalAmount": 12
            },
            {
                "contentId": {
                    "userId": "cmn2cgadipiy",
                    "permlink": "post-1592164531408",
                    "communityId": "BIKE"
                },
                "donations": [
                    {
                        "quantity": "10.000",
                        "sender": {
                            "username": "joker",
                            "avatarUrl": null,
                            "userId": "tst5gcpyhltm"
                        }
                    }
                ],
                "totalAmount": 10
            }
        ]
    }
}
```
