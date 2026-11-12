import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { hasAuthParams, isRecoveryUrl, parseAuthUrl } from './authUrl';
import { getSupabase } from './client';
import { authError, toAuthError } from './errors';

// Closes the auth popup on web after the OAuth redirect.
WebBrowser.maybeCompleteAuthSession();

/**
 * Redirect targets that must be listed in Supabase → Authentication → URL Configuration.
 * Dev/production builds: gymbuddy://auth/callback, gymbuddy://reset-password
 * Expo Go:               exp://<ip>:8081/--/auth/callback
 * Web:                   <origin>/auth/callback
 */
export function getRedirectUrl(path) {
  return makeRedirectUri({ scheme: 'gymbuddy', path });
}

/** Run a Supabase call, throw its error (if any) as a friendly AuthFlowError, return data. */
async function run(fn) {
  let result;
  try {
    result = await fn();
  } catch (error) {
    throw toAuthError(error);
  }
  if (result?.error) throw toAuthError(result.error);
  return result?.data;
}

const normaliseEmail = (email) => email.trim().toLowerCase();

export async function getSession() {
  const data = await run(() => getSupabase().auth.getSession());
  return data?.session ?? null;
}

/** Subscribe to auth events. Returns an unsubscribe function. */
export function onAuthStateChange(callback) {
  const { data } = getSupabase().auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail({ email, password }) {
  const data = await run(() =>
    getSupabase().auth.signInWithPassword({ email: normaliseEmail(email), password })
  );
  return data.session;
}

/**
 * Create an account. If email confirmation is on (Supabase default) there is no session yet
 * and the user must tap the link in their inbox.
 */
export async function signUpWithEmail({ displayName, email, password }) {
  const data = await run(() =>
    getSupabase().auth.signUp({
      email: normaliseEmail(email),
      password,
      options: {
        data: { full_name: displayName.trim() },
        emailRedirectTo: getRedirectUrl('auth/callback'),
      },
    })
  );
  // With confirmations on, Supabase hides existing accounts by returning a user with no identities.
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw authError('user_already_exists');
  }
  return { session: data?.session ?? null, needsEmailConfirmation: !data?.session };
}

export async function sendPasswordReset(email) {
  await run(() =>
    getSupabase().auth.resetPasswordForEmail(normaliseEmail(email), {
      redirectTo: getRedirectUrl('reset-password'),
    })
  );
}

export async function updatePassword(password) {
  const data = await run(() => getSupabase().auth.updateUser({ password }));
  return data?.user ?? null;
}

export async function signOut() {
  await run(() => getSupabase().auth.signOut());
}

/**
 * Handle a deep link that came back from Supabase (email confirmation, password reset, OAuth).
 * Returns null if the URL is not an auth redirect, otherwise { session, isRecovery }.
 */
export async function handleAuthRedirect(url) {
  const params = parseAuthUrl(url);
  if (!hasAuthParams(params)) return null;

  if (params.error || params.error_code) {
    throw toAuthError({ code: params.error_code || params.error, message: params.error_description });
  }

  const supabase = getSupabase();
  const data = params.code
    ? await run(() => supabase.auth.exchangeCodeForSession(params.code))
    : await run(() =>
        supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
      );

  return { session: data?.session ?? null, isRecovery: isRecoveryUrl(url, params) };
}

/**
 * Google sign-in through Supabase OAuth in the system browser.
 * Returns { cancelled: true } if the user closed the browser.
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();

  if (Platform.OS === 'web') {
    // Full-page redirect; supabase-js picks the session up from the URL on return.
    await run(() =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getRedirectUrl('auth/callback') },
      })
    );
    return { cancelled: false, redirected: true };
  }

  const redirectTo = getRedirectUrl('auth/callback');
  const data = await run(() =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    })
  );

  let result;
  try {
    result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  } catch (error) {
    throw toAuthError(error);
  }
  if (result.type !== 'success') return { cancelled: true };

  const handled = await handleAuthRedirect(result.url);
  if (!handled?.session) throw authError('unknown');
  return { cancelled: false, session: handled.session };
}
