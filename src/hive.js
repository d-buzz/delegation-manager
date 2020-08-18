import hiveClient from '@hiveio/hive-js'
import { API_URL } from './config'

hiveClient.api.setOptions({ url: API_URL })

export default hiveClient
