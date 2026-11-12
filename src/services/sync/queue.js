import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from '../../utils/id';

/**
 * Persistent outbox of local writes waiting to reach Supabase.
 *
 * Entry: { id, table, op: 'upsert', rowId, payload, attempts, lastError, nextAttemptAt, createdAt }
 * - Saved to AsyncStorage after every change, so it survives app restarts.
 * - FIFO order is kept (parents are queued before children, e.g. routine before its exercises).
 * - Coalescing: a second write to the same table+row replaces the pending payload in place
 *   instead of adding another entry. Deletes are soft deletes, so they are upserts too.
 * - Every operation runs through a single promise chain, so concurrent calls never interleave.
 */

export const QUEUE_STORAGE_KEY = 'gymbuddy.syncQueue.v1';
export const MAX_BACKOFF_MS = 5 * 60 * 1000;
export const BASE_BACKOFF_MS = 2000;

/** Exponential backoff: 2s, 4s, 8s ... capped at 5 minutes. */
export function backoffMs(attempts) {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

let entries = null; // in-memory copy; null until loaded
let chain = Promise.resolve();
const listeners = new Set();

function serial(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function ensureLoaded() {
  if (entries) return;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    entries = Array.isArray(parsed) ? parsed : [];
  } catch {
    entries = []; // corrupted storage: start clean rather than crash
  }
}

async function save() {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(entries));
  const snapshot = entries.slice();
  listeners.forEach((l) => l(snapshot));
}

/** Add or coalesce a write. Returns the entry. */
export function enqueue({ table, op = 'upsert', payload }, now = Date.now()) {
  return serial(async () => {
    await ensureLoaded();
    const existing = entries.find((e) => e.table === table && e.rowId === payload.id && e.op === op);
    if (existing) {
      existing.payload = payload;
      existing.attempts = 0;
      existing.lastError = null;
      existing.nextAttemptAt = 0;
      await save();
      return { ...existing };
    }
    const entry = {
      id: newId(),
      table,
      op,
      rowId: payload.id,
      payload,
      attempts: 0,
      lastError: null,
      nextAttemptAt: 0,
      createdAt: now,
    };
    entries.push(entry);
    await save();
    return { ...entry };
  });
}

/** Snapshot of all entries in FIFO order. */
export function getAll() {
  return serial(async () => {
    await ensureLoaded();
    return entries.map((e) => ({ ...e }));
  });
}

/** Entries ready to send now (backoff elapsed), in FIFO order. */
export function getReady(now = Date.now()) {
  return serial(async () => {
    await ensureLoaded();
    // Copies, so callers never see later in-place changes (e.g. coalesced payloads).
    return entries.filter((e) => e.nextAttemptAt <= now).map((e) => ({ ...e }));
  });
}

/**
 * Remove a sent entry — but only if it was not replaced meanwhile
 * (a newer write coalesced into it while the upload was in flight).
 */
export function complete(entryId, sentPayload) {
  return serial(async () => {
    await ensureLoaded();
    const i = entries.findIndex((e) => e.id === entryId);
    if (i === -1) return false;
    if (sentPayload && entries[i].payload !== sentPayload) return false;
    entries.splice(i, 1);
    await save();
    return true;
  });
}

/** Record a failed attempt and schedule the retry. */
export function fail(entryId, message, now = Date.now()) {
  return serial(async () => {
    await ensureLoaded();
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return null;
    entry.attempts += 1;
    entry.lastError = message;
    entry.nextAttemptAt = now + backoffMs(entry.attempts);
    await save();
    return entry;
  });
}

/** Make every entry eligible immediately (e.g. when the connection comes back). */
export function retryAllNow() {
  return serial(async () => {
    await ensureLoaded();
    entries.forEach((e) => {
      e.nextAttemptAt = 0;
    });
    await save();
  });
}

export function clear() {
  return serial(async () => {
    entries = [];
    await save();
  });
}

/** Subscribe to queue changes; returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper: forget the in-memory copy so the next call reloads from storage. */
export function __resetForTests() {
  entries = null;
  chain = Promise.resolve();
  listeners.clear();
}
