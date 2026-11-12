import { create } from 'zustand';
import * as authService from '../services/supabase/auth';
import { toAuthError } from '../services/supabase/errors';

/**
 * Auth state for the whole app.
 *
 * status:   'initializing' (reading the stored session) | 'signedIn' | 'signedOut'
 * pending:  which action is running ('signIn' | 'signUp' | 'google' | 'resetRequest' |
 *           'updatePassword' | 'signOut' | 'deepLink') or null; drives button spinners
 * error:    friendly error message for the current screen, or null
 * notice:   friendly success message (e.g. "check your inbox"), or null
 * isPasswordRecovery: true after opening a reset link, until a new password is saved
 */
const initialState = {
  status: 'initializing',
  session: null,
  user: null,
  isPasswordRecovery: false,
  pending: null,
  error: null,
  notice: null,
};

let unsubscribe = null;
let lastHandledUrl = null;

const sessionState = (session) => ({
  session: session ?? null,
  user: session?.user ?? null,
  status: session ? 'signedIn' : 'signedOut',
});

export const useAuthStore = create((set, get) => {
  /** Run an action with pending/error bookkeeping. Resolves { ok, code? } and never throws. */
  async function perform(name, fn) {
    set({ pending: name, error: null, notice: null });
    try {
      const extra = await fn();
      set({ pending: null });
      return { ok: true, ...(extra ?? {}) };
    } catch (e) {
      const err = toAuthError(e);
      set({ pending: null, error: err.message });
      return { ok: false, code: err.code };
    }
  }

  return {
    ...initialState,

    /** Load the stored session and listen for auth changes. Safe to call more than once. */
    async init() {
      if (unsubscribe) return;
      try {
        unsubscribe = authService.onAuthStateChange((event, session) => get().applyAuthEvent(event, session));
        const session = await authService.getSession();
        set(sessionState(session));
      } catch (e) {
        set({ ...sessionState(null), error: toAuthError(e).message });
      }
    },

    /** Stop listening and reset (used by tests and when the app unmounts). */
    teardown() {
      unsubscribe?.();
      unsubscribe = null;
      lastHandledUrl = null;
      set({ ...initialState });
    },

    applyAuthEvent(event, session) {
      if (event === 'SIGNED_OUT') {
        set({ ...sessionState(null), isPasswordRecovery: false });
        return;
      }
      if (event === 'PASSWORD_RECOVERY') set({ isPasswordRecovery: true });
      set(sessionState(session));
    },

    signIn({ email, password }) {
      return perform('signIn', async () => {
        const session = await authService.signInWithEmail({ email, password });
        set(sessionState(session));
      });
    },

    signUp({ displayName, email, password }) {
      return perform('signUp', async () => {
        const { session, needsEmailConfirmation } = await authService.signUpWithEmail({
          displayName,
          email,
          password,
        });
        if (needsEmailConfirmation) {
          set({
            notice: `We sent a confirmation link to ${email.trim()}. Open it on this phone to finish creating your account.`,
          });
        } else {
          set(sessionState(session));
        }
        return { needsEmailConfirmation };
      });
    },

    signInWithGoogle() {
      return perform('google', async () => {
        const result = await authService.signInWithGoogle();
        if (result?.session) set(sessionState(result.session));
        return { cancelled: Boolean(result?.cancelled) };
      });
    },

    requestPasswordReset(email) {
      return perform('resetRequest', async () => {
        await authService.sendPasswordReset(email);
        set({
          notice: `If an account exists for ${email.trim()}, we've sent a reset link. Open it on this phone to choose a new password.`,
        });
      });
    },

    updatePassword(password) {
      return perform('updatePassword', async () => {
        await authService.updatePassword(password);
        set({ isPasswordRecovery: false, notice: 'Your password has been updated.' });
      });
    },

    /** Leave the reset screen without changing the password (user stays signed in). */
    cancelPasswordRecovery() {
      set({ isPasswordRecovery: false, error: null });
    },

    signOut() {
      return perform('signOut', async () => {
        await authService.signOut();
        set({ ...sessionState(null), isPasswordRecovery: false });
      });
    },

    /** Handle an incoming deep link (email confirmation, password reset, OAuth on cold start). */
    async handleDeepLink(url) {
      if (!url || url === lastHandledUrl) return { ok: true, handled: false };
      lastHandledUrl = url;
      return perform('deepLink', async () => {
        const result = await authService.handleAuthRedirect(url);
        if (!result) return { handled: false };
        set({ ...sessionState(result.session), isPasswordRecovery: result.isRecovery });
        return { handled: true };
      });
    },

    clearMessages() {
      set({ error: null, notice: null });
    },
  };
});
