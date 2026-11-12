import * as authService from '../services/supabase/auth';
import { authError } from '../services/supabase/errors';
import { useAuthStore } from './authStore';

jest.mock('../services/supabase/auth', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  sendPasswordReset: jest.fn(),
  updatePassword: jest.fn(),
  signOut: jest.fn(),
  handleAuthRedirect: jest.fn(),
}));

const user = { id: 'user-1', email: 'nazifa@example.com' };
const session = { access_token: 'at', refresh_token: 'rt', user };
const store = () => useAuthStore.getState();

let emitAuthEvent;
const unsubscribeSpy = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  store().teardown();
  authService.onAuthStateChange.mockImplementation((cb) => {
    emitAuthEvent = cb;
    return unsubscribeSpy;
  });
  authService.getSession.mockResolvedValue(null);
});

describe('init', () => {
  it('starts in the initializing state', () => {
    expect(store().status).toBe('initializing');
  });

  it('restores a stored session (works offline)', async () => {
    authService.getSession.mockResolvedValue(session);
    await store().init();
    expect(store()).toMatchObject({ status: 'signedIn', session, user });
  });

  it('is signed out when nothing is stored', async () => {
    await store().init();
    expect(store()).toMatchObject({ status: 'signedOut', session: null, user: null });
  });

  it('falls back to signed out with a message if reading the session fails', async () => {
    authService.getSession.mockRejectedValue(authError('network'));
    await store().init();
    expect(store().status).toBe('signedOut');
    expect(store().error).toMatch(/internet connection/);
  });

  it('subscribes only once', async () => {
    await store().init();
    await store().init();
    expect(authService.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('teardown unsubscribes and resets', async () => {
    await store().init();
    store().teardown();
    expect(unsubscribeSpy).toHaveBeenCalled();
    expect(store().status).toBe('initializing');
  });
});

describe('auth events', () => {
  beforeEach(async () => {
    await store().init();
  });

  it('updates the session on SIGNED_IN and TOKEN_REFRESHED', () => {
    emitAuthEvent('SIGNED_IN', session);
    expect(store().status).toBe('signedIn');
    const refreshed = { ...session, access_token: 'new' };
    emitAuthEvent('TOKEN_REFRESHED', refreshed);
    expect(store().session.access_token).toBe('new');
  });

  it('clears everything on SIGNED_OUT', () => {
    emitAuthEvent('SIGNED_IN', session);
    emitAuthEvent('PASSWORD_RECOVERY', session);
    emitAuthEvent('SIGNED_OUT', null);
    expect(store()).toMatchObject({ status: 'signedOut', session: null, isPasswordRecovery: false });
  });

  it('flags password recovery', () => {
    emitAuthEvent('PASSWORD_RECOVERY', session);
    expect(store()).toMatchObject({ isPasswordRecovery: true, status: 'signedIn' });
  });
});

describe('signIn', () => {
  it('shows pending while running and stores the session on success', async () => {
    let resolve;
    authService.signInWithEmail.mockReturnValue(new Promise((r) => (resolve = r)));
    const promise = store().signIn({ email: 'nazifa@example.com', password: 'gymbuddy1' });
    expect(store().pending).toBe('signIn');
    resolve(session);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(store()).toMatchObject({ pending: null, status: 'signedIn', user, error: null });
  });

  it('exposes a friendly error on failure', async () => {
    authService.signInWithEmail.mockRejectedValue(authError('invalid_credentials'));
    const result = await store().signIn({ email: 'x@y.com', password: 'wrong' });
    expect(result).toEqual({ ok: false, code: 'invalid_credentials' });
    expect(store()).toMatchObject({ pending: null, status: 'initializing', error: 'Email or password is incorrect.' });
  });

  it('wraps unexpected errors without leaking raw text', async () => {
    authService.signInWithEmail.mockRejectedValue(new Error('pq: internal'));
    await store().signIn({ email: 'x@y.com', password: 'pw' });
    expect(store().error).toBe('Something went wrong. Please try again.');
  });

  it('clears the previous error when retrying', async () => {
    authService.signInWithEmail.mockRejectedValueOnce(authError('invalid_credentials')).mockResolvedValueOnce(session);
    await store().signIn({ email: 'x@y.com', password: 'bad' });
    await store().signIn({ email: 'x@y.com', password: 'good' });
    expect(store().error).toBeNull();
  });
});

describe('signUp', () => {
  const form = { displayName: 'Nazifa', email: 'nazifa@example.com', password: 'gymbuddy1' };

  it('asks the user to confirm their email when there is no session yet', async () => {
    authService.signUpWithEmail.mockResolvedValue({ session: null, needsEmailConfirmation: true });
    const result = await store().signUp(form);
    expect(authService.signUpWithEmail).toHaveBeenCalledWith(form);
    expect(result).toEqual({ ok: true, needsEmailConfirmation: true });
    expect(store().notice).toMatch(/confirmation link to nazifa@example.com/);
    expect(store().session).toBeNull();
  });

  it('signs in straight away when confirmation is disabled', async () => {
    authService.signUpWithEmail.mockResolvedValue({ session, needsEmailConfirmation: false });
    await store().signUp(form);
    expect(store().status).toBe('signedIn');
  });

  it('reports an existing account', async () => {
    authService.signUpWithEmail.mockRejectedValue(authError('user_already_exists'));
    const result = await store().signUp(form);
    expect(result.code).toBe('user_already_exists');
    expect(store().error).toMatch(/already exists/);
  });
});

describe('signInWithGoogle', () => {
  it('stores the session on success', async () => {
    authService.signInWithGoogle.mockResolvedValue({ cancelled: false, session });
    await expect(store().signInWithGoogle()).resolves.toEqual({ ok: true, cancelled: false });
    expect(store().status).toBe('signedIn');
  });

  it('treats closing the browser as a quiet cancel', async () => {
    authService.signInWithGoogle.mockResolvedValue({ cancelled: true });
    await expect(store().signInWithGoogle()).resolves.toEqual({ ok: true, cancelled: true });
    expect(store().error).toBeNull();
  });

  it('shows an error when the provider is not configured', async () => {
    authService.signInWithGoogle.mockRejectedValue(authError('provider_disabled'));
    await store().signInWithGoogle();
    expect(store().error).toMatch(/not enabled/);
  });
});

describe('password reset', () => {
  it('confirms the email was sent without revealing if the account exists', async () => {
    authService.sendPasswordReset.mockResolvedValue();
    await store().requestPasswordReset(' nazifa@example.com ');
    expect(authService.sendPasswordReset).toHaveBeenCalledWith(' nazifa@example.com ');
    expect(store().notice).toMatch(/^If an account exists for nazifa@example.com/);
  });

  it('surfaces rate limits', async () => {
    authService.sendPasswordReset.mockRejectedValue(authError('over_email_send_rate_limit'));
    await store().requestPasswordReset('nazifa@example.com');
    expect(store().error).toMatch(/Too many emails/);
  });

  it('updatePassword ends recovery mode', async () => {
    useAuthStore.setState({ isPasswordRecovery: true, status: 'signedIn', session });
    authService.updatePassword.mockResolvedValue(user);
    await store().updatePassword('newpass123');
    expect(store()).toMatchObject({ isPasswordRecovery: false, notice: 'Your password has been updated.' });
  });

  it('updatePassword keeps recovery mode on failure', async () => {
    useAuthStore.setState({ isPasswordRecovery: true });
    authService.updatePassword.mockRejectedValue(authError('same_password'));
    await store().updatePassword('samepass1');
    expect(store()).toMatchObject({ isPasswordRecovery: true, error: expect.stringMatching(/different/) });
  });

  it('cancelPasswordRecovery leaves recovery mode', () => {
    useAuthStore.setState({ isPasswordRecovery: true, error: 'x' });
    store().cancelPasswordRecovery();
    expect(store()).toMatchObject({ isPasswordRecovery: false, error: null });
  });
});

describe('handleDeepLink', () => {
  const recoveryUrl = 'gymbuddy://reset-password#access_token=at&refresh_token=rt&type=recovery';

  it('opens recovery mode from a reset link', async () => {
    authService.handleAuthRedirect.mockResolvedValue({ session, isRecovery: true });
    await expect(store().handleDeepLink(recoveryUrl)).resolves.toEqual({ ok: true, handled: true });
    expect(store()).toMatchObject({ status: 'signedIn', isPasswordRecovery: true });
  });

  it('ignores links that are not auth redirects', async () => {
    authService.handleAuthRedirect.mockResolvedValue(null);
    await expect(store().handleDeepLink('gymbuddy://home')).resolves.toEqual({ ok: true, handled: false });
    expect(store().status).toBe('initializing');
  });

  it('handles the same URL only once', async () => {
    authService.handleAuthRedirect.mockResolvedValue({ session, isRecovery: false });
    await store().handleDeepLink('gymbuddy://auth/callback#access_token=a');
    await store().handleDeepLink('gymbuddy://auth/callback#access_token=a');
    expect(authService.handleAuthRedirect).toHaveBeenCalledTimes(1);
  });

  it('ignores empty URLs', async () => {
    await store().handleDeepLink(null);
    expect(authService.handleAuthRedirect).not.toHaveBeenCalled();
  });

  it('shows expired-link errors', async () => {
    authService.handleAuthRedirect.mockRejectedValue(authError('otp_expired'));
    await store().handleDeepLink('gymbuddy://auth/callback#error_code=otp_expired');
    expect(store().error).toMatch(/expired/);
  });
});

describe('signOut and messages', () => {
  it('clears the session', async () => {
    useAuthStore.setState({ ...{ status: 'signedIn', session, user }, isPasswordRecovery: true });
    authService.signOut.mockResolvedValue();
    await store().signOut();
    expect(store()).toMatchObject({ status: 'signedOut', session: null, user: null, isPasswordRecovery: false });
  });

  it('keeps the user signed in if sign-out fails (e.g. offline)', async () => {
    useAuthStore.setState({ status: 'signedIn', session, user });
    authService.signOut.mockRejectedValue(authError('network'));
    const result = await store().signOut();
    expect(result.ok).toBe(false);
    expect(store()).toMatchObject({ status: 'signedIn', error: expect.stringMatching(/internet/) });
  });

  it('clearMessages resets error and notice', () => {
    useAuthStore.setState({ error: 'e', notice: 'n' });
    store().clearMessages();
    expect(store()).toMatchObject({ error: null, notice: null });
  });
});
