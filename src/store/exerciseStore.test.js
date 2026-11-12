import { fetchExercises } from '../services/supabase/repositories/exercises';
import { authError } from '../services/supabase/errors';
import { EXERCISE_CACHE_TTL_MS, useExerciseStore } from './exerciseStore';

jest.mock('../services/supabase/repositories/exercises', () => ({ fetchExercises: jest.fn() }));

const bench = { id: 'e1', name: 'Barbell Bench Press', primary_muscle: 'chest' };
const squat = { id: 'e2', name: 'Back Squat', primary_muscle: 'quads' };
const store = () => useExerciseStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  store().reset();
});

describe('exerciseStore.load', () => {
  it('shows loading, then the fetched exercises', async () => {
    let resolve;
    fetchExercises.mockReturnValue(new Promise((r) => (resolve = r)));
    const p = store().load({ now: 1000 });
    expect(store().status).toBe('loading');
    resolve([bench, squat]);
    await p;
    expect(store()).toMatchObject({ status: 'ready', items: [bench, squat], lastFetchedAt: 1000, error: null });
  });

  it('shows an error state when nothing is cached and the fetch fails', async () => {
    fetchExercises.mockRejectedValue(authError('network'));
    await store().load();
    expect(store().status).toBe('error');
    expect(store().error).toMatch(/internet connection/);
  });

  it('keeps showing cached data when a refresh fails (offline)', async () => {
    useExerciseStore.setState({ items: [bench], lastFetchedAt: 0 });
    fetchExercises.mockRejectedValue(authError('network'));
    await store().load({ now: EXERCISE_CACHE_TTL_MS + 1 });
    expect(store()).toMatchObject({ status: 'ready', items: [bench], error: null });
    expect(store().refreshError).toMatch(/internet connection/);
  });

  it('skips the network while the cache is fresh', async () => {
    useExerciseStore.setState({ items: [bench], lastFetchedAt: 1000 });
    await store().load({ now: 2000 });
    expect(fetchExercises).not.toHaveBeenCalled();
    expect(store().status).toBe('ready');
  });

  it('refetches a fresh cache when forced (pull to refresh)', async () => {
    useExerciseStore.setState({ items: [bench], lastFetchedAt: 1000 });
    fetchExercises.mockResolvedValue([bench, squat]);
    const p = store().load({ force: true, now: 2000 });
    expect(store().refreshing).toBe(true);
    await p;
    expect(store()).toMatchObject({ items: [bench, squat], refreshing: false, lastFetchedAt: 2000 });
  });

  it('deduplicates concurrent loads', async () => {
    fetchExercises.mockResolvedValue([bench]);
    await Promise.all([store().load(), store().load()]);
    expect(fetchExercises).toHaveBeenCalledTimes(1);
  });

  it('clears the error when a retry succeeds', async () => {
    fetchExercises.mockRejectedValueOnce(authError('network')).mockResolvedValueOnce([bench]);
    await store().load();
    await store().load({ force: true });
    expect(store()).toMatchObject({ status: 'ready', error: null, items: [bench] });
  });
});

describe('exerciseStore helpers', () => {
  it('getById finds cached exercises', () => {
    useExerciseStore.setState({ items: [bench, squat] });
    expect(store().getById('e2')).toBe(squat);
    expect(store().getById('missing')).toBeNull();
  });

  it('reset clears the cache', () => {
    useExerciseStore.setState({ items: [bench], lastFetchedAt: 5, status: 'ready' });
    store().reset();
    expect(store()).toMatchObject({ items: [], lastFetchedAt: null, status: 'idle' });
  });
});
