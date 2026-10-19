import type { PoolConnection } from "mysql2/promise";
import { mysqlPool } from "./mysql";
export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>) {
  const connection = await mysqlPool.getConnection();
  try { await connection.beginTransaction(); const result = await work(connection); await connection.commit(); return result; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
