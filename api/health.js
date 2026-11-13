// GET /api/health — deployment check. Reports which settings exist, never their values.
import { getServerEnv } from './_lib/env.js';
import { json, preflight } from './_lib/http.js';

export function handleHealth(request, env = getServerEnv()) {
  if (request.method === 'OPTIONS') return preflight();
  return json(200, {
    ok: true,
    service: 'gymbuddy-api',
    configured: { supabase: Boolean(env.supabaseUrl && env.supabaseKey), gemini: Boolean(env.geminiApiKey) },
    model: env.geminiModel,
  });
}

export default {
  fetch(request) {
    return handleHealth(request);
  },
};
