import { Platform } from 'react-native';
import { config } from '../constants/config';
import { getSupabase } from './supabase/client';

export class AiPlanError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AiPlanError';
    this.status = status;
  }
}

/** Where the API lives: EXPO_PUBLIC_API_BASE_URL, or the same site when running the deployed web build. */
export function getApiBaseUrl(cfg = config, platform = Platform.OS) {
  const base = (cfg.apiBaseUrl ?? '').trim().replace(/\/$/, '');
  if (base) return base;
  return platform === 'web' ? '' : null;
}

/**
 * Ask the Vercel AI proxy for a routine draft.
 * input: { goal, experience, daysPerWeek, minutesPerSession, equipment[], notes }
 * Resolves { plan }. Throws AiPlanError with a user-friendly message.
 */
export async function generatePlan(input, { fetchImpl = fetch, baseUrl = getApiBaseUrl() } = {}) {
  if (baseUrl === null) {
    throw new AiPlanError('The AI planner is not set up in this build (EXPO_PUBLIC_API_BASE_URL is empty).', 0);
  }
  const { data } = await getSupabase().auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new AiPlanError('Sign in to use the AI planner.', 401);

  let res;
  try {
    res = await fetchImpl(`${baseUrl}/api/ai-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiPlanError("Can't reach the AI planner. Check your internet connection.", 0);
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error page
  }
  if (!res.ok) {
    throw new AiPlanError(body?.error || "Couldn't create a plan right now. Please try again.", res.status);
  }
  if (!body?.plan?.days?.length) throw new AiPlanError("Couldn't create a plan right now. Please try again.", 502);
  return body;
}
