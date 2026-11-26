// Estimated one-rep max (Epley): weight × (1 + reps / 30).
// Only meaningful for 1–12 reps with load; matches workout_sets.estimated_1rm_kg in the database.

export const MAX_E1RM_REPS = 12;

const round2 = (n) => Math.round(n * 100) / 100;

/** Estimated 1RM in the same unit as `weight`, or null when the formula does not apply. */
export function epley(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r < 1 || r > MAX_E1RM_REPS) return null;
  return round2(w * (1 + r / 30));
}

/** Estimated 1RM for a logged set row (warm-ups never count). */
export function setE1rm(set) {
  if (!set || set.is_warmup) return null;
  return epley(set.weight_kg, set.reps);
}
