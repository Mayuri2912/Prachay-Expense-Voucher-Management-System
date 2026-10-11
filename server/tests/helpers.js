// Test helpers: build a throw-away test database, start the API on a free port,
// and offer small functions for calling it.
//
// SAFETY: the tests never touch the real database. They always use a separate
// database whose name is DB_NAME + "_test" (for example prachay_expense_vouchers_test)
// and a temporary uploads folder that is deleted afterwards.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const projectRoot = path.resolve(import.meta.dirname, '../..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

// These must be set BEFORE the application code is imported (it reads them on import).
process.env.NODE_ENV = 'test';
process.env.DB_NAME = `${process.env.DB_NAME || 'prachay_expense_vouchers'}_test`;
process.env.APP_TIMEZONE_OFFSET = '+05:30';
process.env.MAX_SIGNATURE_SIZE_MB = '2';
process.env.UPLOAD_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'voucher-test-uploads-'));
process.env.JWT_SECRET ||= 'test-only-secret-that-is-at-least-32-characters-long';

export const TEST_PASSWORD = 'Test@12345';

// Known users for the tests. The ids match the insert order below.
export const USERS = {
  alice: { id: 1, email: 'alice@test.local', role: 'EMPLOYEE', name: 'Alice Employee' },
  bob: { id: 2, email: 'bob@test.local', role: 'EMPLOYEE', name: 'Bob Employee' },
  dana: { id: 3, email: 'dana@test.local', role: 'DIRECTOR', name: 'Dana Director' },
  ajay: { id: 4, email: 'ajay@test.local', role: 'ACCOUNTS', name: 'Ajay Accounts' },
  ivan: { id: 5, email: 'ivan@test.local', role: 'EMPLOYEE', name: 'Ivan Inactive' }, // disabled account
};

let server;
let pool;
let baseUrl;

export async function startTestApp() {
  const databaseName = process.env.DB_NAME;
  if (!databaseName.endsWith('_test')) {
    throw new Error('Refusing to run: the test database name must end with "_test".');
  }

  // Imported here (not at the top) so the environment variables above are already in place.
  const { runSqlFile } = await import('../src/scripts/sqlRunner.js');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    multipleStatements: true,
  });

  // Fresh, empty tables for every test run (schema.sql drops and re-creates them).
  await runSqlFile(connection, 'schema.sql', databaseName);

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4); // low cost = fast tests
  await connection.query(
    `INSERT INTO \`${databaseName}\`.users (id, full_name, email, password_hash, role, employee_code, department, is_active)
     VALUES ?`,
    [
      [
        [1, USERS.alice.name, USERS.alice.email, passwordHash, 'EMPLOYEE', 'T-001', 'Sales', 1],
        [2, USERS.bob.name, USERS.bob.email, passwordHash, 'EMPLOYEE', 'T-002', 'Operations', 1],
        [3, USERS.dana.name, USERS.dana.email, passwordHash, 'DIRECTOR', 'T-003', 'Administration', 1],
        [4, USERS.ajay.name, USERS.ajay.email, passwordHash, 'ACCOUNTS', 'T-004', 'Finance', 1],
        [5, USERS.ivan.name, USERS.ivan.email, passwordHash, 'EMPLOYEE', 'T-005', 'Sales', 0],
      ],
    ]
  );
  await connection.end();

  const { default: app } = await import('../src/app.js');
  ({ pool } = await import('../src/config/db.js'));

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve); // port 0 = any free port
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}

export async function stopTestApp() {
  await new Promise((resolve) => server.close(resolve));
  await pool.query(`DROP DATABASE IF EXISTS \`${process.env.DB_NAME}\``);
  await pool.end();
  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

// Direct database access for the few checks that cannot be made through the API.
export function db() {
  return pool;
}

// Calls the API. Returns { status, body, headers }.
//   api('GET', '/vouchers/my', { token })
//   api('POST', '/vouchers', { token, json: {...} })
//   api('POST', '/vouchers/3/approve', { token, form: formData })
export async function api(method, urlPath, { token, json, form, rawBody, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let body;
  if (json !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets the multipart Content-Type (with boundary) itself
  } else if (rawBody !== undefined) {
    body = rawBody;
  }

  const response = await fetch(`${baseUrl}${urlPath}`, { method, headers: requestHeaders, body });
  const contentType = response.headers.get('content-type') || '';
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());

  return { status: response.status, body: responseBody, headers: response.headers };
}

export async function loginAs(user) {
  const response = await api('POST', '/auth/login', { json: { email: user.email, password: TEST_PASSWORD } });
  if (response.status !== 200) {
    throw new Error(`Test login failed for ${user.email}: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.token;
}

// ----------------------------- Test data -----------------------------

// A real (1x1 pixel) PNG image.
export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Today's date in the office time zone (+05:30), optionally some days back: 'YYYY-MM-DD'.
export function dateDaysAgo(days = 0) {
  const officeNow = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(officeNow - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function validVoucher(overrides = {}) {
  return {
    department: 'Sales',
    expenseTitle: 'Client visit travel',
    expenseCategory: 'Travel',
    expenseDescription: 'Train tickets for a client visit.',
    expenseDate: dateDaysAgo(2),
    voucherDate: dateDaysAgo(0),
    amount: '1500.50',
    ...overrides,
  };
}

// Builds multipart/form-data with text fields and (optionally) a signature file.
export function buildForm(fields = {}, file = { bytes: PNG_BYTES, type: 'image/png', name: 'signature.png' }) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, String(value));
  }
  if (file) {
    form.append(file.field || 'signature', new Blob([file.bytes], { type: file.type }), file.name);
  }
  return form;
}

export async function createDraft(token, overrides = {}, { withSignature = false } = {}) {
  const response = withSignature
    ? await api('POST', '/vouchers', { token, form: buildForm(validVoucher(overrides)) })
    : await api('POST', '/vouchers', { token, json: validVoucher(overrides) });
  if (response.status !== 201) {
    throw new Error(`Could not create a test voucher: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.voucher;
}

// Creates a voucher and submits it, so it is waiting for the Director.
export async function createPending(token, overrides = {}) {
  const draft = await createDraft(token, overrides);
  const response = await api('POST', `/vouchers/${draft.id}/submit`, { token, form: buildForm() });
  if (response.status !== 200) {
    throw new Error(`Could not submit a test voucher: ${JSON.stringify(response.body)}`);
  }
  return response.body.data.voucher;
}
