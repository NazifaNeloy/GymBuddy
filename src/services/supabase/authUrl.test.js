import { hasAuthParams, isRecoveryUrl, parseAuthUrl } from './authUrl';

describe('parseAuthUrl', () => {
  it('reads tokens from the fragment', () => {
    const url = 'gymbuddy://auth/callback#access_token=aaa&refresh_token=bbb&expires_in=3600&type=signup';
    expect(parseAuthUrl(url)).toEqual({ access_token: 'aaa', refresh_token: 'bbb', expires_in: '3600', type: 'signup' });
  });

  it('reads errors from the query string and decodes them', () => {
    const url = 'gymbuddy://auth/callback?error=access_denied&error_description=User+cancelled%20login';
    expect(parseAuthUrl(url)).toEqual({ error: 'access_denied', error_description: 'User cancelled login' });
  });

  it('merges query and fragment, fragment wins', () => {
    expect(parseAuthUrl('x://a?type=signup&code=1#type=recovery')).toEqual({ type: 'recovery', code: '1' });
  });

  it('handles Expo Go style URLs and junk safely', () => {
    expect(parseAuthUrl('exp://192.168.0.5:8081/--/auth/callback#access_token=t').access_token).toBe('t');
    expect(parseAuthUrl('gymbuddy://x#a=%E0%A4%A')).toEqual({});
    expect(parseAuthUrl(undefined)).toEqual({});
  });
});

describe('hasAuthParams / isRecoveryUrl', () => {
  it('detects auth redirects', () => {
    expect(hasAuthParams({ access_token: 'x' })).toBe(true);
    expect(hasAuthParams({ code: 'x' })).toBe(true);
    expect(hasAuthParams({ error: 'x' })).toBe(true);
    expect(hasAuthParams({ foo: 'bar' })).toBe(false);
  });

  it('detects password recovery links', () => {
    expect(isRecoveryUrl('gymbuddy://reset-password#access_token=x', {})).toBe(true);
    expect(isRecoveryUrl('gymbuddy://auth/callback', { type: 'recovery' })).toBe(true);
    expect(isRecoveryUrl('gymbuddy://auth/callback', { type: 'signup' })).toBe(false);
  });
});
