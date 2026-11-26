import { useSyncStore } from '../../store/syncStore';
import { pullRows, upsertRow } from '../supabase/repositories/sync';
import { maxSyncedAt } from './merge';
import * as queue from './queue';

/**
 * Two-way sync:
 *  1. push — send queued local writes to Supabase in FIFO order;
 *  2. pull — fetch rows changed on the server since our cursor and merge them (last write wins).
 *
 * Conflicts: every write carries the device's updated_at. The server trigger ignores an update that
 * is older than the stored row, and the local merge ignores server rows older than local edits.
 */

const pullTargets = [];

/**
 * Stores register the tables they own.
 * target: { table, columns, getCursor(): string|null, applyRemote(rows, nextCursor) }
 * Targets are pulled in registration order (parents before children).
 */
export function registerPullTarget(target) {
  const i = pullTargets.findIndex((t) => t.table === target.table);
  if (i >= 0) pullTargets[i] = target;
  else pullTargets.push(target);
}

export function __resetPullTargetsForTests() {
  pullTargets.length = 0;
}

/** Network problems pause the push without counting as a failed attempt. */
export function isNetworkError(error) {
  if (!error) return false;
  if (error.name === 'AuthRetryableFetchError') return true;
  if (error.code) return false; // Postgres / PostgREST error codes come from the server
  return /network|fetch|timed? ?out|offline|connection/i.test(error.message ?? '');
}

function describe(error) {
  if (isNetworkError(error)) return 'No connection';
  // 42501 also happens when a child row arrives before its parent; it succeeds on retry.
  if (error?.code === '42501' || error?.code === '23503') return 'Waiting for related changes to sync';
  return error?.message || 'Sync failed';
}

let running = null;
let rerun = false;

async function push(now) {
  let pushed = 0;
  const failedThisPass = new Set();
  // Loop because rows can be edited (re-queued) while an upload is in flight;
  // those newer versions are sent in the same pass. Capped to avoid spinning.
  for (let round = 0; round < 5; round += 1) {
    const ready = (await queue.getReady(now)).filter((e) => !failedThisPass.has(e.id));
    if (ready.length === 0) break;
    for (const entry of ready) {
      const sent = entry.payload; // snapshot: the queued row may be edited during the upload
      try {
        await upsertRow(entry.table, sent);
        await queue.complete(entry.id, sent);
        pushed += 1;
      } catch (error) {
        if (isNetworkError(error)) return { pushed, offline: true, error };
        // Server rejected it (e.g. parent row not synced yet, or invalid data): back off and continue,
        // so one bad row cannot block everything behind it.
        failedThisPass.add(entry.id);
        await queue.fail(entry.id, describe(error), now);
      }
    }
  }
  return { pushed, offline: false };
}

async function pull() {
  for (const target of pullTargets) {
    const since = target.getCursor();
    const rows = await pullRows(target.table, target.columns, since);
    target.applyRemote(rows, maxSyncedAt(rows, since));
  }
}

/**
 * Run one sync pass. Concurrent calls share the running pass and schedule one more afterwards.
 * Never throws; the result and errors are reported through useSyncStore.
 */
export function syncNow({ now = Date.now(), pullData = true } = {}) {
  if (running) {
    rerun = true;
    return running;
  }
  const status = useSyncStore.getState();
  status.set({ isSyncing: true });

  running = (async () => {
    let result = { ok: true };
    try {
      const pushed = await push(now);
      if (pushed.offline) {
        result = { ok: false, offline: true };
        status.set({ lastError: describe(pushed.error) });
      } else {
        if (pullData) await pull();
        status.set({ lastSyncedAt: new Date(now).toISOString(), lastError: null });
      }
    } catch (error) {
      result = { ok: false, offline: isNetworkError(error) };
      status.set({ lastError: describe(error) });
    } finally {
      status.setQueueStats(await queue.getAll());
      status.set({ isSyncing: false });
      running = null;
    }
    if (rerun) {
      rerun = false;
      return syncNow({ pullData: false });
    }
    return result;
  })();
  return running;
}
