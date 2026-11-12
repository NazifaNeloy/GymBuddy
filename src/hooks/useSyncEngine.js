import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as queue from '../services/sync/queue';
import { syncNow } from '../services/sync/syncEngine';
import { useSyncStore } from '../store/syncStore';

const LOCAL_WRITE_DEBOUNCE_MS = 1500;
const RETRY_INTERVAL_MS = 30 * 1000;

/**
 * Keeps local data and Supabase in sync while the user is signed in:
 *  - on start, when the app returns to the foreground, and when the connection comes back;
 *  - shortly after every local write (debounced);
 *  - every 30 s while there are unsynced changes (covers retry backoff).
 */
export function useSyncEngine(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let seen = new Set();
    let wasOffline = false;

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => syncNow({ pullData: false }), LOCAL_WRITE_DEBOUNCE_MS);
    };

    queue.getAll().then((entries) => {
      useSyncStore.getState().setQueueStats(entries);
      seen = new Set(entries.map((e) => `${e.id}:${e.payload?.updated_at}`));
    });
    syncNow();

    const unsubscribeQueue = queue.subscribe((entries) => {
      useSyncStore.getState().setQueueStats(entries);
      const keys = entries.map((e) => `${e.id}:${e.payload?.updated_at}`);
      // Only new or edited entries trigger a sync (removals after upload do not).
      if (keys.some((k) => !seen.has(k))) schedule();
      seen = new Set(keys);
    });

    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      if (wasOffline && !offline) queue.retryAllNow().then(() => syncNow());
      wasOffline = offline;
    });

    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncNow();
    });

    const interval = setInterval(() => {
      if (useSyncStore.getState().pendingCount > 0) syncNow({ pullData: false });
    }, RETRY_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribeQueue();
      unsubscribeNet();
      appState.remove();
    };
  }, [enabled]);
}
