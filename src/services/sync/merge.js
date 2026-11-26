// Last-write-wins merge between local rows and rows pulled from Supabase.

const time = (iso) => (iso ? Date.parse(iso) : 0);

/** True when `incoming` should replace `current` (newer or equal updated_at wins). */
export function isNewer(incoming, current) {
  if (!current) return true;
  return time(incoming.updated_at) >= time(current.updated_at);
}

/**
 * Merge remote rows into a local { [id]: row } map.
 * Local rows with a newer updated_at (unsynced offline edits) are kept.
 * Returns a new map and the number of rows that changed.
 */
export function mergeRows(localById, remoteRows) {
  const next = { ...localById };
  let changed = 0;
  for (const row of remoteRows) {
    if (isNewer(row, next[row.id])) {
      next[row.id] = row;
      changed += 1;
    }
  }
  return { rows: next, changed };
}

/** Highest synced_at among rows, used as the cursor for the next incremental pull. */
export function maxSyncedAt(rows, fallback = null) {
  return rows.reduce((max, r) => (r.synced_at && (!max || r.synced_at > max) ? r.synced_at : max), fallback);
}
