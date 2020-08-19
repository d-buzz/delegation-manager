# Delegation Manager

Dapp Delegation Manager for Hiveonboard New Users

## Introduction

This system will listen to events on the HIVE blockchain and apply delegations to new users, if a user was created following the Hiveonboard open standard. The program will manage these delegations to ensure they are revoked if a new user decides to opt-out of the beneficiary system or if the user falls outside of the referrers rules for delegation.

1. When a new user was created with the referrer set, the account info will be saved into local data store.
2. When a new user becomes active by performing operations such as comment, vote, transfer, custom_json, the delegator account will automatically delegate HP to the account if the user has no sufficient Hive Power, and is lack of Resource Credits, and is not muted by the specified mute account.
3. The delegation to a user will be revoked, when he/she has enough owned Hive Power, or the account is muted by the specified mute account, or delegation period has exceeded the defined cycle, or the default beneficiary settings in `json_metadata` is removed when `beneficiaryRemoval` is set.

## Install

```bash
git clone https://github.com/voltairez/delegation-manager
cd delegation-manager
yarn
```

## Configure

### 1. Configure `config.json`

Configure the `config.json` file according to the descriptions below.

The `config.json` and `config.json.example` are examples of the configuration.

| Setting  |    Description  |
|----------|:-------------|
| referrerAccount | Referrer account in Hiveonboard system |
| delegationAccount | Account Delegator |
| delegationAmount | Amount of delegation to apply to new users / default value | 10HP |
| delegationLength | Number of days a delegation lasts by default (0 for infinite) |
| beneficiaryRemoval | Should program remove delegation if user revokes beneficiary (boolean) |
| checkCycleMins | The referred accounts status check cycle in minutes |
| minPostRC | referrer defined value of comments that you’d like to support for new users |
| muteAccount | Account bot will check muting against to automatically remove delegation to abusive users / default value | @sportstalkmute |
| hpWarning | The level of HP available in delegationAccount that should notify adminAccount |
| maxUserHP | Level of HP a referred user will be considered able to support themselves. |
| adminAccount | Account that monitors program |
| notifyUser | Should program notify users of delegation updates? (boolean) |
| delegationMsg | Default message sent to users about new delegation |
| delegationLengthMsg | Default message for users who’s delegation revoked after delegationLength expires |
| delegationMuteMsg | Default message for users who’s delegation is revoked due to being muted |
| delegationBeneficiaryMsg | Default message for users who’s delegation is revoked for removing beneficiary under open standard |
| delegationMaxMsg | Default message for users with enough HP to support themselves |

### 2. Configure environment variables

Set the environment variables `ACTIVE_KEY` of the `delegationAccount` in `.env` file.

The `.env.example` file is an example.

## Execute

```bash
yarn run execute
```

The delegation service can resume from previous status when needed, by running the execute command again.

## Data Storage

The referred accounts data are saved under `users.json`. One example of the saved json data in `users.json.example`:

```json
{
  "databook1": {
    "account": "databook1",
    "weight": 300,
    "timestamp": 1596343794000,
    "status": "delegated",
    "delegatedAt": 1596729753000,
    "delegationAmount": 10.011477931832882
  },
  "jarajones": {
    "account": "jarajones",
    "weight": 300,
    "timestamp": 1594089720000
  },
  "leo.ryan20": {
    "account": "leo.ryan20",
    "weight": 300,
    "timestamp": 1597227285000,
    "status": "delegated",
    "delegatedAt": 1597272258000,
    "delegationAmount": 10.005741994991796
  },
  "onlinefantasy": {
    "account": "onlinefantasy",
    "weight": 300,
    "timestamp": 1597380525000,
    "status": "delegated",
    "delegatedAt": 1597675038000,
    "delegationAmount": 10.001493323185047
  },
  "rnherman": {
    "account": "rnherman",
    "weight": 300,
    "timestamp": 1597093125000,
    "status": "delegated",
    "delegatedAt": 1597100766000,
    "delegationAmount": 10.007551366802764
  }
}

```
