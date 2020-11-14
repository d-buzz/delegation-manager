import hiveClient from './hive'
import dHiveClient from './dhive'
import axios from 'axios'
import { SCOT_API_HOST, HIVE_ENGINE_API_HOST } from './config'
import { parseNumber } from './helper'
import { PrivateKey } from '@hiveio/dhive'

export async function getAccount(account) {
  return new Promise((resolve, reject) => {
    hiveClient.api.getAccounts([account], function (err, res) {
      if (err) {
        reject(err)
      } else {
        if (res && res.length > 0) {
          resolve(res[0])
        } else {
          resolve({})
        }
      }
    });
  })
}

export async function getAccountInfo(account, token) {
  const url = `${SCOT_API_HOST}/@${account}?token=${token}&hive=1`
  const { data }  = await axios.get(url)
  return data[token]
}

export async function getAccountBalance(account, token) {
  const url = HIVE_ENGINE_API_HOST
  const params = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "find",
    "params": {
      "contract": "tokens",
      "table": "balances",
      "query": { "account": account },
      "limit": 1000,
      "offset": 0,
      "indexes": []
    }
  }
  const { data } = await axios.post(url, params)
  const token_balances = data.result.filter(d => d.symbol === token)
  if (token_balances && token_balances.length > 0) {
    return token_balances[0]
  } else {
    return {}
  }
}

export async function getMutedAccounts(account, limit = 200) {
  return new Promise((resolve, reject) => {
    hiveClient.api.getFollowing(account, '', 'ignore', limit, function (err, res) {
      if (err) {
        reject(err)
      } else {
        const accounts = res.map(a => a.following)
        // console.log(`${accounts.length} accounts are muted by @${account}`, accounts)
        resolve(accounts)
      }
    });
  })
}

export async function claimTokenRewards(wif, account, token) {
  const json = [{ symbol: token }]
  return new Promise((resolve, reject) => {
    hiveClient.broadcast.customJson(wif, [], [account], 'scot_claim_token', JSON.stringify(json), function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    });
  })
}

export async function claimRewards(wif, account) {
  const info = await getAccount(account)
  return new Promise((resolve, reject) => {
    if (parseNumber(info.reward_hive_balance) > 0
      || parseNumber(info.reward_hbd_balance) > 0
      || parseNumber(info.reward_vesting_balance) > 0
    ) {
      console.log(`Claim rewards for @${account}:`,
        info.reward_hive_balance,
        info.reward_hbd_balance,
        info.reward_vesting_balance
      )
      hiveClient.broadcast.claimRewardBalance(wif, account, info.reward_hive_balance, info.reward_hbd_balance, info.reward_vesting_balance, function (err, res) {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      });
    } else {
      console.log(`No rewards to claim for @${account}:`,
        info.reward_hive_balance,
        info.reward_hbd_balance,
        info.reward_vesting_balance
      )
      resolve('no rewards to claim')
    }
  })
}

export async function getAccountRC(username) {
  return new Promise((resolve, reject) => {
    hiveClient.api.call(
      'rc_api.find_rc_accounts',
      { accounts: [username] },
      function (err, res) {
        if (err) {
          reject(err)
        } else {
          if (res.rc_accounts && res.rc_accounts.length > 0) {
            const rc = res.rc_accounts[0]
            const CURRENT_UNIX_TIMESTAMP = parseInt((Date.now() / 1000).toFixed(0))
            const elapsed = CURRENT_UNIX_TIMESTAMP - rc.rc_manabar.last_update_time
            const maxMana = rc.max_rc
            //calculate current mana for the 5 day period (432000 sec = 5 days)
            let currentMana = parseFloat(rc.rc_manabar.current_mana) + (elapsed * maxMana) / 432000
            if (currentMana > maxMana) {
              currentMana = maxMana
            }
            resolve(currentMana)
          } else {
            resolve(null)
          }
        }
      }
    )
  })
}

export async function delegatablePower(username) {
  const account = await getAccount(username)
  const avail = parseFloat(account.vesting_shares) - (parseFloat(account.to_withdraw) - parseFloat(account.withdrawn)) / 1e6 - parseFloat(account.delegated_vesting_shares);

  const props = await dHiveClient.database.getDynamicGlobalProperties();
  const vestSteem = parseFloat(parseFloat(props.total_vesting_fund_hive) *
    (parseFloat(avail) / parseFloat(props.total_vesting_shares)), 6);
  return vestSteem
}

export async function usablePower(username) {
  const account = await getAccount(username)
  const avail = parseFloat(account.vesting_shares) + parseFloat(account.received_vesting_shares);

  const props = await dHiveClient.database.getDynamicGlobalProperties();
  const vestSteem = parseFloat(parseFloat(props.total_vesting_fund_hive) *
    (parseFloat(avail) / parseFloat(props.total_vesting_shares)), 6);
  return vestSteem
}

export async function ownedPower(username) {
  const account = await getAccount(username)
  const avail = parseFloat(account.vesting_shares)

  const props = await dHiveClient.database.getDynamicGlobalProperties();
  const vestSteem = parseFloat(parseFloat(props.total_vesting_fund_hive) *
    (parseFloat(avail) / parseFloat(props.total_vesting_shares)), 6);
  return vestSteem
}


export function hasBeneficiarySetting(account, referrer) {
  let jsonMetadata = account.json_metadata
  if (jsonMetadata) {
    jsonMetadata = JSON.parse(jsonMetadata)
    const beneficiaries = jsonMetadata.beneficiaries
    if (beneficiaries && beneficiaries.length > 0) {
      const referred = beneficiaries.filter(b => b.name === referrer)
      if (referred && referred.length > 0 && referred[0].label === 'referrer') {
        return true
      }
    }
  }
  return false
}

export async function delegatePower(wif, username, receiver, hp) {
  const account = await getAccount(username)
  const avail = parseFloat(account.vesting_shares) -
    (parseFloat(account.to_withdraw) -
      parseFloat(account.withdrawn)) /
    1e6 -
    parseFloat(account.delegated_vesting_shares);
  const props = await dHiveClient.database.getDynamicGlobalProperties();
  const vesting_shares = parseFloat(hp * parseFloat(props.total_vesting_shares) / parseFloat(props.total_vesting_fund_hive));
  if (avail > vesting_shares) {
    const ops = [[
      'delegate_vesting_shares',
      {
        delegator: username,
        delegatee: receiver,
        vesting_shares: Number(vesting_shares).toFixed(6) + ' VESTS'
      }
    ]];
    wif = PrivateKey.fromString(wif)
    dHiveClient.broadcast.sendOperations(ops, wif)
  } else {
    console.log('no enough Hiver Power for delegation')
  }
}

export async function sendMessage(wif, from, to, message) {
  // transfer
  await dHiveClient.broadcast.transfer({
    from,
    to,
    amount: '0.001 HIVE',
    memo: message
  }, PrivateKey.fromString(wif))
}

export async function getOutgoingDelegations(delegator) {
  const data = await dHiveClient.database.getVestingDelegations(delegator, "", 100)
  const props = await dHiveClient.database.getDynamicGlobalProperties();
  data.forEach(d => {
    d.hive_power = parseFloat(parseFloat(props.total_vesting_fund_hive) *
      (parseFloat(d.vesting_shares) / parseFloat(props.total_vesting_shares)), 6);
  })
  return data
}
