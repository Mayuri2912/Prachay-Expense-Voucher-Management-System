// Loads the .env file and exposes the settings as one typed object.
// Every other file imports `env` from here instead of reading process.env directly.

import path from 'node:path';
import dotenv from 'dotenv';

// The single .env file lives in the project root: /server/src/config -> three folders up.
export const projectRoot = path.resolve(import.meta.dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env in the project root and fill it in.`
    );
  }
  return value.trim();
}

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long. See .env.example for how to generate one.');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,

  // Browser origins that are allowed to call this API (comma separated in .env).
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    name: required('DB_NAME'),
  },

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  // Signature uploads.
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(projectRoot, 'server', 'uploads'),
  maxSignatureSizeMb: Number(process.env.MAX_SIGNATURE_SIZE_MB) || 2,

  // The office time zone. Used to decide what "today" means on the dashboards.
  timezoneOffset: process.env.APP_TIMEZONE_OFFSET || '+05:30',
};
