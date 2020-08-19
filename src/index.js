// implement the delegation manager according to the description in the post:
// https://www.sportstalksocial.com/hive-101690/@sportstalksocial/bounty-to-develop-delegation-manager-for-hiveonboard

import config from '../config' // #1 load config
import { streamOperations, getOperationPerformer } from './operation'
import { readReferredUsers, saveReferredUsers, addToReferredUsers, STATUS } from './user'
import { getMutedAccounts, getAccountRC, delegatablePower, usablePower, getAccount,
  hasBeneficiarySetting, delegatePower, sendMessage, getOutgoingDelegations }
  from './account'

function isTrue(setting) {
  return setting && ('' + setting).toLowerCase() === 'true'
}

// ---- Users -----

// object keeps the referred users
let referredUsers = {}

async function getInactiveUsers() {
  const users = Object.values(referredUsers)
  return users.filter(u => u.status == null || u.status === STATUS.INACTIVE ).map(u => u.account)
}

async function getDelegatedUsers() {
  const users = Object.values(referredUsers)
  return users.filter(u => u.status === STATUS.DELEGATED).map(u => u.account)
}

function containsUser(username) {
  const usernames = Object.keys(referredUsers)
  return usernames.includes(username)
}

function updateUser(user) {
  referredUsers = addToReferredUsers([user])
  console.log(`updated user data for ${user.account}`)
}

function getUser(username) {
  return referredUsers[username]
}

let updatedTimestamp = null;

async function updateDelegations() {
  // ignore the update if updated within 1 minutes
  if (updatedTimestamp && updatedTimestamp + 60 * 1000 > Date.now()) {
    return
  }

  const delegations = await getOutgoingDelegations(config.delegationAccount)
  for (const delegation of delegations) {
    const username = delegation.delegatee
    if (containsUser(username)) {
      const user = getUser(username)
      if (user.status !== STATUS.DELEGATED) {
        user.status = STATUS.DELEGATED
        user.delegatedAt = new Date(delegation.min_delegation_time + 'Z').getTime()
        user.delegationAmount = delegation.hive_power
        updateUser(user)
        console.log(`updated delegation status for @${username}`)
      }
    }
  }
  updatedTimestamp = Date.now()
  // console.log(`updated @${config.delegationAccount}'s delegation data`)
}

// ---- Streaming Operations Callbacks -----

// #2.2 streaming operations and listen to account creation operation
function whenReferredUserCreated(op) {
  const name = op.op[0]
  if (['create_claimed_account', 'account_create'].includes(name)) {
    const account = op.op[1]
    if (hasBeneficiarySetting(account, config.delegationAccount)) {
      const username = account.new_account_name
      console.log('referred user has been created:', username)
      if (!containsUser(username)) {
        updateUser({
          account: username,
          weight: referred[0].weight,
          timestamp: new Date(op.timestamp + 'Z').getTime()
        })
      } else {
        console.log(`referred user @${username} already exists. skip.`)
      }
    }
  }
}

// #5 listen to account activities, and delegate to the user if RC is less than minimum needs
async function whenReferredUserTakeActions(op) {
  const name = op.op[0]
  if (['comment', 'vote', 'transfer', 'custom_json'].includes(name)){
    const username = getOperationPerformer(op)
    const users = await getInactiveUsers()
    if (users.includes(username)) {
      console.log(`@${username} has performed [${name}] opeation at ${op.timestamp}`)
      delegateToUser(username)
    }
  }
}

// ---- Check User Status -----

async function isMuted(username) {
  // console.log('\tis muted ?', username)
  if (config.muteAccount) {
    const blacklist = await getMutedAccounts(config.muteAccount)
    return blacklist.includes(username)
  } else {
    return false
  }
}

async function hasEnoughHP(username) {
  // console.log('\thas enough HP ?', username)
  const hp = await usablePower(username)
  const maxHP = parseFloat(config.maxUserHP) || 30
  return hp >= maxHP
}

async function hasNoRC(username) {
  // console.log('\thas no RC ?', username)
  const rc = await getAccountRC(username)
  const commentUnitCost = 1 // TODO: comment transaction average cost
  const minComments = parseFloat(config.minPostRC) || 2
  return rc < minComments * commentUnitCost
}

async function hasSetBeneficiary(username) {
  // console.log('\thas set beneficiaries ?', username)
  const account = await getAccount(username)
  return hasBeneficiarySetting(account, config.delegationAccount)
}

async function hasDelegatedTo(username) {
  // console.log('\thas delegated to ?', username)
  const delegated = await getDelegatedUsers()
  if (delegated.includes(username)) {
    return true
  } else {
    return false
  }
}

async function hasExceededDelegatinLength(username) {
  // console.log('\thas exceeded delegation length ?', username)
  const user = getUser(username)
  if (user.status === STATUS.DELEGATED && user.delegatedAt && Date.now() > user.delegatedAt + parseFloat(config.delegationLength) * 86400 * 1000) {
    return true
  } else {
    return false
  }
}

// --- Manipulations ---

async function notify(receiver, message) {
  await sendMessage(process.env.ACTIVE_KEY, config.delegationAccount, receiver, message)
}

