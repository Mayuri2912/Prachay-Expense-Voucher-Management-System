// Entry point: check the database connection, then start listening.

import app from './app.js';
import { pool } from './config/db.js';
import { env } from './config/env.js';

// Translates the most common MySQL start-up failures into plain advice.
function explainDatabaseError(error) {
  switch (error.code) {
    case 'ECONNREFUSED':
      return `Could not reach MySQL at ${env.db.host}:${env.db.port}. Is the MySQL service running?`;
    case 'ER_ACCESS_DENIED_ERROR':
      return 'MySQL rejected the login. Check DB_USER and DB_PASSWORD in the .env file.';
    case 'ER_BAD_DB_ERROR':
      return `Database "${env.db.name}" does not exist yet. Run "npm run db:setup" from the project root.`;
    case 'ER_NO_SUCH_TABLE':
      return 'The tables are missing. Run "npm run db:setup" from the project root.';
    default:
      return error.message;
  }
}

async function start() {
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
  } catch (error) {
    console.error(`\n[startup] Database check failed: ${explainDatabaseError(error)}\n`);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[startup] API running at http://localhost:${env.port}/api  (${env.nodeEnv})`);
    console.log(`[startup] Allowed frontend origin(s): ${env.clientOrigins.join(', ')}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n[startup] Port ${env.port} is already in use. Stop the other program or change PORT in .env.\n`);
    } else {
      console.error('[startup]', error);
    }
    process.exit(1);
  });

  // Ctrl+C: stop accepting requests, then close the database connections.
  process.on('SIGINT', () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}

start();
