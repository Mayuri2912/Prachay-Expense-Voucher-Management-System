// Creates the database, the tables and the demo data.
//
//   npm run db:setup    first-time setup (refuses to run if the tables already exist)
//   npm run db:reset    wipes ALL vouchers and users, then reloads the demo data
//
// It simply executes database/schema.sql and database/seed.sql using the
// connection details from .env, so the "mysql" command line tool is not needed.

import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { runSqlFile } from './sqlRunner.js';

const reset = process.argv.includes('--reset');

async function tablesAlreadyExist(connection) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
       FROM information_schema.tables
      WHERE table_schema = ? AND table_name = 'vouchers'`,
    [env.db.name]
  );
  return rows[0].count > 0;
}

// Uploaded signature files belong to vouchers that a reset deletes, so remove them too.
async function clearUploadedSignatures() {
  const folder = path.join(env.uploadDir, 'signatures');
  const files = await fs.readdir(folder).catch(() => []);
  for (const file of files) {
    if (file !== '.gitkeep') {
      await fs.rm(path.join(folder, file), { force: true });
    }
  }
}

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      multipleStatements: true, // the .sql files contain many statements
    });
  } catch (error) {
    console.error(`\nCould not connect to MySQL at ${env.db.host}:${env.db.port} as "${env.db.user}".`);
    console.error(`Reason: ${error.message}`);
    console.error('Check that MySQL is running and that DB_USER / DB_PASSWORD in .env are correct.\n');
    process.exit(1);
  }

  try {
    if (!reset && (await tablesAlreadyExist(connection))) {
      console.log(`\nDatabase "${env.db.name}" is already set up - nothing was changed.`);
      console.log('To wipe all data and reload the demo data, run:  npm run db:reset\n');
      return;
    }

    console.log(`\nCreating tables in "${env.db.name}" (database/schema.sql) ...`);
    await runSqlFile(connection, 'schema.sql', env.db.name);

    console.log('Loading demo users and vouchers (database/seed.sql) ...');
    await runSqlFile(connection, 'seed.sql', env.db.name);

    if (reset) {
      await clearUploadedSignatures();
    }

    const [[users]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${env.db.name}\`.users`);
    const [[vouchers]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${env.db.name}\`.vouchers`);

    console.log(`\nDone: ${users.count} demo users and ${vouchers.count} demo vouchers are ready.`);
    console.log('The demo login details are listed in README.md (section "Demo login credentials").\n');
  } catch (error) {
    console.error(`\nDatabase setup failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main();
