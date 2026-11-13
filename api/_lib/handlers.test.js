/** @jest-environment node */
import { handleAiPlan } from '../ai-plan';
import { handleHealth } from '../health';
import { __resetRateLimitForTests } from './rateLimit';

const env = { supabaseUrl: 'https://proj.supabase.co', supabaseKey: 'pk', geminiApiKey: 'secret-key', geminiModel: 'test-model' };
const exercises = [
  { id: 'e1', slug: 'back-squat', name: 'Back Squat', primary_muscle: 'quads', equipment: 'barbell', tracking: 'weight_reps' },
  { id: 'e2', slug: 'barbell-bench-press', name: 'Barbell Bench Press', primary_muscle: 'chest', equipment: 'barbell', tracking: 'weight_reps' },
  { id: 'e3', slug: 'push-up', name: 'Push-Up', primary_muscle: 'chest', equipment: 'bodyweight', tracking: 'bodyweight_reps' },
];
const geminiPlan = {
  name: 'Strength Start',
  description: 'Simple plan',
  days: [{ name: 'Day A', exercises: [{ slug: 'back-squat', sets: 3, repsMin: 5, repsMax: 8, restSeconds: 150 }] }],
};
const body = { goal: 'strength', experience: 'beginner', daysPerWeek: 1, equipment: ['barbell'] };

const ok = (data, status = 200) => new Response(JSON.stringify(data), { status });

function makeFetch(overrides = {}) {
  return jest.fn(async (url, init = {}) => {
    if (url.endsWith('/auth/v1/user')) return overrides.user ?? ok({ id: 'user-1' });
    if (url.includes('/rest/v1/exercises')) return overrides.exercises ?? ok(exercises);
    if (url.includes('generativelanguage.googleapis.com')) {
      return overrides.gemini ?? ok({ candidates: [{ content: { parts: [{ text: JSON.stringify(geminiPlan) }] } }] });
    }
    throw new Error(`unexpected ${url} ${init.method}`);
  });
}

const request = (init = {}) =>
  new Request('https://gymbuddy.vercel.app/api/ai-plan', {
    method: 'POST',
    headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });

beforeEach(() => __resetRateLimitForTests());

describe('POST /api/ai-plan', () => {
  it('verifies the user, sends the key only to Gemini, and returns a mapped plan', async () => {
    const fetchImpl = makeFetch();
    const res = await handleAiPlan(request(), { env, fetchImpl });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan.days[0].items[0]).toEqual({
      exerciseId: 'e1',
      name: 'Back Squat',
      targetSets: 3,
      repsMin: 5,
      repsMax: 8,
      restSeconds: 150,
    });

    const [authCall, exCall, geminiCall] = fetchImpl.mock.calls;
    expect(authCall[1].headers.Authorization).toBe('Bearer user-token');
    expect(exCall[1].headers.Authorization).toBe('Bearer user-token');
    expect(geminiCall[0]).toContain('/models/test-model:generateContent');
    expect(geminiCall[1].headers['x-goog-api-key']).toBe('secret-key');
    expect(geminiCall[0]).not.toContain('secret-key'); // key in a header, never in the URL
    for (const [, init] of fetchImpl.mock.calls.slice(0, 2)) {
      expect(JSON.stringify(init)).not.toContain('secret-key'); // never sent to Supabase
    }
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('answers CORS preflight and rejects other methods', async () => {
    expect((await handleAiPlan(new Request('https://x/api/ai-plan', { method: 'OPTIONS' }), { env })).status).toBe(204);
    expect((await handleAiPlan(new Request('https://x/api/ai-plan'), { env })).status).toBe(405);
  });

  it('returns 503 when the server is not configured', async () => {
    const res = await handleAiPlan(request(), { env: { ...env, geminiApiKey: '' }, fetchImpl: makeFetch() });
    expect(res.status).toBe(503);
  });

  it('requires a valid Supabase session', async () => {
    const noToken = await handleAiPlan(request({ headers: { 'Content-Type': 'application/json' } }), { env, fetchImpl: makeFetch() });
    expect(noToken.status).toBe(401);
    const badToken = await handleAiPlan(request(), { env, fetchImpl: makeFetch({ user: ok({ msg: 'bad jwt' }, 401) }) });
    expect(badToken.status).toBe(401);
  });

  it('validates the body', async () => {
    const res = await handleAiPlan(request({ body: JSON.stringify({ ...body, daysPerWeek: 9 }) }), { env, fetchImpl: makeFetch() });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/daysPerWeek/);
    const notJson = await handleAiPlan(request({ body: '{oops' }), { env, fetchImpl: makeFetch() });
    expect(notJson.status).toBe(400);
  });

  it('rate-limits each user', async () => {
    const fetchImpl = makeFetch();
    for (let i = 0; i < 5; i += 1) expect((await handleAiPlan(request(), { env, fetchImpl })).status).toBe(200);
    const sixth = await handleAiPlan(request(), { env, fetchImpl });
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('Retry-After')).toBeTruthy();
  });

  it('maps Gemini quota, failures and unusable output to friendly errors', async () => {
    const quota = await handleAiPlan(request(), { env, fetchImpl: makeFetch({ gemini: ok({}, 429) }) });
    expect(quota.status).toBe(429);
    const down = await handleAiPlan(request(), { env, fetchImpl: makeFetch({ gemini: ok({}, 500) }) });
    expect(down.status).toBe(502);
    const junk = await handleAiPlan(request(), {
      env,
      fetchImpl: makeFetch({ gemini: ok({ candidates: [{ content: { parts: [{ text: '{"name":"x","days":[]}' }] } }] }) }),
    });
    expect(junk.status).toBe(502);
    expect((await junk.json()).error).not.toMatch(/secret|stack/i);
  });
});

describe('GET /api/health', () => {
  it('reports configuration without revealing values', async () => {
    const res = handleHealth(new Request('https://x/api/health'), env);
    const data = await res.json();
    expect(data).toEqual({ ok: true, service: 'gymbuddy-api', configured: { supabase: true, gemini: true }, model: 'test-model' });
    expect(JSON.stringify(data)).not.toContain('secret-key');
  });
});
