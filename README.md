# Delegation Manager

Dapp Delegation Manager for Hiveonboard New Users


## Install

```bash
git clone https://github.com/voltairez/delegation-manager
cd delegation-manager
yarn
```

## Configure

### 1. Configure `config.json`

Configure the `config.json` file according to the descriptions below.

The `config.json` or `config.json.example` are examples of the configuration.

```markdown
delegationAccount = Account Delegator
delegationAmount = Amount of delegation to apply to new users / default value = 10HP
delegationLength = Number of days a delegation lasts by default (0 for infinite)
beneficiaryRemoval = Should program remove delegation if user revokes beneficiary (boolean)
minPostRC – referrer defined value of comments that you’d like to support for new users
muteAccount = Account bot will check muting against to automatically remove delegation to abusive users / default value = @sportstalkmute
hpWarning = The level of HP available in delegationAccount that should notify adminAccount
maxUserHP = Level of HP a referred user will be considered able to support themselves.
adminAccount = Account that monitors program
notifyUser = Should program notify users of delegation updates? (boolean)
delegationMsg = Default message sent to users about new delegation
delegationLengthMsg = Default message for users who’s delegation revoked after delegationLength expires
delegationMuteMsg = Default message for users who’s delegation is revoked due to being muted
delegationBeneficiaryMsg = Default message for users who’s delegation is revoked for removing beneficiary under open standard
delegationMaxMsg = Default message for users with enough HP to support themselves
```

### 2. Configure environment variables

Set the environment variables `POSTING_KEY` and `ACTIVE_KEY` of the `delegationAccount` in `.env` file.

The `.env.example` file is an example.

## Execute

```bash
yarn run execute
```
