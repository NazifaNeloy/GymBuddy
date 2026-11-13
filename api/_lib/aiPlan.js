// Pure helpers for the AI workout planner: input validation, prompt, schema and output mapping.
// No network or secrets here, so everything is unit-testable.

export const GOALS = ['strength', 'muscle', 'general_fitness', 'weight_loss'];
export const LEVELS = ['beginner', 'intermediate', 'advanced'];
export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'];

const GOAL_TEXT = {
  strength: 'get stronger (lower reps, longer rest)',
  muscle: 'build muscle (moderate reps)',
  general_fitness: 'general fitness and health',
  weight_loss: 'lose fat while keeping muscle (moderate reps, shorter rest)',
};

const int = (v) => (Number.isInteger(v) ? v : Number.NaN);

/** Returns { value } or { error } with a user-safe message. */
export function validatePlanRequest(body) {
  if (!body || typeof body !== 'object') return { error: 'Request body must be JSON.' };
  const { goal, experience, daysPerWeek, minutesPerSession = 60, equipment, notes = '' } = body;
  if (!GOALS.includes(goal)) return { error: `goal must be one of: ${GOALS.join(', ')}.` };
  if (!LEVELS.includes(experience)) return { error: `experience must be one of: ${LEVELS.join(', ')}.` };
  const days = int(daysPerWeek);
  if (!(days >= 1 && days <= 6)) return { error: 'daysPerWeek must be a whole number from 1 to 6.' };
  const minutes = int(minutesPerSession);
  if (!(minutes >= 20 && minutes <= 120)) return { error: 'minutesPerSession must be from 20 to 120.' };
  if (!Array.isArray(equipment) || equipment.length === 0 || equipment.some((e) => !EQUIPMENT.includes(e))) {
    return { error: `equipment must be a non-empty list from: ${EQUIPMENT.join(', ')}.` };
  }
  if (typeof notes !== 'string' || notes.length > 300) return { error: 'notes must be text up to 300 characters.' };
  return {
    value: { goal, experience, daysPerWeek: days, minutesPerSession: minutes, equipment: [...new Set(equipment)], notes: notes.trim() },
  };
}

/** Exercises the user can actually do with their equipment (bodyweight is always available). */
export function availableExercises(exercises, equipment) {
  const allowed = new Set([...equipment, 'bodyweight']);
  return exercises.filter((e) => e.slug && allowed.has(e.equipment));
}

export function buildPrompt(input, exercises) {
  const list = exercises
    .map((e) => `- ${e.slug}: ${e.name} (${e.primary_muscle}, ${e.equipment}, ${e.tracking === 'duration' ? 'timed in seconds' : 'reps'})`)
    .join('\n');
  return [
    'You are a certified strength coach writing a safe gym plan for a university student.',
    `Goal: ${GOAL_TEXT[input.goal]}. Experience: ${input.experience}.`,
    `Training days per week: ${input.daysPerWeek}. Time per session: about ${input.minutesPerSession} minutes.`,
    input.notes ? `Notes from the user (respect any injury or preference): ${input.notes}` : '',
    `Create exactly ${input.daysPerWeek} distinct day(s). Use ONLY exercise slugs from this list:`,
    list,
    'Rules: 4-7 exercises per day; compound lifts first; balance push, pull and legs across the week;',
    'beginners use fewer sets and simpler lifts; for timed exercises reps mean seconds;',
    'rest is in seconds. Keep the plan name under 40 characters and the description under 200.',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Gemini structured-output schema (OpenAPI subset). */
export const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                slug: { type: 'STRING' },
                sets: { type: 'INTEGER' },
                repsMin: { type: 'INTEGER' },
                repsMax: { type: 'INTEGER' },
                restSeconds: { type: 'INTEGER' },
              },
              required: ['slug', 'sets', 'repsMin', 'repsMax', 'restSeconds'],
            },
          },
        },
        required: ['name', 'exercises'],
      },
    },
  },
  required: ['name', 'days'],
};

const clamp = (n, min, max, fallback) => {
  const x = Math.round(Number(n));
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
};

/**
 * Turn model output into a routine draft the app can save. Unknown slugs and duplicate
 * exercises are dropped; numbers are clamped to the database limits. Throws if nothing usable.
 */
export function toRoutineDraft(plan, exercises, daysPerWeek) {
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  const days = (Array.isArray(plan?.days) ? plan.days : [])
    .slice(0, Math.min(7, daysPerWeek))
    .map((day, i) => {
      const seen = new Set();
      const items = (Array.isArray(day?.exercises) ? day.exercises : [])
        .filter((x) => bySlug.has(x?.slug) && !seen.has(x.slug) && seen.add(x.slug))
        .slice(0, 10)
        .map((x) => {
          const ex = bySlug.get(x.slug);
          const repsMin = clamp(x.repsMin, 1, 100, 8);
          const repsMax = Math.max(repsMin, clamp(x.repsMax, 1, 100, 12));
          return {
            exerciseId: ex.id,
            name: ex.name,
            targetSets: clamp(x.sets, 1, 20, 3),
            repsMin,
            repsMax,
            restSeconds: clamp(x.restSeconds, 0, 900, 90),
          };
        });
      const name = String(day?.name ?? '').trim().slice(0, 30) || `Day ${i + 1}`;
      return { name, items };
    })
    .filter((d) => d.items.length > 0);

  if (days.length === 0) throw new Error('The AI plan had no usable exercises.');
  return {
    name: String(plan.name ?? '').trim().slice(0, 60) || 'AI plan',
    description: String(plan.description ?? '').trim().slice(0, 500),
    days,
  };
}
