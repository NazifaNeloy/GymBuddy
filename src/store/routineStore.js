import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as queue from '../services/sync/queue';
import { mergeRows } from '../services/sync/merge';
import { registerPullTarget, syncNow } from '../services/sync/syncEngine';
import { persistStorage } from '../services/storage/persistStorage';
import { newId, nowIso } from '../utils/id';
import { useAuthStore } from './authStore';

export const ROUTINE_COLUMNS =
  'id, user_id, name, description, days, source_template_id, created_at, updated_at, deleted_at, synced_at';
export const ROUTINE_EXERCISE_COLUMNS =
  'id, routine_id, user_id, exercise_id, day_index, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes, created_at, updated_at, deleted_at, synced_at';

// Columns the client is allowed to write (is_template and synced_at are set by the database).
const routinePayload = (r) => ({
  id: r.id,
  user_id: r.user_id,
  name: r.name,
  description: r.description,
  days: r.days,
  source_template_id: r.source_template_id,
  created_at: r.created_at,
  updated_at: r.updated_at,
  deleted_at: r.deleted_at,
});
const routineExercisePayload = (r) => ({
  id: r.id,
  routine_id: r.routine_id,
  user_id: r.user_id,
  exercise_id: r.exercise_id,
  day_index: r.day_index,
  position: r.position,
  target_sets: r.target_sets,
  target_reps_min: r.target_reps_min,
  target_reps_max: r.target_reps_max,
  rest_seconds: r.rest_seconds,
  notes: r.notes,
  created_at: r.created_at,
  updated_at: r.updated_at,
  deleted_at: r.deleted_at,
});

const SAME_ITEM_FIELDS = [
  'exercise_id',
  'day_index',
  'position',
  'target_sets',
  'target_reps_min',
  'target_reps_max',
  'rest_seconds',
  'notes',
  'deleted_at',
];

const initialState = {
  routines: {}, // id -> row (templates have user_id null)
  routineExercises: {}, // id -> row
  cursors: { routines: null, routine_exercises: null },
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  error: null,
};

