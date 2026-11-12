import { equipmentLabel, muscleLabel } from '../constants/exercises';

/** Lower-case, strip accents and punctuation so "Pull-up" matches "pullup" and "pull up". */
export function normalise(text) {
  return (text ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchableText(exercise) {
  return normalise(
    [
      exercise.name,
      muscleLabel(exercise.primary_muscle),
      ...(exercise.secondary_muscles ?? []).map(muscleLabel),
      equipmentLabel(exercise.equipment),
    ].join(' ')
  );
}

/**
 * Filter by free-text query (every word must match name, muscles or equipment)
 * and by a set of selected primary muscle groups (empty = all). Result is sorted by name.
 */
export function filterExercises(exercises, { query = '', muscles = [] } = {}) {
  const words = normalise(query).split(' ').filter(Boolean);
  const squashed = normalise(query).replace(/ /g, '');
  const muscleSet = new Set(muscles);

  return exercises
    .filter((e) => !e.deleted_at)
    .filter((e) => muscleSet.size === 0 || muscleSet.has(e.primary_muscle))
    .filter((e) => {
      if (words.length === 0) return true;
      const text = searchableText(e);
      if (words.every((w) => text.includes(w))) return true;
      // Also match when the user types without spaces/hyphens: "pullup" → "Pull-Up".
      return squashed.length > 2 && text.replace(/ /g, '').includes(squashed);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Muscle groups that actually have exercises, in the canonical display order. */
export function availableMuscleGroups(exercises, allGroups) {
  const present = new Set(exercises.filter((e) => !e.deleted_at).map((e) => e.primary_muscle));
  return allGroups.filter((g) => present.has(g.key));
}
