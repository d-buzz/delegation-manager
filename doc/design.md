## Introduction

Hiveonboard has created an [open standard for Hive account referrals](https://peakd.com/hive/@hiveonboard/open-standard-for-a-hive-account-referral-system) that has streamlined the new user sign-ups on Hive. Anyone can now request an account and have one made instantly for no upfront cost. This makes the process seamless for new users and allows them to begin using our platform instantly.

If a user was referred by another person (referrer), there is always an incentive for the referrer to support the new user with guidance or a small hive power delegation since he will receive 3% of his posting rewards as a share, in case the new user doesn’t opt out. There may be other interested parties as well like dApp owners – in the sake of simplicity we call this group of people the referrer.

Since it’s an open standard – the system can be used by any other account creation service, so the system is designed to always be truly decentralized and doesn’t require Hiveonboard as a requirement.

### The Issue for Referrer and Users

While this system makes it simple for new users to receive an account there’s still a bit of work on the backend for referrer to support these new users for the long term. When a user signs up via Hiveonboard they are given a 10000.000000 VESTS delegation from @hiveonboard for 7 days to have enough resource credits to interact. For any additional resources or after that initial period it’s on the referrer to support users with additional delegations.

To date there’s not been an automated system to handle this. This means that referrer have to manually monitor for memos from @hiveonboard and then manually apply delegations to users. Additionally referrer need to track those users manually to determine when they need to revoke delegations in favor of supporting newer users.

### Solution

We’ve determined the best solution to this issue is the creation of an MIT licensed program that referrer can run for themselves to manage delegations to new users. This system will listen to events on the HIVE blockchain and apply delegations to new users as defined by their standards, if a user was created following the open standard. Additionally the program will manage these delegations to ensure they are revoked if a new user decides to opt-out of the beneficiary system or if the user falls outside of the referrers rules for delegation.

## Design

First and foremost this program will need to be open sourced with an MIT license so that anyone can run it or modify it themselves. Additionally we believe the program needs to be as lightweight as possible to be ran on commodity servers to encourage all referrers to run it and support new users to the Hive ecosystem.

The system will need to do the following activities:

1.) Have a simple config.json allowing referrers to define their metrics for delegation. This configuration should support:

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

2.) Program has to listen for account create events on the HIVE blockchain and parse the json_metadata if the created account was referred by the delegationAccount. Bonus: Program may query the hiveonboard API (https://hiveonboard.com/api/referrer/sportstalksocial with dappAccount replacing sportstalksocial) or query a Hivemind server on first startup in order to retrieve historical referred accounts this way it could prevent parsing the whole blockchain history to gain all data.

3.) When new user is detected then program will need to store user in the state file of accounts that have been referred.

4.) Program will need to listen for users muted by muteAccount and ensure that those users are removed from state of referred users. If notifyUser = true, send new user delegationMuteMsg as a 0.001 Hive transfer memo.

5.) Program will need to listen for account activity (posts, votes, transfers, json) from accounts within stored state. If activity is detected from users then check user account for current RC state. If RC is lower than defined RC minimum for program (referred user’s RC < current witness cost for resource credit cost * minPostRC) then issue delegationAmount to user. If notifyUser = true,  send new user delegationMsg as a 0.001 Hive transfer memo.

6.) If delegationLength is > 0, program will need to review “timestamps” from the delegation transaction to determine if any are past delegationLength. If they are the bot will need to revoke delegation for that user. If notifyUser = true, send user delegationLengthMsg as a 0.001 Hive transfer memo letting them know delegation has expired.

7.) If beneficiaryRemoval = true, the program will need to check users with an active delegation to ensure they’ve not opted out of beneficiary rewards defined in the [open standard](https://peakd.com/hive/@hiveonboard/open-standard-for-a-hive-account-referral-system) by removing beneficiaries json. If user has revoked beneficiary then bot will need to remove delegation to user. If notifyUser = true, send new user delegationBeneficiaryMsg as a 0.001 Hive transfer memo.

8.) If maxUserHP is defined, check users with delegation for their current HP. If their HP is > than maxUserHP then remove delegation. If notifyUser = true, send user delegationMaxMsg as a 0.001 Hive transfer memo.

9.) Check dappAccount against hpWarning to ensure there’s enough HP available for future delegations. If HP is below amount defined in hpWarning send adminAccount a 0.001 Hive transfer with memo notifying them to add more Hive Power.

10.) If delegation fails for any reason then bot should notify adminAccount of the issue as a 0.001 Hive transfer memo.

## Bounty

To support the creation of our proposed solution we are creating a bounty for this work that we will offer to the first user who provides a working program that meets the design qualifications listed above. To claim this bounty you will need to leave a comment on this post that links to a public, MIT licensed GitHub that meets all of the design metrics above. The GitHub should feature a README with simple instructions on how users can install on a VPS as well as how to edit the .config to match needs. After submitting we will be reviewing the code and once confirmed will send the bounty to that user.

The current bounty for this completed work is XXX Hive. This includes donations from the following users:

250 Hive from @sportstalksocial
250 Hive from @theycallmedan
250 Hive from @leofinance
25 Hive from @dbuzz

If you would like to help sponsor this work please send any Hive to @sportstalksocial along with a memo stating it’s for “Hiveonboard bounty” and we will update this post to include your bounty inclusion.

We reserve the right to decline any submissions based on our needs and any evolving discussions.

## References

[Open Standard for a HIVE Account Referral System by @hiveonboard](https://peakd.com/hive/@hiveonboard/open-standard-for-a-hive-account-referral-system)

[Default @hiveonboard delegation](https://github.com/christianfuerst/hiveonboard/blob/b1d88a271f135ab9bdc3d62196475fe9455b63e3/functions/config.sample.json)

[Hiveonboard.com API Documentation](https://app.swaggerhub.com/apis-docs/christianfuerst/hiveonboard.com/1.0.0)
