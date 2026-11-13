// POST /api/ai-plan — AI workout planner (Vercel Function).
// The Gemini key stays on the server. Callers must send their Supabase access token:
//   Authorization: Bearer <access_token>
// Body: { goal, experience, daysPerWeek, minutesPerSession?, equipment[], notes? }
// Returns: { plan: { name, description, days: [{ name, items: [{ exerciseId, name, targetSets, repsMin, repsMax, restSeconds }] }] } }

import { availableExercises, buildPrompt, PLAN_SCHEMA, toRoutineDraft, validatePlanRequest } from './_lib/aiPlan.js';
import { getServerEnv } from './_lib/env.js';
import { json, preflight } from './_lib/http.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import { fetchBuiltInExercises, generateJson, getSupabaseUser } from './_lib/upstream.js';

export async function handleAiPlan(request, { env = getServerEnv(), fetchImpl = fetch } = {}) {
  if (request.method === 'OPTIONS') return preflight();
  if (request.method !== 'POST') return json(405, { error: 'Use POST.' }, { Allow: 'POST, OPTIONS' });

  if (!env.supabaseUrl || !env.supabaseKey || !env.geminiApiKey) {
    return json(503, { error: 'The AI planner is not configured on the server yet.' });
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return json(401, { error: 'Sign in to use the AI planner.' });

  let user;
  try {
    user = await getSupabaseUser({ ...env, token, fetchImpl });
  } catch {
    return json(502, { error: "Couldn't verify your sign-in. Please try again." });
  }
  if (!user) return json(401, { error: 'Your session has expired. Please sign in again.' });

  const limit = checkRateLimit(user.id);
  if (!limit.allowed) {
    return json(429, { error: 'Too many plan requests. Please wait a minute.' }, { 'Retry-After': String(limit.retryAfterSeconds) });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Request body must be JSON.' });
  }
  const { value: input, error } = validatePlanRequest(body);
  if (error) return json(400, { error });

  try {
    const all = await fetchBuiltInExercises({ ...env, token, fetchImpl });
    const usable = availableExercises(all, input.equipment);
    if (usable.length < 3) return json(400, { error: 'Not enough exercises for that equipment. Add more equipment.' });

    const raw = await generateJson({
      apiKey: env.geminiApiKey,
      model: env.geminiModel,
      prompt: buildPrompt(input, usable),
      schema: PLAN_SCHEMA,
      fetchImpl,
    });
    return json(200, { plan: toRoutineDraft(raw, usable, input.daysPerWeek) });
  } catch (e) {
    if (e?.status === 429) return json(429, { error: 'The free AI quota is used up for now. Try again later.' });
    if (e?.name === 'AbortError') return json(504, { error: 'The AI took too long. Please try again.' });
    console.error('ai-plan failed:', e?.message);
    return json(502, { error: "Couldn't create a plan right now. Please try again." });
  }
}

export default {
  fetch(request) {
    return handleAiPlan(request);
  },
};
