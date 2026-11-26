import AsyncStorage from '@react-native-async-storage/async-storage';
import * as queue from '../services/sync/queue';
import { useRoutineStore } from './routineStore';
import {
  previousSets,
  selectActiveWorkout,
  selectHistory,
  selectWorkoutExercises,
  summarizeWorkout,
  useWorkoutStore,
} from './workoutStore';

jest.mock('../services/sync/syncEngine', () => ({ registerPullTarget: jest.fn(), syncNow: jest.fn() }));

const USER = 'user-1';
const T0 = '2026-11-27T10:00:00.000Z';
const T1 = '2026-11-27T10:05:00.000Z';
const T2 = '2026-11-27T11:00:00.000Z';
const store = () => useWorkoutStore.getState();
const EXERCISES = {
  bench: { id: 'bench', tracking: 'weight_reps' },
  squat: { id: 'squat', tracking: 'weight_reps' },
  plank: { id: 'plank', tracking: 'duration' },
};
const opts = (now) => ({ userId: USER, now, getExercise: (id) => EXERCISES[id] ?? null });

const routineItem = (id, exercise_id, day_index, position, target_sets, target_reps_min) => ({
  id,
  routine_id: 'r1',
  user_id: USER,
  exercise_id,
  day_index,
  position,
  target_sets,
  target_reps_min,
  target_reps_max: target_reps_min + 4,
  rest_seconds: 90,
  notes: null,
  updated_at: T0,
  deleted_at: null,
});

function seedRoutine() {
  useRoutineStore.setState({
    routines: { r1: { id: 'r1', user_id: USER, name: 'PPL', days: ['Push', 'Legs'], deleted_at: null, updated_at: T0 } },
    routineExercises: {
      a: routineItem('a', 'bench', 0, 0, 3, 8),
      b: routineItem('b', 'plank', 0, 1, 2, 45),
      c: routineItem('c', 'squat', 1, 0, 5, 5),
    },
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  queue.__resetForTests();
  store().reset();
  useRoutineStore.getState().reset();
});

describe('startWorkout', () => {
  it('starts an empty workout and queues it', async () => {
    const id = await store().startWorkout({}, opts(T0));
    expect(selectActiveWorkout(store())).toMatchObject({ id, name: 'Quick workout', ended_at: null, routine_id: null });
    const q = await queue.getAll();
    expect(q.map((e) => e.table)).toEqual(['workouts']);
    expect(q[0].payload).not.toHaveProperty('synced_at');
  });

  it('pre-fills a routine day with target sets, queuing the workout before its sets', async () => {
    seedRoutine();
    const id = await store().startWorkout({ routineId: 'r1', dayIndex: 0 }, opts(T0));

    expect(store().workouts[id]).toMatchObject({ name: 'PPL · Push', routine_id: 'r1', routine_day_index: 0 });
    const exercises = selectWorkoutExercises(store(), id);
    expect(exercises.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      ['bench', 3],
      ['plank', 2],
    ]);
    expect(exercises[0].sets[0]).toMatchObject({ reps: 8, weight_kg: 0, completed_at: null, set_number: 1 });
    // Timed exercise: the routine "reps" target is seconds.
    expect(exercises[1].sets[0]).toMatchObject({ reps: 0, duration_seconds: 45 });

    const q = await queue.getAll();
    expect(q[0].table).toBe('workouts');
    expect(q.slice(1).every((e) => e.table === 'workout_sets')).toBe(true);
    expect(q[1].payload).not.toHaveProperty('estimated_1rm_kg');
  });

  it('pre-fills weights from the last finished session of each exercise', async () => {
    seedRoutine();
    const first = await store().startWorkout({ routineId: 'r1', dayIndex: 1 }, opts(T0));
    const [squat] = selectWorkoutExercises(store(), first);
    await store().updateSet(squat.sets[0].id, { weight_kg: 100, reps: 5 }, { now: T0 });
    await store().updateSet(squat.sets[1].id, { weight_kg: 102.5, reps: 4 }, { now: T0 });
    await store().toggleSetComplete(squat.sets[0].id, { now: T0 });
    await store().toggleSetComplete(squat.sets[1].id, { now: T0 });
    await store().finishWorkout(first, { now: T1 });

    expect(previousSets(store(), 'squat').map((s) => s.weight_kg)).toEqual([100, 102.5]);

    const second = await store().startWorkout({ routineId: 'r1', dayIndex: 1 }, opts(T2));
    const sets = selectWorkoutExercises(store(), second)[0].sets;
    // Sets 1-2 copy last time's sets; sets 3-5 repeat the last one.
    expect(sets.map((s) => s.weight_kg)).toEqual([100, 102.5, 102.5, 102.5, 102.5]);
  });

  it('allows only one workout in progress', async () => {
    await store().startWorkout({}, opts(T0));
    await expect(store().startWorkout({}, opts(T1))).rejects.toThrow('already in progress');
  });

  it('rejects an unknown routine', async () => {
    await expect(store().startWorkout({ routineId: 'nope' }, opts(T0))).rejects.toThrow('Routine not found');
  });
});

