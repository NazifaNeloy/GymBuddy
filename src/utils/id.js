import * as Crypto from 'expo-crypto';

/** Client-generated UUID v4, so rows created offline never need new ids later. */
export function newId() {
  return Crypto.randomUUID();
}

/** Current time as an ISO string (the format Postgres timestamptz returns). */
export function nowIso(date = new Date()) {
  return date.toISOString();
}
