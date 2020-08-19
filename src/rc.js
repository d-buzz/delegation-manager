// reference: beem's implementation: https://steemit.com/steem/@steemitdev/developer-guide-resource-credit-system
// beem/blockchaininstance.py
// beem/rc.py

import dHiveClient from './dhive'
import { RCAPI } from '@hiveio/dhive'
import { STATE_OBJECT_SIZE_INFO, RESOURCE_EXECUTION_TIME, STEEM_RC_REGEN_TIME, STEEM_BLOCK_INTERVAL } from './constants'

// Returns the RC costs based on the resource_count
export async function getRcCost (resource_count) {
  const rcApi = new RCAPI(dHiveClient);
  const pools = await rcApi.getResourcePool()
  const params = await rcApi.getResourceParams()
  const dyn_param = await dHiveClient.database.getDynamicGlobalProperties();
  const rc_regen = parseFloat(dyn_param["total_vesting_shares"]) * (10 ** 6) / (STEEM_RC_REGEN_TIME / STEEM_BLOCK_INTERVAL)
  let total_cost = 0
  if (rc_regen === 0) {
    return total_cost
  }
  for (let resource_type in resource_count) {
    const curve_params = params[resource_type]["price_curve_params"]
    const current_pool = parseInt(pools[resource_type]["pool"])
    let count = resource_count[resource_type]
    count *= params[resource_type]["resource_dynamics_params"]["resource_unit"]
    const cost = _compute_rc_cost(curve_params, current_pool, count, rc_regen)
    total_cost += cost
  }
  return total_cost
}

// Helper function for computing the RC costs
function _compute_rc_cost(curve_params, current_pool, resource_count, rc_regen) {
  let num = parseInt(rc_regen)
  num *= parseInt(curve_params['coeff_a'])
  num = parseInt(BigInt(num) >> BigInt(curve_params['shift']))
  num += 1
  num *= parseInt(resource_count)
  let denom = parseInt(curve_params['coeff_b'])
  if (parseInt(current_pool) > 0) {
    denom += parseInt(current_pool)
  }
  const num_denom = num / denom
  return parseInt(num_denom) + 1
}

// reates the resource_count dictionary based on tx_size, state_bytes_count,
// new_account_op_count and market_op_count
function getResourceCount(tx_size, execution_time_count, state_bytes_count = 0, new_account_op_count = 0, market_op_count = 0) {
  const resource_count = { "resource_history_bytes": tx_size }
  resource_count["resource_state_bytes"] = STATE_OBJECT_SIZE_INFO["transaction_object_base_size"]
  resource_count["resource_state_bytes"] += STATE_OBJECT_SIZE_INFO["transaction_object_byte_size"] * tx_size
  resource_count["resource_state_bytes"] += state_bytes_count
  resource_count["resource_new_accounts"] = new_account_op_count
  resource_count["resource_execution_time"] = execution_time_count
  if (market_op_count > 0) {
    resource_count["resource_market_bytes"] = tx_size
  }
  return resource_count
}

// Calc RC for a comment
export async function estimateCommentRC(tx_size = 1000, permlink_length = 10, parent_permlink_length = 10) {
  let state_bytes_count = STATE_OBJECT_SIZE_INFO["comment_object_base_size"]
  state_bytes_count += STATE_OBJECT_SIZE_INFO["comment_object_permlink_char_size"] * permlink_length
  state_bytes_count += STATE_OBJECT_SIZE_INFO["comment_object_parent_permlink_char_size"] * parent_permlink_length
  const execution_time_count = RESOURCE_EXECUTION_TIME["comment_operation_exec_time"]
  const resource_count = getResourceCount(tx_size, execution_time_count, state_bytes_count)
  return await getRcCost(resource_count)
}
