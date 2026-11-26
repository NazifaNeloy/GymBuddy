import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as queue from '../services/sync/queue';
import { mergeRows } from '../services/sync/merge';
import { registerPullTarget } from '../services/sync/syncEngine';
import { persistStorage } from '../services/storage/persistStorage';
import { newId, nowIso } from '../utils/id';
import { useAuthStore } from './authStore';
import { useExerciseStore } from './exerciseStore';
import { selectRoutineRows, useRoutineStore } from './routineStore';

export const WORKOUT_COLUMNS =
  'id, user_id, routine_id, routine_day_index, name, started_at, ended_at, notes, created_at, updated_at, deleted_at, synced_at';
export const WORKOUT_SET_COLUMNS =
  'id, workout_id, user_id, exercise_id, exercise_order, set_number, reps, weight_kg, duration_seconds, rpe, is_warmup, completed_at, created_at, updated_at, deleted_at, synced_at';

// Limits mirror the database check constraints (supabase/migrations/*_workouts.sql).
export const MAX_SETS_PER_EXERCISE = 50;
const MAX_NAME = 60;
const DEFAULT_REPS = 8;
const DEFAULT_DURATION_SECONDS = 30;

// Columns the client writes (estimated_1rm_kg is generated and synced_at is set by the database).
const workoutPayload = (w) => ({
  id: w.id,
  user_id: w.user_id,
  routine_id: w.routine_id,
  routine_day_index: w.routine_day_index,
  name: w.name,
  started_at: w.started_at,
  ended_at: w.ended_at,
  notes: w.notes,
  created_at: w.created_at,
  updated_at: w.updated_at,
  deleted_at: w.deleted_at,
});
const setPayload = (s) => ({
  id: s.id,
  workout_id: s.workout_id,
  user_id: s.user_id,
  exercise_id: s.exercise_id,
  exercise_order: s.exercise_order,
  set_number: s.set_number,
  reps: s.reps,
  weight_kg: s.weight_kg,
  duration_seconds: s.duration_seconds,
  rpe: s.rpe,
  is_warmup: s.is_warmup,
  completed_at: s.completed_at,
  created_at: s.created_at,
  updated_at: s.updated_at,
  deleted_at: s.deleted_at,
});

const toNumber = (v) => (v === null || v === undefined ? null : Number(v));
const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
const clampWeight = (v) => Math.min(1000, Math.max(0, Math.round((Number(v) || 0) * 100) / 100));

/** Keep user input inside the database constraints so an upload is never rejected. */
function cleanSetPatch(patch) {
  const out = {};
  if ('reps' in patch) out.reps = clampInt(patch.reps, 0, 200);
  if ('weight_kg' in patch) out.weight_kg = clampWeight(patch.weight_kg);
  if ('duration_seconds' in patch)
    out.duration_seconds = patch.duration_seconds === null ? null : clampInt(patch.duration_seconds, 0, 36000);
  if ('rpe' in patch) out.rpe = patch.rpe === null ? null : Math.min(10, Math.max(1, Math.round(Number(patch.rpe) * 2) / 2));
  if ('is_warmup' in patch) out.is_warmup = Boolean(patch.is_warmup);
  return out;
}

/** Postgres numeric columns arrive as strings; store numbers locally. */
const normalizeSet = (s) => ({ ...s, weight_kg: toNumber(s.weight_kg) ?? 0, rpe: toNumber(s.rpe) });

const initialState = {
  workouts: {}, // id -> row; ended_at null = in progress
  sets: {}, // id -> workout_sets row
  cursors: { workouts: null, workout_sets: null },
};

