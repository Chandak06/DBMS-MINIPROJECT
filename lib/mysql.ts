import mysql from "mysql2/promise";

const globalForMySQL = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const mysqlPool =
  globalForMySQL.mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
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

