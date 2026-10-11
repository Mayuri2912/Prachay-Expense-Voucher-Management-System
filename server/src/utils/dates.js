// Small date helpers.
//
// Rule used in this project:
//   * Moments in time (created, submitted, approved ...) are stored in UTC.
//   * "Today" is decided in the office time zone from .env (APP_TIMEZONE_OFFSET, default +05:30).

import { env } from '../config/env.js';

// '+05:30' -> 330, '-04:00' -> -240
function offsetInMinutes(offset) {
  const match = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  if (!match) return 330;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === '-' ? -minutes : minutes;
}

const OFFSET_MS = offsetInMinutes(env.timezoneOffset) * 60 * 1000;

// Today's date in the office time zone, as 'YYYY-MM-DD'.
export function todayInOfficeTimezone() {
  return new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 10);
}

// The exact moment (as a Date) when today started in the office time zone.
export function startOfTodayInOfficeTimezone() {
  const midnightAsUtc = new Date(`${todayInOfficeTimezone()}T00:00:00.000Z`);
  return new Date(midnightAsUtc.getTime() - OFFSET_MS);
}

// True only for a real calendar date written as 'YYYY-MM-DD' (rejects 2026-02-31).
export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
