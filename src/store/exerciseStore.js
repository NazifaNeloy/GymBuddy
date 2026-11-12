import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchExercises } from '../services/supabase/repositories/exercises';
import { persistStorage } from '../services/storage/persistStorage';
import { toAuthError } from '../services/supabase/errors';

/** Refresh the library at most this often unless the user pulls to refresh. */
export const EXERCISE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Exercise library, cached in AsyncStorage so it works offline.
 *
 * status: 'idle' | 'loading' | 'ready' | 'error'
 *   'error' only when there is nothing cached to show.
 * refreshError: message when a refresh failed but cached data is still shown.
 */
const initialState = {
  items: [],
  lastFetchedAt: null,
  status: 'idle',
  error: null,
  refreshError: null,
  refreshing: false,
};

let inFlight = null;

export const useExerciseStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Load exercises. Shows cached data immediately; fetches from Supabase if the cache is
       * empty, stale, or `force` is true (pull to refresh / retry).
       */
      async load({ force = false, now = Date.now() } = {}) {
        const { items, lastFetchedAt } = get();
        const hasCache = items.length > 0;
        const fresh = lastFetchedAt && now - lastFetchedAt < EXERCISE_CACHE_TTL_MS;
        if (hasCache && fresh && !force) {
          set({ status: 'ready' });
          return;
        }
        if (inFlight) return inFlight;

        set(hasCache ? { status: 'ready', refreshing: true, refreshError: null } : { status: 'loading', error: null });

        inFlight = (async () => {
          try {
            const data = await fetchExercises();
            set({ items: data, lastFetchedAt: now, status: 'ready', error: null, refreshError: null, refreshing: false });
          } catch (e) {
            const message = toAuthError(e).message;
            if (get().items.length > 0) set({ status: 'ready', refreshError: message, refreshing: false });
            else set({ status: 'error', error: message, refreshing: false });
          } finally {
            inFlight = null;
          }
        })();
        return inFlight;
      },

      getById(id) {
        return get().items.find((e) => e.id === id) ?? null;
      },

      /** Forget cached data (on sign-out, because the cache can include custom exercises). */
      reset() {
        inFlight = null;
        set({ ...initialState });
      },
    }),
    {
      name: 'gymbuddy.exercises.v1',
      storage: persistStorage,
      partialize: (s) => ({ items: s.items, lastFetchedAt: s.lastFetchedAt }),
    }
  )
);