describe('logging sets', () => {
  async function started() {
    const id = await store().startWorkout({}, opts(T0));
    await store().addExercise(id, 'bench', opts(T0));
    return id;
  }

  it('updates local state before the queue write finishes (never waits on the network)', async () => {
    const id = await started();
    const setId = selectWorkoutExercises(store(), id)[0].sets[0].id;
    const pending = store().updateSet(setId, { weight_kg: 60 }, { now: T1 });
    expect(store().sets[setId].weight_kg).toBe(60); // already applied synchronously
    await pending;
  });

  it('adds sets that copy the previous set', async () => {
    const id = await started();
    const first = selectWorkoutExercises(store(), id)[0].sets[0];
    await store().updateSet(first.id, { weight_kg: 60, reps: 10 }, { now: T1 });
    await store().addSet(id, 0, opts(T1));
    const sets = selectWorkoutExercises(store(), id)[0].sets;
    expect(sets.map((s) => [s.set_number, s.weight_kg, s.reps])).toEqual([
      [1, 60, 10],
      [2, 60, 10],
    ]);
  });

  it('clamps values to the database limits', async () => {
    const id = await started();
    const setId = selectWorkoutExercises(store(), id)[0].sets[0].id;
    await store().updateSet(setId, { weight_kg: 5000, reps: -3, rpe: 7.3 }, { now: T1 });
    expect(store().sets[setId]).toMatchObject({ weight_kg: 1000, reps: 0, rpe: 7.5 });
    await store().updateSet(setId, { weight_kg: '42.456' }, { now: T1 });
    expect(store().sets[setId].weight_kg).toBe(42.46);
  });

  it('skips the queue when nothing changed', async () => {
    const id = await started();
    const row = selectWorkoutExercises(store(), id)[0].sets[0];
    expect(await store().updateSet(row.id, { reps: row.reps }, { now: T1 })).toBe(false);
  });

  it('toggles completion and coalesces edits of one set into one pending upload', async () => {
    const id = await started();
    const setId = selectWorkoutExercises(store(), id)[0].sets[0].id;
    expect(await store().toggleSetComplete(setId, { now: T1 })).toBe(true);
    expect(store().sets[setId].completed_at).toBe(T1);
    expect(await store().toggleSetComplete(setId, { now: T2 })).toBe(false);
    expect(store().sets[setId].completed_at).toBeNull();
    const q = await queue.getAll();
    expect(q.filter((e) => e.rowId === setId)).toHaveLength(1);
  });

  it('removes a set and renumbers the later ones', async () => {
    const id = await started();
    await store().addSet(id, 0, opts(T0));
    await store().addSet(id, 0, opts(T0));
    const [s1, s2, s3] = selectWorkoutExercises(store(), id)[0].sets;
    await store().removeSet(s2.id, { now: T1 });

    expect(store().sets[s2.id].deleted_at).toBe(T1);
    expect(selectWorkoutExercises(store(), id)[0].sets.map((s) => [s.id, s.set_number])).toEqual([
      [s1.id, 1],
      [s3.id, 2],
    ]);
  });

  it('removes a whole exercise', async () => {
    const id = await started();
    await store().addExercise(id, 'squat', opts(T0));
    await store().removeExercise(id, 0, { now: T1 });
    expect(selectWorkoutExercises(store(), id).map((e) => e.exerciseId)).toEqual(['squat']);
  });
});

