import { getSupabase } from './supabase/client';
import { AiPlanError, generatePlan, getApiBaseUrl } from './ai';

jest.mock('./supabase/client', () => ({ getSupabase: jest.fn() }));

const input = { goal: 'muscle', experience: 'beginner', daysPerWeek: 3, equipment: ['dumbbell'] };
const plan = { name: 'P', description: '', days: [{ name: 'A', items: [{ exerciseId: 'e1' }] }] };
const respond = (status, body) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  getSupabase.mockReturnValue({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } });
});

describe('getApiBaseUrl', () => {
  it('uses the configured URL without a trailing slash', () => {
    expect(getApiBaseUrl({ apiBaseUrl: 'https://gymbuddy.vercel.app/' }, 'ios')).toBe('https://gymbuddy.vercel.app');
  });
  it('uses the same site on web and reports "not configured" on native', () => {
    expect(getApiBaseUrl({ apiBaseUrl: '' }, 'web')).toBe('');
    expect(getApiBaseUrl({ apiBaseUrl: '' }, 'android')).toBeNull();
  });
});

describe('generatePlan', () => {
  it('posts the input with the user token and returns the plan', async () => {
    const fetchImpl = jest.fn(async () => respond(200, { plan }));
    await expect(generatePlan(input, { fetchImpl, baseUrl: 'https://api.test' })).resolves.toEqual({ plan });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test/api/ai-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
      body: JSON.stringify(input),
    });
  });

  it('shows the server message on errors', async () => {
    const fetchImpl = async () => respond(429, { error: 'Too many plan requests. Please wait a minute.' });
    await expect(generatePlan(input, { fetchImpl, baseUrl: '' })).rejects.toMatchObject({
      status: 429,
      message: 'Too many plan requests. Please wait a minute.',
    });
  });

  it('handles offline, signed-out and not-configured cases', async () => {
    await expect(generatePlan(input, { fetchImpl: async () => { throw new TypeError('Network request failed'); }, baseUrl: '' })).rejects.toThrow(/internet/);
    await expect(generatePlan(input, { baseUrl: null })).rejects.toBeInstanceOf(AiPlanError);
    getSupabase.mockReturnValue({ auth: { getSession: async () => ({ data: { session: null } }) } });
    await expect(generatePlan(input, { baseUrl: '' })).rejects.toMatchObject({ status: 401 });
  });
});
