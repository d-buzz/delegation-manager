import fs from 'fs'
import config from '../config' // #1 load config
import { getReferredAccounts } from './hiveonboard'

const userDataFile = 'users.json'

export async function readReferredUsers() {
  // #2.1 read referred users from hiveonboard api
  const users = await getReferredAccounts(config.delegationAccount)
  let usersMap = {}
  for (let user of users) {
    usersMap[user.account] = user
  }
  usersMap = { ...usersMap, ...(loadReferredUsers()) }
  return usersMap
}

function loadReferredUsers() {
  let users = {}
  if (fs.existsSync(userDataFile)) {
    users = JSON.parse(fs.readFileSync(userDataFile))
  }
  return users
}

export async function saveReferredUsers(users) {
  // #3 save referred accounts into file
  fs.writeFileSync(userDataFile, JSON.stringify(users))
  console.log('saved user data to', userDataFile)
}

export async function addToReferredUsers(users) {
  let usersMap = {}
  for (let user of users) {
    usersMap[user.account] = user
  }
  const newUsers = { ...(loadReferredUsers()), ...usersMap }
  saveReferredUsers(newUsers)
  return newUsers
}

async function removeFromReferredUsers() {

}
