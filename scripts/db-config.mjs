import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import {mysqlConnectionOptions} from "../lib/mysql-config.mjs";
export const sqlDatabase = mysqlConnectionOptions().database;
export const mongoDatabase = process.env.MONGODB_DATABASE || "campus_lost_found";
export {mysqlConnectionOptions as sqlConnectionOptions};
export async function createSqlConnection(withDatabase=true) {
 const connection=await mysql.createConnection(mysqlConnectionOptions(withDatabase));
 try{await connection.query("SET time_zone = '+00:00'");}catch(error){await connection.end();throw error;}
 return connection;
}
export function createMongoClient() { return new MongoClient(process.env.MONGODB_URI||"mongodb://127.0.0.1:27017",{serverSelectionTimeoutMS:5000,connectTimeoutMS:5000,socketTimeoutMS:10000}); }