function currentUserId() {
  const id = useAuthStore.getState().user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

const defaultGetExercise = (id) => useExerciseStore.getState().getById(id);

const liveSets = (state, workoutId) =>
  Object.values(state.sets).filter((s) => s.workout_id === workoutId && !s.deleted_at);

/**
 * Completed sets of this exercise from the most recent finished workout (for pre-filling weights),
 * sorted by set number. Empty when the user has never done the exercise.
 */
export function previousSets(state, exerciseId, excludeWorkoutId = null) {
  let best = null;
  for (const s of Object.values(state.sets)) {
    if (s.exercise_id !== exerciseId || s.deleted_at || !s.completed_at || s.workout_id === excludeWorkoutId) continue;
    const w = state.workouts[s.workout_id];
    if (!w || w.deleted_at || !w.ended_at) continue;
    if (!best || w.started_at > best.started_at) best = w;
  }
  if (!best) return [];
  return Object.values(state.sets)
    .filter((s) => s.workout_id === best.id && s.exercise_id === exerciseId && !s.deleted_at && s.completed_at)
    .sort((a, b) => a.set_number - b.set_number);
}

/** Starting values for a new set: copy a reference set, else sensible defaults for the tracking type. */
function setDefaults(exercise, reference, targetReps) {
  if (reference) {
    return { reps: reference.reps, weight_kg: reference.weight_kg, duration_seconds: reference.duration_seconds };
  }
  if (exercise?.tracking === 'duration') {
    // Routine targets for timed exercises are stored as seconds in the reps columns.
    return { reps: 0, weight_kg: 0, duration_seconds: targetReps ?? DEFAULT_DURATION_SECONDS };
  }
  return { reps: targetReps ?? DEFAULT_REPS, weight_kg: 0, duration_seconds: null };
}

function newSetRow({ workout, exerciseId, exerciseOrder, setNumber, values, now }) {
  return {
    id: newId(),
    workout_id: workout.id,
    user_id: workout.user_id,
    exercise_id: exerciseId,
    exercise_order: exerciseOrder,
    set_number: setNumber,
    reps: values.reps,
    weight_kg: values.weight_kg,
    duration_seconds: values.duration_seconds,
    rpe: null,
    is_warmup: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

function workoutName(routine, dayIndex) {
  if (!routine) return 'Quick workout';
  const day = routine.days?.[dayIndex];
  const name = routine.days?.length > 1 && day ? `${routine.name} · ${day}` : routine.name;
  return name.slice(0, MAX_NAME);
}

/**
 * Workouts and their sets. Offline-first (CLAUDE.md rule 4):
 *  - every action updates local state (persisted in AsyncStorage) synchronously, so logging a set
 *    never waits on the network;
 *  - the changed rows are then queued (workout before its sets) and the sync engine uploads them;
 *  - deletes are soft deletes, so they sync like any other edit.
 */
export const useWorkoutStore = create(
  persist(
    (set, get) => {
      /** Apply changed rows locally right away, then queue them for upload. */
      async function commit({ workouts = [], sets = [] }) {
        const state = get();
        const nextWorkouts = { ...state.workouts };
        const nextSets = { ...state.sets };
        workouts.forEach((w) => (nextWorkouts[w.id] = w));
        sets.forEach((s) => (nextSets[s.id] = s));
        set({ workouts: nextWorkouts, sets: nextSets });
        for (const w of workouts) await queue.enqueue({ table: 'workouts', payload: workoutPayload(w) });
        for (const s of sets) await queue.enqueue({ table: 'workout_sets', payload: setPayload(s) });
      }

      const touch = (row, patch, now) => ({ ...row, ...patch, updated_at: now });

      function requireSet(setId) {
        const row = get().sets[setId];
        if (!row || row.deleted_at) throw new Error('Set not found');
        return row;
      }

      function requireWorkout(workoutId) {
        const w = get().workouts[workoutId];
        if (!w || w.deleted_at) throw new Error('Workout not found');
        return w;
      }

      return {
        ...initialState,

        /**
         * Start a session, empty or from a routine day. Routine exercises are pre-filled with
         * target sets and the weights used last time. Only one workout can be in progress.
         */
        async startWorkout(
          { routineId = null, dayIndex = 0 } = {},
          { userId = currentUserId(), now = nowIso(), getExercise = defaultGetExercise } = {}
        ) {
          if (selectActiveWorkout(get())) throw new Error('A workout is already in progress');
          const routineState = useRoutineStore.getState();
          const routine = routineId ? routineState.routines[routineId] : null;
          if (routineId && (!routine || routine.deleted_at)) throw new Error('Routine not found');

          const workout = {
            id: newId(),
            user_id: userId,
            routine_id: routine ? routine.id : null,
            routine_day_index: routine ? dayIndex : null,
            name: workoutName(routine, dayIndex),
            started_at: now,
            ended_at: null,
            notes: null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };

          const sets = [];
          if (routine) {
            const items = selectRoutineRows(routineState, routine.id).filter((r) => r.day_index === dayIndex);
            items.forEach((item, order) => {
              const exercise = getExercise(item.exercise_id);
              const history = previousSets(get(), item.exercise_id);
              for (let n = 1; n <= Math.min(item.target_sets, MAX_SETS_PER_EXERCISE); n += 1) {
                const reference = history[n - 1] ?? history[history.length - 1];
                sets.push(
                  newSetRow({
                    workout,
                    exerciseId: item.exercise_id,
                    exerciseOrder: order,
                    setNumber: n,
                    values: setDefaults(exercise, reference, item.target_reps_min),
                    now,
                  })
                );
              }
            });
          }

          await commit({ workouts: [workout], sets });
          return workout.id;
        },

        /** Add an exercise at the end of the workout with one set. Returns its exercise_order. */
        async addExercise(workoutId, exerciseId, { now = nowIso(), getExercise = defaultGetExercise } = {}) {
          const workout = requireWorkout(workoutId);
          const existing = liveSets(get(), workoutId);
          const order = existing.reduce((max, s) => Math.max(max, s.exercise_order), -1) + 1;
          const reference = previousSets(get(), exerciseId, workoutId)[0];
          const row = newSetRow({
            workout,
            exerciseId,
            exerciseOrder: order,
            setNumber: 1,
            values: setDefaults(getExercise(exerciseId), reference),
            now,
          });
          await commit({ sets: [row] });
          return order;
        },

        /** Add a set to an exercise, copying the previous set's values. Returns the new set id. */
        async addSet(workoutId, exerciseOrder, { now = nowIso(), getExercise = defaultGetExercise } = {}) {
          const workout = requireWorkout(workoutId);
          const group = liveSets(get(), workoutId)
            .filter((s) => s.exercise_order === exerciseOrder)
            .sort((a, b) => a.set_number - b.set_number);
          if (group.length === 0) throw new Error('Exercise not found in this workout');
          if (group.length >= MAX_SETS_PER_EXERCISE) return null;
          const last = group[group.length - 1];
          const row = newSetRow({
            workout,
            exerciseId: last.exercise_id,
            exerciseOrder,
            setNumber: last.set_number + 1,
            values: setDefaults(getExercise(last.exercise_id), last),
            now,
          });
          await commit({ sets: [row] });
          return row.id;
        },

        /** Edit reps / weight_kg / duration_seconds / rpe / is_warmup. Values are clamped to valid ranges. */
        async updateSet(setId, patch, { now = nowIso() } = {}) {
          const row = requireSet(setId);
          const clean = cleanSetPatch(patch);
          if (Object.keys(clean).every((k) => row[k] === clean[k])) return false;
          await commit({ sets: [touch(row, clean, now)] });
          return true;
        },

        /** Tick a set done (or undo it). Returns the new completed state. */
        async toggleSetComplete(setId, { now = nowIso() } = {}) {
          const row = requireSet(setId);
          const completed_at = row.completed_at ? null : now;
          await commit({ sets: [touch(row, { completed_at }, now)] });
          return Boolean(completed_at);
        },

        /** Remove a set and renumber the later sets of the same exercise. */
        async removeSet(setId, { now = nowIso() } = {}) {
          const row = requireSet(setId);
          const changed = [touch(row, { deleted_at: now }, now)];
          liveSets(get(), row.workout_id)
            .filter((s) => s.exercise_order === row.exercise_order && s.set_number > row.set_number)
            .forEach((s) => changed.push(touch(s, { set_number: s.set_number - 1 }, now)));
          await commit({ sets: changed });
        },

        /** Remove an exercise (all its sets) from the workout. */
        async removeExercise(workoutId, exerciseOrder, { now = nowIso() } = {}) {
          requireWorkout(workoutId);
          const changed = liveSets(get(), workoutId)
            .filter((s) => s.exercise_order === exerciseOrder)
            .map((s) => touch(s, { deleted_at: now }, now));
          await commit({ sets: changed });
        },

        /**
         * Finish the session: sets that were never ticked are dropped, ended_at is set.
         * Refuses a workout with no completed sets (the UI offers to discard it instead).
         */
        async finishWorkout(workoutId, { notes, now = nowIso() } = {}) {
          const workout = requireWorkout(workoutId);
          if (workout.ended_at) return { ok: false, reason: 'already_finished' };
          const sets = liveSets(get(), workoutId);
          if (!sets.some((s) => s.completed_at)) return { ok: false, reason: 'no_completed_sets' };
          const dropped = sets.filter((s) => !s.completed_at).map((s) => touch(s, { deleted_at: now }, now));
          const trimmed = notes?.trim() ? notes.trim().slice(0, 1000) : workout.notes;
          // started_at may be in the "future" if the device clock moved; keep the database check happy.
          const ended_at = now < workout.started_at ? workout.started_at : now;
          await commit({ workouts: [touch(workout, { ended_at, notes: trimmed ?? null }, now)], sets: dropped });
          return { ok: true, workoutId };
        },

        /** Throw away a workout and all its sets. */
        async discardWorkout(workoutId, { now = nowIso() } = {}) {
          const workout = requireWorkout(workoutId);
          const sets = liveSets(get(), workoutId).map((s) => touch(s, { deleted_at: now }, now));
          await commit({ workouts: [touch(workout, { deleted_at: now }, now)], sets });
        },

        applyRemote(table, rows, cursor) {
          const key = table === 'workouts' ? 'workouts' : 'sets';
          const incoming = key === 'sets' ? rows.map(normalizeSet) : rows;
          const { rows: merged } = mergeRows(get()[key], incoming);
          set({ [key]: merged, cursors: { ...get().cursors, [table]: cursor } });
        },

        reset() {
          set({ ...initialState });
        },
      };
    },
    {
      name: 'gymbuddy.workouts.v1',
      storage: persistStorage,
      partialize: (s) => ({ workouts: s.workouts, sets: s.sets, cursors: s.cursors }),
    }
  )
);

// Pull order: workouts before their sets.
registerPullTarget({
  table: 'workouts',
  columns: WORKOUT_COLUMNS,
  getCursor: () => useWorkoutStore.getState().cursors.workouts,
  applyRemote: (rows, cursor) => useWorkoutStore.getState().applyRemote('workouts', rows, cursor),
});
registerPullTarget({
  table: 'workout_sets',
  columns: WORKOUT_SET_COLUMNS,
  getCursor: () => useWorkoutStore.getState().cursors.workout_sets,
  applyRemote: (rows, cursor) => useWorkoutStore.getState().applyRemote('workout_sets', rows, cursor),
});

// ---- selectors ----
// Selectors that build arrays return a new value every call: in components, wrap them with
// useShallow or useMemo so React does not re-render in a loop.

/** The workout in progress (latest started), or null. */
export const selectActiveWorkout = (s) =>
  Object.values(s.workouts)
    .filter((w) => !w.ended_at && !w.deleted_at)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;

/** Finished workouts, newest first. */
export const selectHistory = (s) =>
  Object.values(s.workouts)
    .filter((w) => w.ended_at && !w.deleted_at)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));

/** Exercises in a workout, in order, each with its sets: [{ exerciseId, exerciseOrder, sets }]. */
export function selectWorkoutExercises(s, workoutId) {
  const groups = new Map();
  for (const row of liveSets(s, workoutId)) {
    if (!groups.has(row.exercise_order))
      groups.set(row.exercise_order, { exerciseId: row.exercise_id, exerciseOrder: row.exercise_order, sets: [] });
    groups.get(row.exercise_order).sets.push(row);
  }
  return [...groups.values()]
    .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    .map((g) => ({ ...g, sets: g.sets.sort((a, b) => a.set_number - b.set_number) }));
}

/**
 * Totals for a workout: completed working sets only (warm-ups excluded from volume).
 * volumeKg = Σ weight_kg × reps.
 */
export function summarizeWorkout(s, workoutId, now = nowIso()) {
  const workout = s.workouts[workoutId];
  const done = liveSets(s, workoutId).filter((r) => r.completed_at);
  const working = done.filter((r) => !r.is_warmup);
  const end = workout?.ended_at ?? now;
  return {
    durationSeconds: workout ? Math.max(0, Math.round((Date.parse(end) - Date.parse(workout.started_at)) / 1000)) : 0,
    exerciseCount: new Set(done.map((r) => r.exercise_order)).size,
    setCount: working.length,
    totalReps: working.reduce((sum, r) => sum + r.reps, 0),
    volumeKg: Math.round(working.reduce((sum, r) => sum + r.weight_kg * r.reps, 0) * 100) / 100,
  };
}
