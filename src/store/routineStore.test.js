import AsyncStorage from '@react-native-async-storage/async-storage';
import * as queue from '../services/sync/queue';
import { syncNow } from '../services/sync/syncEngine';
import { addExercises, draftFromRoutine, emptyDraft, removeItem, updateItem } from '../utils/routineDraft';
import { selectMyRoutines, selectRoutineRows, selectTemplates, useRoutineStore } from './routineStore';

jest.mock('../services/sync/syncEngine', () => ({ registerPullTarget: jest.fn(), syncNow: jest.fn() }));

const USER = 'user-1';
const T0 = '2026-11-12T10:00:00.000Z';
const T1 = '2026-11-12T11:00:00.000Z';
const store = () => useRoutineStore.getState();
const bench = { id: 'bench', tracking: 'weight_reps', category: 'compound' };
const squat = { id: 'squat', tracking: 'weight_reps', category: 'compound' };

const template = {
  id: 'tpl',
  user_id: null,
  name: 'Full Body',
  description: 'Starter',
  days: ['Full Body'],
  source_template_id: null,
  updated_at: T0,
  deleted_at: null,
};
const templateRow = {
  id: 'tpl-x1',
  routine_id: 'tpl',
  user_id: null,
  exercise_id: 'squat',
  day_index: 0,
  position: 0,
  target_sets: 3,
  target_reps_min: 8,
  target_reps_max: 12,
  rest_seconds: 90,
  notes: null,
  updated_at: T0,
  deleted_at: null,
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queue.__resetForTests();
  store().reset();
});

describe('saveDraft', () => {
  it('creates a routine and its exercises locally and queues routine before exercises', async () => {
    let d = { ...emptyDraft(), name: '  Push day ' };
    d = addExercises(d, 0, [bench, squat]);
    const { routineId } = await store().saveDraft(d, { userId: USER, now: T0 });

    expect(store().routines[routineId]).toMatchObject({ name: 'Push day', user_id: USER, created_at: T0 });
    expect(selectRoutineRows(store(), routineId).map((r) => [r.exercise_id, r.position])).toEqual([
      ['bench', 0],
      ['squat', 1],
    ]);
    const q = await queue.getAll();
    expect(q.map((e) => e.table)).toEqual(['routines', 'routine_exercises', 'routine_exercises']);
    expect(q[0].payload).not.toHaveProperty('is_template');
    expect(q[0].payload).not.toHaveProperty('synced_at');
  });

  it('only queues rows that actually changed when editing', async () => {
    let d = addExercises({ ...emptyDraft(), name: 'Push' }, 0, [bench, squat]);
    const { routineId } = await store().saveDraft(d, { userId: USER, now: T0 });
    await queue.clear();

    d = draftFromRoutine(store().routines[routineId], Object.values(store().routineExercises));
    d = updateItem(d, d.items[1].id, { targetSets: 5 });
    const { changes } = await store().saveDraft(d, { userId: USER, now: T1 });

    expect(changes).toBe(1);
    const q = await queue.getAll();
    expect(q).toHaveLength(1);
    expect(q[0].payload).toMatchObject({ exercise_id: 'squat', target_sets: 5, updated_at: T1 });
    expect(store().routines[routineId].updated_at).toBe(T0); // routine itself unchanged
  });

  it('soft-deletes exercises removed in the builder', async () => {
    let d = addExercises({ ...emptyDraft(), name: 'Push' }, 0, [bench, squat]);
    const { routineId } = await store().saveDraft(d, { userId: USER, now: T0 });
    d = draftFromRoutine(store().routines[routineId], Object.values(store().routineExercises));
    d = removeItem(d, d.items[0].id);
    await store().saveDraft(d, { userId: USER, now: T1 });

    expect(selectRoutineRows(store(), routineId).map((r) => [r.exercise_id, r.position])).toEqual([['squat', 0]]);
    const benchRow = Object.values(store().routineExercises).find((r) => r.exercise_id === 'bench');
    expect(benchRow).toMatchObject({ deleted_at: T1 });
  });

  it('keeps the original created_at when renaming', async () => {
    const d = { ...emptyDraft(), name: 'A' };
    await store().saveDraft(d, { userId: USER, now: T0 });
    await store().saveDraft({ ...d, isNew: false, name: 'B' }, { userId: USER, now: T1 });
    expect(store().routines[d.id]).toMatchObject({ name: 'B', created_at: T0, updated_at: T1 });
  });

  it('coalesces several saves of the same routine into one pending upload', async () => {
    const d = { ...emptyDraft(), name: 'A' };
    await store().saveDraft(d, { userId: USER, now: T0 });
    await store().saveDraft({ ...d, name: 'B' }, { userId: USER, now: T1 });
    const q = await queue.getAll();
    expect(q).toHaveLength(1);
    expect(q[0].payload.name).toBe('B');
  });
});

