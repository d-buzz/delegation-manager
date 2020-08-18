import dHiveClient from './dhive'

export async function streamOperations(callbacks, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = dHiveClient.blockchain.getOperationsStream(options)
    stream.on('data', (op) => {
      if (callbacks && callbacks.length > 0) {
        callbacks.forEach(callback => {
          callback(op)
        })
      }
    })
  })
}

export function getOperationPerformer(op) {
  const name = op.op[0]
  const params = op.op[1]
  switch (name) {
    case 'vote':
      return params.voter
    case 'comment':
      return params.author
    case 'transfer':
      return params.from
    case 'custom_json':
      if (params.required_auths && params.required_auths.length > 0) {
        return params.required_auths[0]
      } else if (params.required_posting_auths && params.required_posting_auths.length > 0) {
        return params.required_posting_auths[0]
      } else {
        return null
      }
    default:
      return null
  }
}
