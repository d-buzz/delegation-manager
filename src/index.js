// implement the delegation manager according to the description in the post:
// https://www.sportstalksocial.com/hive-101690/@sportstalksocial/bounty-to-develop-delegation-manager-for-hiveonboard

import config from '../config' // #1 load config
import { streamOperations, getOperationPerformer } from './operation'
import { readReferredUsers, saveReferredUsers, addToReferredUsers } from './user'
import { getMutedAccounts, getAccountRC, delegatablePower, usablePower, getAccount, hasBeneficiarySetting, sendMessage } from './account'

// object keeps the latest referred users
// user status: { inactive, delegated, muted, expired, beneficiary_removed, graduated }
let referredUsers = {}

function getInactiveUsers() {
  const users = Object.values(referredUsers)
  return users.filter(u => u.status == null ).map(u => u.account)
}

function getDelegatedUsers() {
  const users = Object.values(referredUsers)
  return users.filter(u => u.status === 'delegated').map(u => u.account)
}

function containsUser(username) {
  const usernames = Object.keys(referredUsers)
  return usernames.includes(username)
}

// #2.2 streaming operations and listen to account creation operation
function whenReferredUserCreated(op) {
  const name = op.op[0]
  if (['create_claimed_account', 'account_create'].includes(name)) {
    const account = op.op[1]
    if (hasBeneficiarySetting(account, config.delegationAccount)) {
      const username = account.new_account_name
      console.log('referred user has been created:', username)
      if (!containsUser(username)) {
        referredUsers = addToReferredUsers([{
          account: username,
          weight: referred[0].weight,
          timestamp: new Date(op.timestamp + 'Z').getTime()
        }])
      } else {
        console.log(`referred user @${username} already exists. skip.`)
      }
    }
  }
}

// #5 listen to account activities, and delegate to the user if RC is less than minimum needs
function whenReferredUserTakeActions(op) {
  const name = op.op[0]
  if (['comment', 'vote', 'transfer', 'custom_json'].includes(name)){
    const username = getOperationPerformer(op)
    const users = getInactiveUsers()
    if (users.includes(username)) {
      console.log(`@${username} has performed [${name}] opeation at ${op.timestamp}`)
      delegateToUser(username)
    }
  }
}

async function isMuted(username) {
  const blacklist = await getMutedAccounts(config.muteAccount)
  return blacklist.includes(username)
}

async function hasEnoughHP(username) {
  const hp = await usablePower(username)
  const maxHP = parseFloat(config.maxUserHP) || 30
  return hp >= maxHP
}

async function hasNoRC(username) {
  const rc = await getAccountRC(username)
  const commentUnitCost = 1 // TODO: comment transaction average cost
  const minComments = parseFloat(config.minPostRC) || 2
  return rc > minComments * commentUnitCost
}

async function hasSetBeneficiary(username) {
  const account = await getAccount(username)
  if (hasBeneficiarySetting(account, config.delegationAccount)) {
    return true
  }
}

async function hasDelegatedTo(username) {
  return false
}

async function hasExceedsDelegatinLength(username) {
  return false
}

async function notify(receiver, message) {
  await sendMessage(process.env.ACTIVE_KEY, config.delegationAccount, receiver, message)
}

async function delegateToUser(username) {
  // delegate to user, when
  // 1. user has little RC
  // 2. user has low Hive Power (own + received delegation) < maxUserHP
  // 3. default beneficiary setting is not removed
  // 4. user is not muted
  // 5. we have not delegated to the user before
  if (!await isMuted(username) && !await hasEnoughHP(username)
    && await hasNoRC(username) && await hasSetBeneficiary(username)
    && !await hasDelegatedTo(username))
  {
    console.log(`delegate ${config.delegationAmount} HP to @${username}`)
    await delegatePower(process.env.ACTIVE_KEY, config.delegationAccount, username, parseFloat(config.delegationAmount))
  }

  // #10 if delegation process fail, notify the admin account
}

async function removeDelegationIfNeeded(username) {
  // delegate to user, when
  // 1. user has enough Hive Power (own + received delegation)
  // 2. user is muted
  // 3. delegation length exceeds defined cycle
  // 4. default beneficiary setting is removed

  async function removeDelegation() {
    await delegatePower(process.env.ACTIVE_KEY, config.delegationAccount, username, 0)
  }

  if (await hasEnoughHP(username)) {
    console.log(`remove delegation to @${username}`)
    await removeDelegation()
    notify(username, config.delegationMaxMsg)
  } else if (await isMuted(username)) {
    console.log(`remove delegation to @${username}`)
    await removeDelegation()
    notify(username, config.delegationMuteMsg)
  } else if (await hasExceedsDelegatinLength(username)) { //
    console.log(`remove delegation to @${username}`)
    await removeDelegation()
    notify(username, config.delegationLengthMsg)
  } else if (config.beneficiaryRemoval == true && await hasSetBeneficiary(username)) {
    console.log(`remove delegation to @${username}`)
    await removeDelegation()
    notify(username, config.delegationBeneficiaryMsg)
  }
}

async function checkDelegatorAccountHP() {
  // #9 if the delegator account has no enough HP, send warning to the admin account
  const hp = await delegatablePower(config.delegationAccount)
  const hpWarning = parseFloat(config.hpWarning)
  if (hpWarning >= 0 && hp < hpWarning) {
    // send warning
    console.log('no sufficient HP for delegation')
    notify(config.adminAccount, config.hpWarningMsg)
  }
}

async function processOperations() {
  // stream operations
  console.log('#1 stream operations starts')
  await streamOperations([whenReferredUserCreated, whenReferredUserTakeActions], {
    from: 46146671
    // block 46146673 (@leo.ryan20 performs custom_json)
    // block 45977166 (@leo.ryan20 account is created)
  })
  console.log('stream operations ended')
}

async function monitoringAccounts() {
  console.log('#2 monitoring account status')
  const job = () => {
    console.log('checking referred users status...')
    const users = getDelegatedUsers()
    users.forEach(u => removeDelegationIfNeeded(u))
    checkDelegatorAccountHP()
  }
  job()
  setInterval(job, parseFloat(config.checkCycleMins) * 60 * 1000)
}

async function main() {
  referredUsers = await readReferredUsers()
  saveReferredUsers(referredUsers)

  await Promise.all([
    processOperations(),
    monitoringAccounts()
  ])
}

main()
