import type {ConnectionOptions} from "mysql2";
export function mysqlConnectionOptions(withDatabase?:boolean,env?:Record<string,string|undefined>):ConnectionOptions;
