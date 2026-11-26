import { create } from 'zustand';

/** Sync status for the UI ("3 changes waiting to sync", "All changes saved"). */
export const useSyncStore = create((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isSyncing: false,
  lastSyncedAt: null,
  lastError: null,
  setQueueStats: (entries) =>
    set({ pendingCount: entries.length, failedCount: entries.filter((e) => e.attempts > 0).length }),
  set: (patch) => set(patch),
  reset: () =>
    set({ pendingCount: 0, failedCount: 0, isSyncing: false, lastSyncedAt: null, lastError: null }),
}));
