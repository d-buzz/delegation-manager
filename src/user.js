import fs from 'fs'
import config from '../config' // #1 load config
import { getReferredAccounts } from './hiveonboard'

const userDataFile = 'users.json'

// user status: { inactive, delegated, muted, expired, beneficiary_removed, graduated }
export const STATUS = {
  INACTIVE: 'inactive', // default
  DELEGATED: 'delegated',
  MUTED: 'muted',
  EXPIRED: 'expired',
  BENEFICIARY_REMOVED: 'beneficiary_removed',
  GRADUATED: 'graduated'
}

export async function readReferredUsers() {
  // #2.1 read referred users from hiveonboard api
  const users = await getReferredAccounts(config.delegationAccount)
  let usersMap = {}
  for (let user of users) {
    usersMap[user.account] = user
  }
  const loaded = loadReferredUsers()
  usersMap = { ...usersMap, ...loaded }
  return usersMap
}

function loadReferredUsers() {
  let users = {}
  if (fs.existsSync(userDataFile)) {
    const text = fs.readFileSync(userDataFile)
    if (text && text.length > 0) {
      users = JSON.parse(text)
    }
  }
  return users
}

export function saveReferredUsers(users) {
  // #3 save referred accounts into file
  fs.writeFileSync(userDataFile, JSON.stringify(users, null, 2))
  console.log('saved user data to', userDataFile)
}

export function addToReferredUsers(users) {
  let usersMap = {}
  for (let user of users) {
    usersMap[user.account] = user
  }
  const loaded = loadReferredUsers()
  const newUsers = { ...loaded, ...usersMap }
  saveReferredUsers(newUsers)
  return newUsers
}