describe('deleteRoutine', () => {
  it('soft-deletes the routine and its exercises and queues them', async () => {
    const d = addExercises({ ...emptyDraft(), name: 'Push' }, 0, [bench]);
    await store().saveDraft(d, { userId: USER, now: T0 });
    await queue.clear();
    expect(await store().deleteRoutine(d.id, { now: T1 })).toBe(true);
    expect(selectMyRoutines(store())).toEqual([]);
    expect(selectRoutineRows(store(), d.id)).toEqual([]);
    expect((await queue.getAll()).map((e) => [e.table, e.payload.deleted_at])).toEqual([
      ['routines', T1],
      ['routine_exercises', T1],
    ]);
  });

  it('refuses to delete starter templates', async () => {
    useRoutineStore.setState({ routines: { tpl: template } });
    expect(await store().deleteRoutine('tpl')).toBe(false);
    expect(await queue.getAll()).toEqual([]);
  });
});

describe('copyTemplate', () => {
  it('creates an editable copy with new ids that points back to the template', async () => {
    useRoutineStore.setState({ routines: { tpl: template }, routineExercises: { 'tpl-x1': templateRow } });
    const id = await store().copyTemplate('tpl', { userId: USER, now: T1 });
    expect(id).not.toBe('tpl');
    expect(store().routines[id]).toMatchObject({ name: 'Full Body', user_id: USER, source_template_id: 'tpl' });
    const rows = selectRoutineRows(store(), id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ exercise_id: 'squat', user_id: USER });
    expect(rows[0].id).not.toBe('tpl-x1');
    expect(selectTemplates(store()).map((r) => r.id)).toEqual(['tpl']);
    expect(selectMyRoutines(store()).map((r) => r.id)).toEqual([id]);
  });
});

describe('applyRemote and load', () => {
  it('merges pulled rows (last write wins) and stores the cursor', () => {
    useRoutineStore.setState({ routines: { r1: { id: 'r1', user_id: USER, name: 'offline edit', updated_at: T1 } } });
    store().applyRemote('routines', [{ id: 'r1', user_id: USER, name: 'server', updated_at: T0 }, template], 'cur-1');
    expect(store().routines.r1.name).toBe('offline edit');
    expect(store().routines.tpl.name).toBe('Full Body');
    expect(store().cursors.routines).toBe('cur-1');
  });

  it('is ready immediately when data is cached, even if offline', async () => {
    useRoutineStore.setState({ routines: { tpl: template } });
    syncNow.mockResolvedValue({ ok: false, offline: true });
    await store().load();
    expect(store().status).toBe('ready');
  });

  it('shows an error on first launch when offline', async () => {
    syncNow.mockResolvedValue({ ok: false, offline: true });
    await store().load();
    expect(store()).toMatchObject({ status: 'error', error: expect.stringMatching(/offline/) });
  });

  it('is ready after a successful first sync', async () => {
    syncNow.mockImplementation(async () => {
      store().applyRemote('routines', [template], 'c');
      return { ok: true };
    });
    await store().load();
    expect(store().status).toBe('ready');
    expect(selectTemplates(store())).toHaveLength(1);
  });
});
