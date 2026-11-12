import * as WebBrowser from 'expo-web-browser';
import * as auth from './auth';
import { getSupabase } from './client';

jest.mock('./client', () => ({ getSupabase: jest.fn() }));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: ({ scheme, path }) => `${scheme}://${path}`,
}));

const session = { access_token: 'at', refresh_token: 'rt', user: { id: 'u1', email: 'n@x.com' } };

function mockClient(overrides = {}) {
  const client = {
    auth: {
      signInWithPassword: jest.fn(async () => ({ data: { session }, error: null })),
      signUp: jest.fn(async () => ({ data: { session: null, user: { id: 'u1', identities: [{}] } }, error: null })),
      resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
      setSession: jest.fn(async () => ({ data: { session }, error: null })),
      exchangeCodeForSession: jest.fn(async () => ({ data: { session }, error: null })),
      signInWithOAuth: jest.fn(async () => ({ data: { url: 'https://supabase/authorize' }, error: null })),
      ...overrides,
    },
  };
  getSupabase.mockReturnValue(client);
  return client;
}

describe('auth service', () => {
  it('normalises the email when signing in', async () => {
    const client = mockClient();
    await auth.signInWithEmail({ email: '  N@X.com ', password: 'pw' });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'n@x.com', password: 'pw' });
  });

  it('maps sign-in errors to friendly messages', async () => {
    mockClient({
      signInWithPassword: jest.fn(async () => ({ data: {}, error: { code: 'invalid_credentials' } })),
    });
    await expect(auth.signInWithEmail({ email: 'n@x.com', password: 'bad' })).rejects.toMatchObject({
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
    });
  });

  it('reports when email confirmation is required and stores the name', async () => {
    const client = mockClient();
    const result = await auth.signUpWithEmail({ displayName: ' Nazifa ', email: 'n@x.com', password: 'gymbuddy1' });
    expect(result).toEqual({ session: null, needsEmailConfirmation: true });
    expect(client.auth.signUp.mock.calls[0][0].options).toEqual({
      data: { full_name: 'Nazifa' },
      emailRedirectTo: 'gymbuddy://auth/callback',
    });
  });

  it('detects an already-registered email (obfuscated sign-up response)', async () => {
    mockClient({
      signUp: jest.fn(async () => ({ data: { session: null, user: { id: 'x', identities: [] } }, error: null })),
    });
    await expect(
      auth.signUpWithEmail({ displayName: 'N', email: 'n@x.com', password: 'gymbuddy1' })
    ).rejects.toMatchObject({ code: 'user_already_exists' });
  });

  it('sends the reset email with the reset-password redirect', async () => {
    const client = mockClient();
    await auth.sendPasswordReset('N@X.com');
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('n@x.com', {
      redirectTo: 'gymbuddy://reset-password',
    });
  });

  describe('handleAuthRedirect', () => {
    it('ignores unrelated links', async () => {
      mockClient();
      expect(await auth.handleAuthRedirect('gymbuddy://home')).toBeNull();
    });

    it('sets the session from a token link and flags recovery', async () => {
      const client = mockClient();
      const result = await auth.handleAuthRedirect(
        'gymbuddy://reset-password#access_token=at&refresh_token=rt&type=recovery'
      );
      expect(client.auth.setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
      expect(result).toEqual({ session, isRecovery: true });
    });

    it('exchanges a PKCE code', async () => {
      const client = mockClient();
      await auth.handleAuthRedirect('gymbuddy://auth/callback?code=abc');
      expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    });

    it('throws a friendly error for expired links', async () => {
      mockClient();
      await expect(
        auth.handleAuthRedirect('gymbuddy://auth/callback#error=access_denied&error_code=otp_expired')
      ).rejects.toMatchObject({ code: 'otp_expired' });
    });
  });

  describe('signInWithGoogle', () => {
    it('returns cancelled when the browser is closed', async () => {
      mockClient();
      WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' });
      expect(await auth.signInWithGoogle()).toEqual({ cancelled: true });
    });

    it('completes sign-in from the redirect URL', async () => {
      const client = mockClient();
      WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
        type: 'success',
        url: 'gymbuddy://auth/callback#access_token=at&refresh_token=rt',
      });
      const result = await auth.signInWithGoogle();
      expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'gymbuddy://auth/callback',
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
        'https://supabase/authorize',
        'gymbuddy://auth/callback'
      );
      expect(result).toEqual({ cancelled: false, session });
    });
  });
});
