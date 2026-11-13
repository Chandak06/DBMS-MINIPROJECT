import mysql from "mysql2/promise";
import {mysqlConnectionOptions} from "./mysql-config.mjs";

const globalForMySQL = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const mysqlPool =
  globalForMySQL.mysqlPool ??
  mysql.createPool({
    ...mysqlConnectionOptions(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 50,
    maxIdle: 5,
    idleTimeout: 60000
  });

if (!globalForMySQL.mysqlPool) {
  mysqlPool.on("connection", connection => connection.query("SET time_zone = '+00:00'"));
}

if (process.env.NODE_ENV !== "production") {
  globalForMySQL.mysqlPool = mysqlPool;
}

