import axios from 'axios'

const STEP = 100

async function callHiveOnBoardApi(referrer, offset) {
  const url = `https://hiveonboard.com/api/referrer/${referrer}?limit=${STEP}&offset=${offset}`
  try{
    const { data } = await axios.get(url)
    console.log('get data', data)
    return data
  } catch(e) {
    console.log('retry calling hiveonboard api', url, e.message)
    const data = await callHiveOnBoardApi(referrer, offset)
    return data
  }
}

export async function getReferredAccounts(referrer) {
  const accounts = []
  let offset = 0
  let data = []
  do {
    data = await callHiveOnBoardApi(referrer, offset)
    if (data && data.length > 0) {
      accounts = accounts.concat(data)
      offset += STEP
    }
  } while (data && data.length > 0)
  return accounts
}
