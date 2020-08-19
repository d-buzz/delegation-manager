import axios from 'axios'

const STEP = 100

async function callHiveOnBoardApi(referrer, offset) {
  const url = `https://hiveonboard.com/api/referrer/${referrer}?limit=${STEP}&offset=${offset}`
  console.log('call HiveOnBoard API', url)
  try{
    const { data } = await axios.get(url)
    return data.items
  } catch(e) {
    console.log('retry calling hiveonboard api', url, e.message)
    const items = await callHiveOnBoardApi(referrer, offset)
    return items
  }
}

export async function getReferredAccounts(referrer) {
  let accounts = []
  let offset = 0
  let data = []
  let saved = []
  let fetched = false
  do {
    data = await callHiveOnBoardApi(referrer, offset)
    fetched = data && data.length > 0 && (saved.length === 0 || data[0].account !== saved[0].account)
    if (fetched) {
      accounts = accounts.concat(data)
      offset += STEP
      saved = data.concat()
    }
  } while (fetched)
  return accounts
}
