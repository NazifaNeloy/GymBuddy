// Display labels for exercise enums stored in the database (see supabase/migrations).

export const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'calves', label: 'Calves' },
  { key: 'core', label: 'Core' },
  { key: 'full_body', label: 'Full body' },
  { key: 'cardio', label: 'Cardio' },
];

export const EQUIPMENT_LABELS = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Band',
  other: 'Other',
};

export const CATEGORY_LABELS = { compound: 'Compound', isolation: 'Isolation', cardio: 'Cardio' };

export const TRACKING_LABELS = {
  weight_reps: 'Weight × reps',
  bodyweight_reps: 'Bodyweight reps',
  duration: 'Timed hold',
};

const MUSCLE_LABELS = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.key, m.label]));

export const muscleLabel = (key) => MUSCLE_LABELS[key] ?? key;
export const equipmentLabel = (key) => EQUIPMENT_LABELS[key] ?? key;
