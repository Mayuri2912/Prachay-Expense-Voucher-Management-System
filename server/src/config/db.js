// MySQL connection pool shared by the whole backend.

import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z', // read and write TIMESTAMP values as UTC
  dateStrings: ['DATE'], // plain DATE columns come back as 'YYYY-MM-DD' strings (no time zone shifting)
});

// Each new connection is told to use UTC, so NOW() and CURRENT_TIMESTAMP are UTC as well.
// Together with `timezone: 'Z'` above this keeps every stored timestamp consistent.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

// Runs several queries as one all-or-nothing unit.
// `work` receives a connection; if it throws, everything it did is rolled back.
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
