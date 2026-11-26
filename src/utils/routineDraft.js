import { newId } from './id';

/**
 * Pure helpers for editing a routine in the builder. The builder edits a draft in memory;
 * nothing is written until the user taps Save (see routineStore.saveDraft).
 *
 * Draft: { id, isNew, name, description, days: string[], sourceTemplateId,
 *          items: [{ id, exerciseId, dayIndex, targetSets, repsMin, repsMax, restSeconds, notes }] }
 * Item order inside `items` is the exercise order within each day.
 */

export const LIMITS = {
  maxDays: 7,
  name: 60,
  dayName: 30,
  description: 500,
  sets: [1, 20],
  reps: [1, 100],
  rest: [0, 900],
};

const clamp = (n, [min, max]) => Math.min(max, Math.max(min, Math.round(Number(n) || 0)));

export function emptyDraft() {
  return { id: newId(), isNew: true, name: '', description: '', days: ['Day 1'], sourceTemplateId: null, items: [] };
}

/** Build a draft from stored rows (routine + its routine_exercises). */
export function draftFromRoutine(routine, rows) {
  const items = rows
    .filter((r) => r.routine_id === routine.id && !r.deleted_at)
    .sort((a, b) => a.day_index - b.day_index || a.position - b.position)
    .map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      dayIndex: r.day_index,
      targetSets: r.target_sets,
      repsMin: r.target_reps_min,
      repsMax: r.target_reps_max,
      restSeconds: r.rest_seconds,
      notes: r.notes ?? '',
    }));
  return {
    id: routine.id,
    isNew: false,
    name: routine.name,
    description: routine.description ?? '',
    days: routine.days?.length ? [...routine.days] : ['Day 1'],
    sourceTemplateId: routine.source_template_id ?? null,
    items,
  };
}

export const itemsForDay = (draft, dayIndex) => draft.items.filter((i) => i.dayIndex === dayIndex);

export function addDay(draft) {
  if (draft.days.length >= LIMITS.maxDays) return draft;
  return { ...draft, days: [...draft.days, `Day ${draft.days.length + 1}`] };
}

export function renameDay(draft, dayIndex, name) {
  return { ...draft, days: draft.days.map((d, i) => (i === dayIndex ? name.slice(0, LIMITS.dayName) : d)) };
}

/** Remove a day and its exercises; later days shift down by one. Keeps at least one day. */
export function removeDay(draft, dayIndex) {
  if (draft.days.length <= 1) return draft;
  return {
    ...draft,
    days: draft.days.filter((_, i) => i !== dayIndex),
    items: draft.items
      .filter((i) => i.dayIndex !== dayIndex)
      .map((i) => (i.dayIndex > dayIndex ? { ...i, dayIndex: i.dayIndex - 1 } : i)),
  };
}

/** Sensible starting targets for beginners, by how the exercise is logged. */
export function defaultTargets(exercise) {
  if (exercise?.tracking === 'duration') return { targetSets: 3, repsMin: 30, repsMax: 60, restSeconds: 60 };
  if (exercise?.category === 'isolation') return { targetSets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 };
  return { targetSets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 };
}

/** Append exercises to a day, skipping ones already in that day. */
export function addExercises(draft, dayIndex, exercises) {
  const present = new Set(itemsForDay(draft, dayIndex).map((i) => i.exerciseId));
  const added = exercises
    .filter((e) => e && !present.has(e.id))
    .map((e) => ({ id: newId(), exerciseId: e.id, dayIndex, notes: '', ...defaultTargets(e) }));
  return added.length ? { ...draft, items: [...draft.items, ...added] } : draft;
}

/** Update targets with limits applied; keeps repsMin <= repsMax. */
export function updateItem(draft, itemId, patch) {
  return {
    ...draft,
    items: draft.items.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, ...patch };
      next.targetSets = clamp(next.targetSets, LIMITS.sets);
      next.repsMin = clamp(next.repsMin, LIMITS.reps);
      next.repsMax = clamp(next.repsMax, LIMITS.reps);
      next.restSeconds = clamp(next.restSeconds, LIMITS.rest);
      if (next.repsMin > next.repsMax) {
        if ('repsMin' in patch) next.repsMax = next.repsMin;
        else next.repsMin = next.repsMax;
      }
      return next;
    }),
  };
}

export function removeItem(draft, itemId) {
  return { ...draft, items: draft.items.filter((i) => i.id !== itemId) };
}

/** Move an item up (-1) or down (+1) within its day. */
export function moveItem(draft, itemId, direction) {
  const item = draft.items.find((i) => i.id === itemId);
  if (!item) return draft;
  const dayItems = itemsForDay(draft, item.dayIndex);
  const from = dayItems.findIndex((i) => i.id === itemId);
  const to = from + direction;
  if (to < 0 || to >= dayItems.length) return draft;
  const reordered = dayItems.slice();
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  let k = 0;
  return { ...draft, items: draft.items.map((i) => (i.dayIndex === item.dayIndex ? reordered[k++] : i)) };
}

export function validateDraft(draft) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = 'Give your routine a name.';
  else if (name.length > LIMITS.name) errors.name = `Use ${LIMITS.name} characters or fewer.`;
  if ((draft.description ?? '').length > LIMITS.description) {
    errors.description = `Use ${LIMITS.description} characters or fewer.`;
  }
  if (draft.days.some((d) => !d.trim())) errors.days = 'Every day needs a name.';
  return errors;
}

/** True when the draft differs from the saved version (ignores the isNew flag). */
export function isDraftDirty(original, draft) {
  const strip = ({ isNew, ...rest }) => rest;
  return JSON.stringify(strip(original)) !== JSON.stringify(strip(draft));
}