describe('finishing and discarding', () => {
  it('drops unticked sets, sets ended_at and moves the workout to history', async () => {
    const id = await store().startWorkout({}, opts(T0));
    await store().addExercise(id, 'bench', opts(T0));
    await store().addSet(id, 0, opts(T0));
    const [done, skipped] = selectWorkoutExercises(store(), id)[0].sets;
    await store().updateSet(done.id, { weight_kg: 50, reps: 10 }, { now: T0 });
    await store().toggleSetComplete(done.id, { now: T1 });

    const result = await store().finishWorkout(id, { notes: '  felt strong ', now: T2 });

    expect(result).toEqual({ ok: true, workoutId: id });
    expect(store().workouts[id]).toMatchObject({ ended_at: T2, notes: 'felt strong' });
    expect(store().sets[skipped.id].deleted_at).toBe(T2);
    expect(selectActiveWorkout(store())).toBeNull();
    expect(selectHistory(store()).map((w) => w.id)).toEqual([id]);
    expect(summarizeWorkout(store(), id)).toEqual({
      durationSeconds: 3600,
      exerciseCount: 1,
      setCount: 1,
      totalReps: 10,
      volumeKg: 500,
    });
  });

  it('refuses to finish a workout without completed sets', async () => {
    const id = await store().startWorkout({}, opts(T0));
    await store().addExercise(id, 'bench', opts(T0));
    expect(await store().finishWorkout(id, { now: T1 })).toEqual({ ok: false, reason: 'no_completed_sets' });
    expect(selectActiveWorkout(store())?.id).toBe(id);
  });

  it('excludes warm-ups from volume', async () => {
    const id = await store().startWorkout({}, opts(T0));
    await store().addExercise(id, 'bench', opts(T0));
    await store().addSet(id, 0, opts(T0));
    const [warm, work] = selectWorkoutExercises(store(), id)[0].sets;
    await store().updateSet(warm.id, { weight_kg: 20, reps: 10, is_warmup: true }, { now: T0 });
    await store().updateSet(work.id, { weight_kg: 60, reps: 5 }, { now: T0 });
    await store().toggleSetComplete(warm.id, { now: T0 });
    await store().toggleSetComplete(work.id, { now: T0 });
    expect(summarizeWorkout(store(), id, T1)).toMatchObject({ setCount: 1, volumeKg: 300, exerciseCount: 1 });
  });

  it('discards a workout and all its sets', async () => {
    const id = await store().startWorkout({}, opts(T0));
    await store().addExercise(id, 'bench', opts(T0));
    await store().discardWorkout(id, { now: T1 });
    expect(store().workouts[id].deleted_at).toBe(T1);
    expect(selectWorkoutExercises(store(), id)).toEqual([]);
    expect(selectActiveWorkout(store())).toBeNull();
    expect(selectHistory(store())).toEqual([]);
  });
});

describe('applyRemote', () => {
  it('merges pulled rows, converts numeric strings and stores the cursor', () => {
    store().applyRemote(
      'workout_sets',
      [{ id: 's1', workout_id: 'w1', weight_kg: '62.50', rpe: '8.0', updated_at: T1, synced_at: T1 }],
      T1
    );
    expect(store().sets.s1).toMatchObject({ weight_kg: 62.5, rpe: 8 });
    expect(store().cursors.workout_sets).toBe(T1);
  });

  it('keeps a newer local edit over an older server row (last write wins)', async () => {
    const id = await store().startWorkout({}, opts(T2));
    store().applyRemote('workouts', [{ ...store().workouts[id], name: 'Old', updated_at: T0 }], T0);
    expect(store().workouts[id].name).toBe('Quick workout');
  });
});
