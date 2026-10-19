import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
export const sqlDatabase = process.env.MYSQL_DATABASE || "campus_lost_found";
export const mongoDatabase = process.env.MONGODB_DATABASE || "campus_lost_found";
if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sqlDatabase)) throw new Error("MYSQL_DATABASE must be a simple SQL identifier");
export function sqlConnectionOptions(withDatabase=true) {
  return { host:process.env.MYSQL_HOST||"127.0.0.1",port:Number(process.env.MYSQL_PORT||3306),
    user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,
    ...(withDatabase?{database:sqlDatabase}:{}), timezone:"+00:00",dateStrings:true,connectTimeout:5000 };
}
export async function createSqlConnection(withDatabase=true) {
 const connection=await mysql.createConnection(sqlConnectionOptions(withDatabase));
 await connection.query("SET time_zone = '+00:00'");
 return connection;
}
export function createMongoClient() { return new MongoClient(process.env.MONGODB_URI||"mongodb://127.0.0.1:27017",{serverSelectionTimeoutMS:5000}); }

