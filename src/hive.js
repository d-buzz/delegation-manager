import hiveClient from '@hiveio/hive-js'
import { API_URLS } from './config'

hiveClient.api.setOptions({ url: API_URLS[0] })

export default hiveClient