function currentUserId() {
  const id = useAuthStore.getState().user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/**
 * Routines and their exercises. Offline-first:
 *  - every edit is applied to local state (persisted in AsyncStorage) immediately,
 *  - then queued for upload; the sync engine sends it when online,
 *  - deletes are soft deletes (deleted_at), so they sync like any other edit.
 */
export const useRoutineStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      /** Show local data immediately and sync in the background. */
      async load() {
        const hasData = Object.keys(get().routines).length > 0;
        set(hasData ? { status: 'ready', error: null } : { status: 'loading', error: null });
        const result = await syncNow();
        const nowHasData = Object.keys(get().routines).length > 0;
        if (result.ok || nowHasData) set({ status: 'ready', error: null });
        else
          set({
            status: 'error',
            error: result.offline
              ? "You're offline. Connect once to download the starter routines."
              : "Couldn't load routines. Please try again.",
          });
      },

      applyRemote(table, rows, cursor) {
        const key = table === 'routines' ? 'routines' : 'routineExercises';
        const { rows: merged } = mergeRows(get()[key], rows);
        set({ [key]: merged, cursors: { ...get().cursors, [table]: cursor } });
      },

      /**
       * Save a builder draft: writes changed rows locally and queues them (routine first, then
       * its exercises, so the server always has the parent before the children).
       */
      async saveDraft(draft, { userId = currentUserId(), now = nowIso() } = {}) {
        const state = get();
        const existing = state.routines[draft.id];
        const writes = [];

        const routineRow = {
          ...(existing ?? {}),
          id: draft.id,
          user_id: userId,
          name: draft.name.trim(),
          description: draft.description?.trim() ? draft.description.trim() : null,
          days: draft.days.map((d) => d.trim()),
          source_template_id: draft.sourceTemplateId ?? existing?.source_template_id ?? null,
          created_at: existing?.created_at ?? now,
          updated_at: now,
          deleted_at: null,
        };
        const routineChanged =
          !existing ||
          existing.deleted_at ||
          existing.name !== routineRow.name ||
          existing.description !== routineRow.description ||
          JSON.stringify(existing.days) !== JSON.stringify(routineRow.days);
        const routines = { ...state.routines };
        if (routineChanged) {
          routines[draft.id] = routineRow;
          writes.push({ table: 'routines', payload: routinePayload(routineRow) });
        }

        const routineExercises = { ...state.routineExercises };
        const positions = {};
        const keep = new Set();
        for (const item of draft.items) {
          const position = (positions[item.dayIndex] = (positions[item.dayIndex] ?? -1) + 1);
          keep.add(item.id);
          const old = routineExercises[item.id];
          const row = {
            ...(old ?? {}),
            id: item.id,
            routine_id: draft.id,
            user_id: userId,
            exercise_id: item.exerciseId,
            day_index: item.dayIndex,
            position,
            target_sets: item.targetSets,
            target_reps_min: item.repsMin,
            target_reps_max: item.repsMax,
            rest_seconds: item.restSeconds,
            notes: item.notes?.trim() ? item.notes.trim() : null,
            created_at: old?.created_at ?? now,
            updated_at: now,
            deleted_at: null,
          };
          if (!old || SAME_ITEM_FIELDS.some((f) => old[f] !== row[f])) {
            routineExercises[item.id] = row;
            writes.push({ table: 'routine_exercises', payload: routineExercisePayload(row) });
          }
        }
        // Exercises removed in the builder: soft delete.
        for (const row of Object.values(state.routineExercises)) {
          if (row.routine_id === draft.id && !row.deleted_at && !keep.has(row.id)) {
            const deleted = { ...row, deleted_at: now, updated_at: now };
            routineExercises[row.id] = deleted;
            writes.push({ table: 'routine_exercises', payload: routineExercisePayload(deleted) });
          }
        }

        set({ routines, routineExercises });
        for (const w of writes) await queue.enqueue(w);
        return { routineId: draft.id, changes: writes.length };
      },

      /** Soft-delete a routine and its exercises. */
      async deleteRoutine(routineId, { now = nowIso() } = {}) {
        const state = get();
        const routine = state.routines[routineId];
        if (!routine || !routine.user_id || routine.deleted_at) return false;
        const deletedRoutine = { ...routine, deleted_at: now, updated_at: now };
        const routineExercises = { ...state.routineExercises };
        const writes = [{ table: 'routines', payload: routinePayload(deletedRoutine) }];
        for (const row of Object.values(state.routineExercises)) {
          if (row.routine_id === routineId && !row.deleted_at) {
            routineExercises[row.id] = { ...row, deleted_at: now, updated_at: now };
            writes.push({ table: 'routine_exercises', payload: routineExercisePayload(routineExercises[row.id]) });
          }
        }
        set({ routines: { ...state.routines, [routineId]: deletedRoutine }, routineExercises });
        for (const w of writes) await queue.enqueue(w);
        return true;
      },

      /** Copy a starter routine into the user's own routines so it can be edited. */
      async copyTemplate(templateId, { userId = currentUserId(), now = nowIso() } = {}) {
        const state = get();
        const template = state.routines[templateId];
        if (!template) throw new Error('Routine not found');
        const draft = {
          id: newId(),
          isNew: true,
          name: template.name,
          description: template.description ?? '',
          days: [...template.days],
          sourceTemplateId: template.id,
          items: Object.values(state.routineExercises)
            .filter((r) => r.routine_id === templateId && !r.deleted_at)
            .sort((a, b) => a.day_index - b.day_index || a.position - b.position)
            .map((r) => ({
              id: newId(),
              exerciseId: r.exercise_id,
              dayIndex: r.day_index,
              targetSets: r.target_sets,
              repsMin: r.target_reps_min,
              repsMax: r.target_reps_max,
              restSeconds: r.rest_seconds,
              notes: r.notes ?? '',
            })),
        };
        const { routineId } = await get().saveDraft(draft, { userId, now });
        return routineId;
      },

      reset() {
        set({ ...initialState });
      },
    }),
    {
      name: 'gymbuddy.routines.v1',
      storage: persistStorage,
      partialize: (s) => ({ routines: s.routines, routineExercises: s.routineExercises, cursors: s.cursors }),
    }
  )
);

// Pull order: routines before their exercises.
registerPullTarget({
  table: 'routines',
  columns: ROUTINE_COLUMNS,
  getCursor: () => useRoutineStore.getState().cursors.routines,
  applyRemote: (rows, cursor) => useRoutineStore.getState().applyRemote('routines', rows, cursor),
});
registerPullTarget({
  table: 'routine_exercises',
  columns: ROUTINE_EXERCISE_COLUMNS,
  getCursor: () => useRoutineStore.getState().cursors.routine_exercises,
  applyRemote: (rows, cursor) => useRoutineStore.getState().applyRemote('routine_exercises', rows, cursor),
});

// ---- selectors ----
const byRecent = (a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '');

export const selectMyRoutines = (s) =>
  Object.values(s.routines)
    .filter((r) => r.user_id && !r.deleted_at)
    .sort(byRecent);

export const selectTemplates = (s) =>
  Object.values(s.routines)
    .filter((r) => !r.user_id && !r.deleted_at)
    .sort((a, b) => a.name.localeCompare(b.name));

export const selectRoutineRows = (s, routineId) =>
  Object.values(s.routineExercises)
    .filter((r) => r.routine_id === routineId && !r.deleted_at)
    .sort((a, b) => a.day_index - b.day_index || a.position - b.position);
