import {
  addDay,
  addExercises,
  defaultTargets,
  draftFromRoutine,
  emptyDraft,
  isDraftDirty,
  itemsForDay,
  moveItem,
  removeDay,
  removeItem,
  renameDay,
  updateItem,
  validateDraft,
} from './routineDraft';

const bench = { id: 'bench', tracking: 'weight_reps', category: 'compound' };
const curl = { id: 'curl', tracking: 'weight_reps', category: 'isolation' };
const plank = { id: 'plank', tracking: 'duration', category: 'isolation' };
const squat = { id: 'squat', tracking: 'weight_reps', category: 'compound' };

describe('days', () => {
  it('starts with one day and can add up to seven', () => {
    let d = emptyDraft();
    expect(d.days).toEqual(['Day 1']);
    for (let i = 0; i < 10; i += 1) d = addDay(d);
    expect(d.days).toHaveLength(7);
    expect(d.days[6]).toBe('Day 7');
  });

  it('renames a day', () => {
    expect(renameDay(emptyDraft(), 0, 'Push').days).toEqual(['Push']);
  });

  it('removes a day with its exercises and shifts later days down', () => {
    let d = addDay(addDay(emptyDraft()));
    d = addExercises(d, 0, [bench]);
    d = addExercises(d, 1, [squat]);
    d = addExercises(d, 2, [curl]);
    d = removeDay(d, 1);
    expect(d.days).toEqual(['Day 1', 'Day 3']);
    expect(d.items.map((i) => [i.exerciseId, i.dayIndex])).toEqual([
      ['bench', 0],
      ['curl', 1],
    ]);
  });

  it('never removes the last day', () => {
    const d = emptyDraft();
    expect(removeDay(d, 0)).toBe(d);
  });
});

describe('exercises', () => {
  it('adds exercises with beginner-friendly defaults by type', () => {
    expect(defaultTargets(bench)).toEqual({ targetSets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 });
    expect(defaultTargets(curl)).toEqual({ targetSets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 });
    expect(defaultTargets(plank)).toEqual({ targetSets: 3, repsMin: 30, repsMax: 60, restSeconds: 60 });
    const d = addExercises(emptyDraft(), 0, [bench, plank]);
    expect(itemsForDay(d, 0).map((i) => i.exerciseId)).toEqual(['bench', 'plank']);
  });

  it('skips exercises already in the same day, but allows them on other days', () => {
    let d = addDay(emptyDraft());
    d = addExercises(d, 0, [bench]);
    d = addExercises(d, 0, [bench, squat]);
    d = addExercises(d, 1, [bench]);
    expect(itemsForDay(d, 0).map((i) => i.exerciseId)).toEqual(['bench', 'squat']);
    expect(itemsForDay(d, 1).map((i) => i.exerciseId)).toEqual(['bench']);
  });

  it('clamps targets to valid ranges', () => {
    let d = addExercises(emptyDraft(), 0, [bench]);
    const id = d.items[0].id;
    d = updateItem(d, id, { targetSets: 0, restSeconds: 5000 });
    expect(d.items[0]).toMatchObject({ targetSets: 1, restSeconds: 900 });
    d = updateItem(d, id, { targetSets: 99, repsMax: 500 });
    expect(d.items[0]).toMatchObject({ targetSets: 20, repsMax: 100 });
  });

  it('keeps the rep range valid whichever end is edited', () => {
    let d = addExercises(emptyDraft(), 0, [bench]); // 8-12
    const id = d.items[0].id;
    d = updateItem(d, id, { repsMin: 15 });
    expect(d.items[0]).toMatchObject({ repsMin: 15, repsMax: 15 });
    d = updateItem(d, id, { repsMax: 6 });
    expect(d.items[0]).toMatchObject({ repsMin: 6, repsMax: 6 });
  });

  it('moves exercises within a day only', () => {
    let d = addDay(emptyDraft());
    d = addExercises(d, 0, [bench, squat, curl]);
    d = addExercises(d, 1, [plank]);
    const curlId = d.items.find((i) => i.exerciseId === 'curl').id;
    d = moveItem(d, curlId, -1);
    expect(itemsForDay(d, 0).map((i) => i.exerciseId)).toEqual(['bench', 'curl', 'squat']);
    d = moveItem(d, d.items.find((i) => i.exerciseId === 'bench').id, -1); // already first
    expect(itemsForDay(d, 0).map((i) => i.exerciseId)).toEqual(['bench', 'curl', 'squat']);
    expect(itemsForDay(d, 1).map((i) => i.exerciseId)).toEqual(['plank']);
  });

  it('removes an exercise', () => {
    let d = addExercises(emptyDraft(), 0, [bench, squat]);
    d = removeItem(d, d.items[0].id);
    expect(d.items.map((i) => i.exerciseId)).toEqual(['squat']);
  });
});

describe('validation and dirty check', () => {
  it('requires a name and named days', () => {
    expect(validateDraft(emptyDraft())).toEqual({ name: 'Give your routine a name.' });
    const d = renameDay({ ...emptyDraft(), name: 'Push' }, 0, '  ');
    expect(validateDraft(d)).toEqual({ days: 'Every day needs a name.' });
    expect(validateDraft({ ...emptyDraft(), name: 'x'.repeat(61) }).name).toMatch(/60 characters/);
    expect(validateDraft({ ...emptyDraft(), name: 'Push day' })).toEqual({});
  });

  it('detects unsaved changes', () => {
    const d = emptyDraft();
    expect(isDraftDirty(d, { ...d })).toBe(false);
    expect(isDraftDirty(d, { ...d, name: 'Changed' })).toBe(true);
  });
});

describe('draftFromRoutine', () => {
  it('maps stored rows to a draft, ordered, without deleted rows', () => {
    const routine = { id: 'r1', name: 'PPL', description: null, days: ['Push', 'Pull'], source_template_id: 't1' };
    const row = (id, day, pos, extra = {}) => ({
      id,
      routine_id: 'r1',
      exercise_id: id,
      day_index: day,
      position: pos,
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
      rest_seconds: 90,
      notes: null,
      ...extra,
    });
    const d = draftFromRoutine(routine, [
      row('b', 1, 0),
      row('a2', 0, 1),
      row('a1', 0, 0),
      row('gone', 0, 2, { deleted_at: '2026-01-01T00:00:00Z' }),
      { ...row('other', 0, 0), routine_id: 'r2' },
    ]);
    expect(d).toMatchObject({ id: 'r1', isNew: false, name: 'PPL', description: '', sourceTemplateId: 't1' });
    expect(d.items.map((i) => i.id)).toEqual(['a1', 'a2', 'b']);
  });
});