async function notifyUser (user, message) {
  if (isTrue(config.notifyUser)) {
    await notify(user, message)
  }
}

async function notifyAdmin(message) {
  await notify(config.adminAccount, message)
}

async function delegateToUser(username) {
  // delegate to user, when
  // 1. user has little RC
  // 2. user has low Hive Power (own + received delegation) < maxUserHP
  // 3. default beneficiary setting is not removed
  // 4. user is not muted
  // 5. we have not delegated to the user before
  console.log(`may delegate to @${username}`)
  if (!await isMuted(username) && !await hasEnoughHP(username)
    && await hasNoRC(username) && !await hasDelegatedTo(username)
    && (!isTrue(config.beneficiaryRemoval) || await hasSetBeneficiary(username)))
  {
    console.log(`delegate ${config.delegationAmount} HP to @${username}`)
    try {
      await delegatePower(process.env.ACTIVE_KEY, config.delegationAccount, username, parseFloat(config.delegationAmount))
    } catch(e) {
        // #10 if delegation process fail, notify the admin account
      notifyAdmin(`Delegation Manager: failed to delegate Hive Power to @${username}. Error = ${e.message}`)
    }

    const user = getUser(username)
    user.status = STATUS.DELEGATED
    user.delegatedAt = Date.now()
    user.delegationAmount = parseFloat(config.delegationAmount)
    updateUser(user)
  }
}

async function removeDelegationIfNeeded (username) {
  const user = getUser(username)
  if (!user) {
    console.log(`\tuser @${username} not found. cannot remove delegation.`)
    return
  }

  async function removeDelegation(status, message) {
    await delegatePower(process.env.ACTIVE_KEY, config.delegationAccount, username, 0)
    user.status = status
    user.delegationRemovedAt = Date.now()
    updateUser(user)
    console.log(`\tremoved delegation to @${username}; changed status to ${status}`)
    await notifyUser(username, message)
  }

  // console.log(`do we need to remove delegation to @${username} ?`)

  // remove delegation to the user, when
  // 1. user has enough Hive Power (own + received delegation)
  // 2. user is muted
  // 3. delegation length exceeds defined cycle
  // 4. default beneficiary setting is removed
  if (await hasEnoughHP(username)) {
    await removeDelegation(STATUS.GRADUATED, config.delegationMaxMsg)
  } else if (await isMuted(username)) {
    await removeDelegation(STATUS.MUTED, config.delegationMuteMsg)
  } else if (await hasExceededDelegatinLength(username)) {
    await removeDelegation(STATUS.EXPIRED, config.delegationLengthMsg)
  } else if (isTrue(config.beneficiaryRemoval) && !await hasSetBeneficiary(username)) {
    await removeDelegation(STATUS.BENEFICIARY_REMOVED, config.delegationBeneficiaryMsg)
  } else {
    console.log(`\tkeep the delegation to @${username}`)
  }
}

// --- Monitoring Services ---

async function monitorNewAndInactiveUsers() {
  // stream operations
  console.log('#1 monitoring new and inactive referred users')
  await streamOperations([whenReferredUserCreated, whenReferredUserTakeActions], {
    from: 46146671
    // block 46146673 (@leo.ryan20 performs custom_json)
    // block 45977166 (@leo.ryan20 account is created)
  })
  console.log('stream operations ended')
}

async function monitorDelegatedUsers() {
  console.log('#2 monitoring delegated users status')
  const job = async () => {
    // check delegated users status
    const users = await getDelegatedUsers()
    console.log(`we have delegated to ${users.length} users`, users)
    if (users.length > 0) {
      await Promise.all(users.map(u => removeDelegationIfNeeded(u)))
      console.log('check delegated users status: DONE')
    }
  }
  job()
  setInterval(job, parseFloat(config.checkCycleMins) * 60 * 1000)
}

async function monitorDelegatorAccountHP() {
  console.log('#3 monitoring delegator account status')
  const job = async () => {
    // #9 if the delegator account has no enough HP, send warning to the admin account
    const hp = await delegatablePower(config.delegationAccount)
    const hpWarning = parseFloat(config.hpWarning)
    if (hpWarning >= 0 && hp < hpWarning) {
      // send warning
      console.log(`The delegator @${config.delegationAccount} has no sufficient HP: ${hp.toFixed(3)} HP`)
      notifyAdmin(`Delegation Manager: The delegator @${config.delegationAccount} need more HP to continue supporting new users via delegation. The delegator has only ${hp.toFixed(3)} now`)
    } else {
      console.log(`The delegator @${config.delegationAccount} has sufficient HP: ${hp.toFixed(3)} HP`)
    }
  }
  job()
  setInterval(job, 8 * 3600 * 1000) // every 8 hours
}

// ---  Main ---

async function main() {
  referredUsers = await readReferredUsers()
  saveReferredUsers(referredUsers)
  await updateDelegations()
  setInterval(updateDelegations, 120 * 1000) // query delegations every 2 mins

  await Promise.all([
    monitorNewAndInactiveUsers(),
    monitorDelegatedUsers(),
    monitorDelegatorAccountHP()
  ])
}

main()
