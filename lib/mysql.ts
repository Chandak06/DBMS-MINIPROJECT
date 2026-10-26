import mysql from "mysql2/promise";

const globalForMySQL = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};
const port=Number(process.env.MYSQL_PORT??3306);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error("MYSQL_PORT must be a valid TCP port");
if(!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(process.env.MYSQL_DATABASE??"campus_lost_found"))throw new Error("MYSQL_DATABASE must be a simple SQL identifier");

export const mysqlPool =
  globalForMySQL.mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE ?? "campus_lost_found",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "+00:00",
    connectTimeout: 5000,
    dateStrings: true
  });

if (!globalForMySQL.mysqlPool) {
  mysqlPool.on("connection", connection => connection.query("SET time_zone = '+00:00'"));
}

if (process.env.NODE_ENV !== "production") {
  globalForMySQL.mysqlPool = mysqlPool;
}

