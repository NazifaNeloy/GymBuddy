import { getSupabase } from '../client';

/** Upsert one row by primary key. RLS checks ownership; the server trigger applies last-write-wins. */
export async function upsertRow(table, row) {
  const { error } = await getSupabase().from(table).upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

/** Rows (including soft-deleted ones) changed on the server after `since` (synced_at cursor). */
export async function pullRows(table, columns, since, limit = 1000) {
  let query = getSupabase().from(table).select(columns).order('synced_at', { ascending: true }).limit(limit);
  if (since) query = query.gt('synced_at', since);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
