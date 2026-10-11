// Login logic: look the user up, compare the password with bcrypt, sign a JWT.

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// The user details that are safe to send to the browser (never the password hash).
function toPublicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    employeeCode: row.employee_code,
    department: row.department,
  };
}

export async function findActiveUserById(id) {
  if (!Number.isInteger(id)) return null;

  const [rows] = await pool.execute(
    `SELECT id, full_name, email, role, employee_code, department
       FROM users
      WHERE id = ? AND is_active = 1`,
    [id]
  );
  return rows.length ? toPublicUser(rows[0]) : null;
}

function signToken(user) {
  // The token only carries the user id (and the role, for information).
  // Permissions are always re-checked against the database - see middleware/authenticate.js.
  return jwt.sign({ role: user.role }, env.jwt.secret, {
    subject: String(user.id),
    expiresIn: env.jwt.expiresIn,
    algorithm: 'HS256',
  });
}

export async function login(email, password) {
  const [rows] = await pool.execute(
    `SELECT id, full_name, email, role, employee_code, department, password_hash, is_active
       FROM users
      WHERE email = ?`,
    [email]
  );
  const row = rows[0];

  // The same message is used for "no such email" and "wrong password",
  // so nobody can use the login form to discover which emails exist.
  const passwordMatches = row ? await bcrypt.compare(password, row.password_hash) : false;
  if (!row || !passwordMatches) {
    throw new AppError(401, 'Invalid email or password.');
  }
  if (!row.is_active) {
    throw new AppError(403, 'This account has been disabled. Please contact the administrator.');
  }

  const user = toPublicUser(row);
  return { token: signToken(user), expiresIn: env.jwt.expiresIn, user };
}
