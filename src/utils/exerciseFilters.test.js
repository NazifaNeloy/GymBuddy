import { MUSCLE_GROUPS } from '../constants/exercises';
import { availableMuscleGroups, filterExercises, normalise } from './exerciseFilters';

const ex = (name, primary_muscle, extra = {}) => ({
  id: name,
  name,
  primary_muscle,
  secondary_muscles: [],
  equipment: 'barbell',
  ...extra,
});

const library = [
  ex('Barbell Bench Press', 'chest', { secondary_muscles: ['triceps', 'shoulders'] }),
  ex('Pull-Up', 'back', { equipment: 'bodyweight', secondary_muscles: ['biceps'] }),
  ex('Lat Pulldown', 'back', { equipment: 'cable' }),
  ex('Dumbbell Curl', 'biceps', { equipment: 'dumbbell' }),
  ex('Back Squat', 'quads'),
  ex('Deleted Thing', 'chest', { deleted_at: '2026-01-01' }),
];

const names = (list) => list.map((e) => e.name);

describe('normalise', () => {
  it('lower-cases and strips accents and punctuation', () => {
    expect(normalise('  Pull-Up / Café ')).toBe('pull up cafe');
  });
});

describe('filterExercises', () => {
  it('returns everything (sorted, without deleted rows) when no filters are set', () => {
    expect(names(filterExercises(library))).toEqual([
      'Back Squat',
      'Barbell Bench Press',
      'Dumbbell Curl',
      'Lat Pulldown',
      'Pull-Up',
    ]);
  });

  it('searches names case-insensitively', () => {
    expect(names(filterExercises(library, { query: 'BENCH' }))).toEqual(['Barbell Bench Press']);
  });

  it('matches across hyphens and missing spaces', () => {
    expect(names(filterExercises(library, { query: 'pull up' }))).toEqual(['Pull-Up']);
    expect(names(filterExercises(library, { query: 'pullup' }))).toEqual(['Pull-Up']);
  });

  it('searches muscles and equipment too', () => {
    expect(names(filterExercises(library, { query: 'triceps' }))).toEqual(['Barbell Bench Press']);
    expect(names(filterExercises(library, { query: 'cable' }))).toEqual(['Lat Pulldown']);
  });

  it('requires every word to match', () => {
    expect(names(filterExercises(library, { query: 'dumbbell curl' }))).toEqual(['Dumbbell Curl']);
    expect(filterExercises(library, { query: 'dumbbell squat' })).toEqual([]);
  });

  it('filters by selected primary muscle groups', () => {
    expect(names(filterExercises(library, { muscles: ['back'] }))).toEqual(['Lat Pulldown', 'Pull-Up']);
    expect(names(filterExercises(library, { muscles: ['back', 'quads'] }))).toEqual([
      'Back Squat',
      'Lat Pulldown',
      'Pull-Up',
    ]);
  });

  it('combines search and muscle filters', () => {
    expect(names(filterExercises(library, { query: 'pull', muscles: ['back'] }))).toEqual([
      'Lat Pulldown',
      'Pull-Up',
    ]);
    expect(filterExercises(library, { query: 'bench', muscles: ['back'] })).toEqual([]);
  });
});

describe('availableMuscleGroups', () => {
  it('lists only groups with exercises, in display order', () => {
    expect(availableMuscleGroups(library, MUSCLE_GROUPS).map((g) => g.key)).toEqual([
      'chest',
      'back',
      'biceps',
      'quads',
    ]);
  });
});
