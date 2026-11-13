import { availableExercises, buildPrompt, toRoutineDraft, validatePlanRequest } from './aiPlan';
import { checkRateLimit, __resetRateLimitForTests } from './rateLimit';
import { getServerEnv } from './env';

const ex = (slug, equipment = 'barbell', extra = {}) => ({
  id: `id-${slug}`,
  slug,
  name: slug.replace(/-/g, ' '),
  primary_muscle: 'chest',
  equipment,
  tracking: 'weight_reps',
  ...extra,
});
const library = [
  ex('barbell-bench-press'),
  ex('back-squat'),
  ex('push-up', 'bodyweight'),
  ex('lat-pulldown', 'cable'),
  ex('plank', 'bodyweight', { tracking: 'duration' }),
];
const valid = { goal: 'muscle', experience: 'beginner', daysPerWeek: 3, equipment: ['barbell'] };

describe('validatePlanRequest', () => {
  it('accepts a valid request and applies defaults', () => {
    expect(validatePlanRequest(valid)).toEqual({
      value: { ...valid, minutesPerSession: 60, notes: '' },
    });
  });

  it.each([
    [null, /JSON/],
    [{ ...valid, goal: 'bulk' }, /goal/],
    [{ ...valid, experience: 'pro' }, /experience/],
    [{ ...valid, daysPerWeek: 0 }, /daysPerWeek/],
    [{ ...valid, daysPerWeek: 2.5 }, /daysPerWeek/],
    [{ ...valid, minutesPerSession: 5 }, /minutesPerSession/],
    [{ ...valid, equipment: [] }, /equipment/],
    [{ ...valid, equipment: ['rocket'] }, /equipment/],
    [{ ...valid, notes: 'x'.repeat(301) }, /notes/],
  ])('rejects %p', (body, message) => {
    expect(validatePlanRequest(body).error).toMatch(message);
  });

  it('removes duplicate equipment and trims notes', () => {
    const { value } = validatePlanRequest({ ...valid, equipment: ['barbell', 'barbell'], notes: '  bad knee ' });
    expect(value).toMatchObject({ equipment: ['barbell'], notes: 'bad knee' });
  });
});

describe('availableExercises and prompt', () => {
  it('keeps exercises for the chosen equipment plus bodyweight', () => {
    expect(availableExercises(library, ['barbell']).map((e) => e.slug)).toEqual([
      'barbell-bench-press',
      'back-squat',
      'push-up',
      'plank',
    ]);
  });

  it('lists only allowed slugs and includes the user notes', () => {
    const prompt = buildPrompt({ ...valid, minutesPerSession: 45, notes: 'bad knee' }, availableExercises(library, ['barbell']));
    expect(prompt).toMatch(/exactly 3 distinct day/);
    expect(prompt).toMatch(/- push-up:/);
    expect(prompt).not.toMatch(/lat-pulldown/);
    expect(prompt).toMatch(/bad knee/);
    expect(prompt).toMatch(/plank.*timed in seconds/);
  });
});

describe('toRoutineDraft', () => {
  const usable = availableExercises(library, ['barbell']);

  it('maps slugs to exercise ids and clamps numbers to database limits', () => {
    const draft = toRoutineDraft(
      {
        name: 'Beginner Full Body',
        description: 'Three days a week',
        days: [
          {
            name: 'Day A',
            exercises: [
              { slug: 'back-squat', sets: 50, repsMin: 12, repsMax: 8, restSeconds: 5000 },
              { slug: 'unknown-move', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
              { slug: 'back-squat', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 },
              { slug: 'plank', sets: 3, repsMin: 30, repsMax: 60, restSeconds: 60 },
            ],
          },
        ],
      },
      usable,
      3
    );
    expect(draft.name).toBe('Beginner Full Body');
    expect(draft.days[0].items).toEqual([
      { exerciseId: 'id-back-squat', name: 'back squat', targetSets: 20, repsMin: 12, repsMax: 12, restSeconds: 900 },
      { exerciseId: 'id-plank', name: 'plank', targetSets: 3, repsMin: 30, repsMax: 60, restSeconds: 60 },
    ]);
  });

  it('never returns more days than requested and names empty day names', () => {
    const day = (name) => ({ name, exercises: [{ slug: 'push-up', sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 }] });
    const draft = toRoutineDraft({ name: '', days: [day(''), day('B'), day('C')] }, usable, 2);
    expect(draft.days.map((d) => d.name)).toEqual(['Day 1', 'B']);
    expect(draft.name).toBe('AI plan');
  });

  it('throws when nothing usable comes back', () => {
    expect(() => toRoutineDraft({ name: 'x', days: [{ name: 'A', exercises: [{ slug: 'nope' }] }] }, usable, 1)).toThrow();
    expect(() => toRoutineDraft(null, usable, 1)).toThrow();
  });
});

describe('rate limit and env', () => {
  beforeEach(() => __resetRateLimitForTests());

  it('allows 5 requests per minute per user', () => {
    for (let i = 0; i < 5; i += 1) expect(checkRateLimit('u1', { now: 1000 + i }).allowed).toBe(true);
    expect(checkRateLimit('u1', { now: 1010 })).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(checkRateLimit('u2', { now: 1010 }).allowed).toBe(true);
    expect(checkRateLimit('u1', { now: 61_001 }).allowed).toBe(true);
  });

  it('reads server env with EXPO_PUBLIC fallbacks and a default model', () => {
    expect(
      getServerEnv({ EXPO_PUBLIC_SUPABASE_URL: 'https://x.supabase.co/', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'k', GEMINI_API_KEY: 'g' })
    ).toEqual({ supabaseUrl: 'https://x.supabase.co', supabaseKey: 'k', geminiApiKey: 'g', geminiModel: 'gemini-flash-latest' });
  });
});
