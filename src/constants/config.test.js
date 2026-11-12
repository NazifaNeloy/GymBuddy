import { getMissingConfig } from './config';

const ok = { supabaseUrl: 'https://abcd1234.supabase.co', supabasePublishableKey: 'sb_publishable_abc', apiBaseUrl: '' };

describe('getMissingConfig', () => {
  it('accepts real values and treats the AI API URL as optional', () => {
    expect(getMissingConfig(ok)).toEqual([]);
  });

  it('reports empty values', () => {
    expect(getMissingConfig({ ...ok, supabaseUrl: '' })).toEqual(['supabaseUrl']);
  });

  it('reports placeholders copied from .env.example', () => {
    expect(
      getMissingConfig({
        supabaseUrl: 'https://your-project-ref.supabase.co',
        supabasePublishableKey: 'sb_publishable_xxxxxxxxxxxxxxxx',
        apiBaseUrl: '',
      })
    ).toEqual(['supabaseUrl', 'supabasePublishableKey']);
  });

  it('reports malformed values (quotes, wrong host, wrong key type)', () => {
    expect(getMissingConfig({ ...ok, supabaseUrl: '"https://abcd1234.supabase.co"' })).toEqual(['supabaseUrl']);
    expect(getMissingConfig({ ...ok, supabaseUrl: 'https://supabase.com/dashboard/project/abcd' })).toEqual(['supabaseUrl']);
    expect(getMissingConfig({ ...ok, supabasePublishableKey: 'my key' })).toEqual(['supabasePublishableKey']);
  });

  it('accepts a legacy anon JWT key and a local Supabase URL', () => {
    expect(getMissingConfig({ ...ok, supabaseUrl: 'http://127.0.0.1:54321', supabasePublishableKey: 'a.b.c' })).toEqual([]);
  });
});
