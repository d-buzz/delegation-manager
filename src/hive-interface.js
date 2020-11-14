import { Hive } from "@splinterlands/hive-interface"
import { API_URLS } from './config'

const hive = new Hive({ rpc_error_limit: 5 }, { rpc_nodes: API_URLS });

export default hive
