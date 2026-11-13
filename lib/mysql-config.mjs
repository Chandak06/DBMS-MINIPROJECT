import {readFileSync} from "node:fs";

// Shared by the Next.js pool, reference seed and every CLI connection.
export function mysqlConnectionOptions(withDatabase=true,env=process.env){
 const port=Number(env.MYSQL_PORT||3306),database=env.MYSQL_DATABASE||"campus_lost_found";
 const invalid=(message)=>{throw Object.assign(new Error(message),{code:"MYSQL_CONFIG_ERROR"});};
 if(!Number.isInteger(port)||port<1||port>65535)invalid("MYSQL_PORT must be a valid TCP port.");
 if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(database))invalid("MYSQL_DATABASE must be a simple SQL identifier.");
 const host=env.MYSQL_HOST||"127.0.0.1";
 if(!/^[a-zA-Z0-9.:[\]_-]+$/.test(host))invalid("MYSQL_HOST must be a hostname or IP, without a URL or credentials.");
 const mode=String(env.MYSQL_SSL||"false").toLowerCase();
 if(!["true","false"].includes(mode))invalid("MYSQL_SSL must be true or false.");
 let ssl;
 if(mode==="true"||env.MYSQL_SSL_CA_FILE){
  ssl={rejectUnauthorized:true,verifyIdentity:true,minVersion:"TLSv1.2"};
  if(env.MYSQL_SSL_CA_FILE){try{ssl.ca=readFileSync(env.MYSQL_SSL_CA_FILE);}catch{invalid("Cannot read MYSQL_SSL_CA_FILE. Check the private certificate path.");}}
 }
 return {host,port,user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,...(withDatabase?{database}:{}),
  timezone:"+00:00",dateStrings:true,connectTimeout:10000,enableKeepAlive:true,...(ssl?{ssl}:{})};
}
