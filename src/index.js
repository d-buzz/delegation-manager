// implement the delegation manager according to the description in the post:
//

import config from '../config' // #1 load config
import { streamOperations, getOperationPerformer } from './operation'
import { readReferredUsers, saveReferredUsers, addToReferredUsers } from './user'

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
    let jsonMetadata = account.json_metadata
    if (jsonMetadata) {
      jsonMetadata = JSON.parse(jsonMetadata)
      const beneficiaries = jsonMetadata.beneficiaries
      if (beneficiaries && beneficiaries.length > 0) {
        const referred = beneficiaries.filter(b => b.name === config.delegationAccount)
        if (referred && referred.length > 0 && referred[0].label === 'referrer') {
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

async function delegateToUser(username) {
  // delegate to user, when
  // 1. user has little RC
  // 2. user has low Hive Power (own + received delegation)
  // 3. user is not muted
  // 4. we have not delegated to the user before
  // 5. default beneficiary setting is not removed
  console.log('delegate to', username)

  // #10 if delegation process fail, notify the admin account
}

async function removeDelegationIfNeeded(username) {
  // delegate to user, when
  // 1. user has enough Hive Power (own + received delegation)
  // 2. user is muted
  // 3. delegation length exceeds defined cycle
  // 4. default beneficiary setting is removed
  console.log('remove delegation to', username)

  // #10 if delegation process fail, notify the admin account
}

async function checkDelegatorAccountHP() {
  // #9 if the delegator account has no enough HP, send warning to the admin account
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
