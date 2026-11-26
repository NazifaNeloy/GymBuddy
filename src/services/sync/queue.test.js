import AsyncStorage from '@react-native-async-storage/async-storage';
import * as queue from './queue';

const routine = (id, name) => ({ id, name, updated_at: '2026-01-01T00:00:00Z' });

beforeEach(async () => {
  await AsyncStorage.clear();
  queue.__resetForTests();
});

describe('sync queue', () => {
  it('starts empty', async () => {
    expect(await queue.getAll()).toEqual([]);
  });

  it('keeps entries in FIFO order', async () => {
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    await queue.enqueue({ table: 'routine_exercises', payload: { id: 'x1', routine_id: 'r1' } });
    await queue.enqueue({ table: 'routines', payload: routine('r2', 'B') });
    expect((await queue.getAll()).map((e) => e.rowId)).toEqual(['r1', 'x1', 'r2']);
  });

  it('coalesces repeated writes to the same row, keeping its place', async () => {
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'first') });
    await queue.enqueue({ table: 'routine_exercises', payload: { id: 'x1' } });
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'second') });
    const all = await queue.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ rowId: 'r1', payload: { name: 'second' } });
  });

  it('does not coalesce the same id across different tables', async () => {
    await queue.enqueue({ table: 'routines', payload: { id: 'same' } });
    await queue.enqueue({ table: 'workouts', payload: { id: 'same' } });
    expect(await queue.getAll()).toHaveLength(2);
  });

  it('persists to AsyncStorage and survives a restart', async () => {
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    queue.__resetForTests(); // simulate app restart
    const all = await queue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].payload.name).toBe('A');
  });

  it('recovers from corrupted storage', async () => {
    await AsyncStorage.setItem(queue.QUEUE_STORAGE_KEY, '{not json');
    expect(await queue.getAll()).toEqual([]);
  });

  it('complete() removes the sent entry', async () => {
    const e = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    expect(await queue.complete(e.id, e.payload)).toBe(true);
    expect(await queue.getAll()).toEqual([]);
  });

  it('complete() keeps an entry that was edited while it was uploading', async () => {
    const e = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    const sent = e.payload;
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'edited during upload') });
    expect(await queue.complete(e.id, sent)).toBe(false);
    expect((await queue.getAll())[0].payload.name).toBe('edited during upload');
  });

  it('fail() increments attempts and schedules an exponential backoff', async () => {
    const e = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    await queue.fail(e.id, 'boom', 1000);
    let [entry] = await queue.getAll();
    expect(entry).toMatchObject({ attempts: 1, lastError: 'boom', nextAttemptAt: 1000 + 2000 });
    await queue.fail(e.id, 'boom again', 1000);
    [entry] = await queue.getAll();
    expect(entry).toMatchObject({ attempts: 2, nextAttemptAt: 1000 + 4000 });
  });

  it('backoff is capped', () => {
    expect(queue.backoffMs(1)).toBe(2000);
    expect(queue.backoffMs(3)).toBe(8000);
    expect(queue.backoffMs(50)).toBe(queue.MAX_BACKOFF_MS);
  });

  it('getReady() skips entries that are still backing off', async () => {
    const a = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    await queue.enqueue({ table: 'routines', payload: routine('r2', 'B') });
    await queue.fail(a.id, 'x', 1000);
    expect((await queue.getReady(1500)).map((e) => e.rowId)).toEqual(['r2']);
    expect((await queue.getReady(5000)).map((e) => e.rowId)).toEqual(['r1', 'r2']);
  });

  it('a new write to a failing row resets its backoff', async () => {
    const e = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    await queue.fail(e.id, 'x', 1000);
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'fixed') });
    expect(await queue.getReady(1001)).toHaveLength(1);
  });

  it('retryAllNow() makes everything ready', async () => {
    const e = await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    await queue.fail(e.id, 'x', Date.now());
    await queue.retryAllNow();
    expect(await queue.getReady()).toHaveLength(1);
  });

  it('serialises concurrent enqueues without losing writes', async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => queue.enqueue({ table: 'workout_sets', payload: { id: `s${i}` } }))
    );
    expect(await queue.getAll()).toHaveLength(25);
  });

  it('notifies subscribers and clear() empties the queue', async () => {
    const listener = jest.fn();
    queue.subscribe(listener);
    await queue.enqueue({ table: 'routines', payload: routine('r1', 'A') });
    expect(listener).toHaveBeenLastCalledWith([expect.objectContaining({ rowId: 'r1' })]);
    await queue.clear();
    expect(listener).toHaveBeenLastCalledWith([]);
  });
});
