import AsyncStorage from '@react-native-async-storage/async-storage';
import { pullRows, upsertRow } from '../supabase/repositories/sync';
import { useSyncStore } from '../../store/syncStore';
import * as queue from './queue';
import { __resetPullTargetsForTests, isNetworkError, registerPullTarget, syncNow } from './syncEngine';

jest.mock('../supabase/repositories/sync', () => ({ upsertRow: jest.fn(), pullRows: jest.fn() }));

const networkError = () => new TypeError('Network request failed');
const serverError = (code = '23503') => ({ code, message: 'insert or update violates foreign key constraint' });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queue.__resetForTests();
  __resetPullTargetsForTests();
  useSyncStore.getState().reset();
  upsertRow.mockResolvedValue();
  pullRows.mockResolvedValue([]);
});

describe('isNetworkError', () => {
  it('distinguishes connection problems from server rejections', () => {
    expect(isNetworkError(networkError())).toBe(true);
    expect(isNetworkError({ name: 'AuthRetryableFetchError', message: '' })).toBe(true);
    expect(isNetworkError(serverError())).toBe(false);
    expect(isNetworkError({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false);
  });
});

describe('push', () => {
  it('uploads queued writes in FIFO order and empties the queue', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'r1' } });
    await queue.enqueue({ table: 'routine_exercises', payload: { id: 'x1', routine_id: 'r1' } });
    await expect(syncNow()).resolves.toEqual({ ok: true });
    expect(upsertRow.mock.calls.map(([table, row]) => `${table}:${row.id}`)).toEqual([
      'routines:r1',
      'routine_exercises:x1',
    ]);
    expect(await queue.getAll()).toEqual([]);
    expect(useSyncStore.getState()).toMatchObject({ pendingCount: 0, isSyncing: false, lastError: null });
  });

  it('stops at the first network error, keeps order, and does not count an attempt', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'r1' } });
    await queue.enqueue({ table: 'routines', payload: { id: 'r2' } });
    upsertRow.mockRejectedValueOnce(networkError());
    await expect(syncNow()).resolves.toEqual({ ok: false, offline: true });
    expect(upsertRow).toHaveBeenCalledTimes(1);
    const all = await queue.getAll();
    expect(all.map((e) => e.rowId)).toEqual(['r1', 'r2']);
    expect(all[0].attempts).toBe(0);
    expect(useSyncStore.getState()).toMatchObject({ pendingCount: 2, lastError: 'No connection' });
    expect(pullRows).not.toHaveBeenCalled();
  });

  it('backs off a row the server rejects and keeps sending the rest', async () => {
    await queue.enqueue({ table: 'routine_exercises', payload: { id: 'bad' } });
    await queue.enqueue({ table: 'routines', payload: { id: 'good' } });
    upsertRow.mockRejectedValueOnce(serverError());
    await syncNow({ now: 1000 });
    const all = await queue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ rowId: 'bad', attempts: 1, nextAttemptAt: 3000 });
    expect(useSyncStore.getState()).toMatchObject({ pendingCount: 1, failedCount: 1 });
  });

  it('retries a backed-off row once its delay has passed', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'r1' } });
    upsertRow.mockRejectedValueOnce(serverError());
    await syncNow({ now: 1000 });
    await syncNow({ now: 1500 }); // still backing off
    expect(upsertRow).toHaveBeenCalledTimes(1);
    await syncNow({ now: 3001 });
    expect(upsertRow).toHaveBeenCalledTimes(2);
    expect(await queue.getAll()).toEqual([]);
  });

  it('keeps a write that was edited while it was uploading (sends it next time)', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'r1', name: 'v1' } });
    upsertRow.mockImplementationOnce(async () => {
      await queue.enqueue({ table: 'routines', payload: { id: 'r1', name: 'v2' } });
    });
    await syncNow();
    expect(upsertRow).toHaveBeenLastCalledWith('routines', { id: 'r1', name: 'v2' });
    expect(await queue.getAll()).toEqual([]);
  });

  it('shares one pass between concurrent calls', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'r1' } });
    await Promise.all([syncNow(), syncNow(), syncNow()]);
    expect(upsertRow).toHaveBeenCalledTimes(1);
  });
});

describe('pull', () => {
  it('pulls registered tables in order with their cursor and applies the rows', async () => {
    const applied = [];
    registerPullTarget({
      table: 'routines',
      columns: 'id',
      getCursor: () => '2026-01-01T00:00:00Z',
      applyRemote: (rows, cursor) => applied.push(['routines', rows.length, cursor]),
    });
    registerPullTarget({
      table: 'routine_exercises',
      columns: 'id',
      getCursor: () => null,
      applyRemote: (rows, cursor) => applied.push(['routine_exercises', rows.length, cursor]),
    });
    pullRows
      .mockResolvedValueOnce([{ id: 'r1', synced_at: '2026-01-02T00:00:00Z' }])
      .mockResolvedValueOnce([]);
    await syncNow();
    expect(pullRows.mock.calls.map((c) => [c[0], c[2]])).toEqual([
      ['routines', '2026-01-01T00:00:00Z'],
      ['routine_exercises', null],
    ]);
    expect(applied).toEqual([
      ['routines', 1, '2026-01-02T00:00:00Z'],
      ['routine_exercises', 0, null],
    ]);
  });

  it('pushes before pulling so local edits reach the server first', async () => {
    const order = [];
    registerPullTarget({ table: 'routines', columns: 'id', getCursor: () => null, applyRemote: () => {} });
    upsertRow.mockImplementation(async () => order.push('push'));
    pullRows.mockImplementation(async () => {
      order.push('pull');
      return [];
    });
    await queue.enqueue({ table: 'routines', payload: { id: 'r1' } });
    await syncNow();
    expect(order).toEqual(['push', 'pull']);
  });

  it('reports pull failures without throwing', async () => {
    registerPullTarget({ table: 'routines', columns: 'id', getCursor: () => null, applyRemote: () => {} });
    pullRows.mockRejectedValue(networkError());
    await expect(syncNow()).resolves.toEqual({ ok: false, offline: true });
    expect(useSyncStore.getState().lastError).toBe('No connection');
  });
});
