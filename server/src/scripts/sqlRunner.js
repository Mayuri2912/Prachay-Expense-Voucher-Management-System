// Runs one of the .sql files from the /database folder.
// Shared by the setup script and by the automated tests.

import fs from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from '../config/env.js';

// The name written inside schema.sql and seed.sql.
export const DEFAULT_DATABASE_NAME = 'prachay_expense_vouchers';

// `connection` must have been opened with { multipleStatements: true }.
export async function runSqlFile(connection, fileName, databaseName) {
  // The name ends up inside SQL text, so only simple names are allowed.
  if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
    throw new Error(`DB_NAME "${databaseName}" may only contain letters, numbers and underscores.`);
  }

  let sql = await fs.readFile(path.join(projectRoot, 'database', fileName), 'utf8');

  // If .env uses a different DB_NAME (the tests do), swap the name in the script.
  if (databaseName !== DEFAULT_DATABASE_NAME) {
    sql = sql.replaceAll(DEFAULT_DATABASE_NAME, databaseName);
  }

  await connection.query(sql);
}
