// implement the delegation manager according to the description in the post:
//

import fs from 'fs'
import config from '../config' // #1 load config
import { getReferredAccounts } from './hiveonboard'

async function readReferredUsers() {

  // #2.1 read referred users from hiveonboard api
  const accounts = await getReferredAccounts(config.delegationAccount)
  console.log('accounts', accounts)

  if (fs.existsSync('../users.json')) {
    const users = require('../users.json')
  }

}

async function saveToReferredUsers() {
  // #3 save referred accounts into file

  // '../users.json'
}

async function removeFromReferredUsers() {

}

async function delegateToUser() {
   // #10 if delegation process fail, notify the admin account
}

async function streamBlocks() {
  // listen to stream blocks with one thread

  // #2.2 streaming blocks and listen to account creation

  // #5 listen to account activities, and delegate to the user if RC is less than minimum needs
}

async function pollingStatus() {

  // #4 if muted (check muted accounts), remove delegation, and remove from referred accounts

  // #6 if delegation exceeds defined cycle, remove delegation

  // #7 if dafault beneficiary settings is removed by user, remove delegation

  // #8 if effective SP of user is enough, remove delegation

  // #9 if the delegator account has no enough HP, send warning to the admin account

}

async function main() {
  const referredUsers = await readReferredUsers()

  await Promise.all([
    () => streamBlocks(referredUsers),
    () => pollingStatus(referredUsers)
  ])

}

main()
