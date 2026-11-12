import { getMissingConfig } from './config';

describe('getMissingConfig', () => {
  it('reports missing Supabase values', () => {
    expect(
      getMissingConfig({ supabaseUrl: '', supabasePublishableKey: 'x', apiBaseUrl: '' })
    ).toEqual(['supabaseUrl']);
  });

  it('treats the AI API URL as optional', () => {
    expect(
      getMissingConfig({ supabaseUrl: 'u', supabasePublishableKey: 'k', apiBaseUrl: '' })
    ).toEqual([]);
  });
});
