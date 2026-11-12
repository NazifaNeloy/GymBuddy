import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSyncStore } from '../../store/syncStore';
import { plural } from '../../utils/format';
import { AppText } from '../ui/AppText';

/** One-line sync status: saved on device, waiting to sync, or all synced. */
export function SyncStatus({ style }) {
  const pending = useSyncStore((s) => s.pendingCount);
  const failed = useSyncStore((s) => s.failedCount);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const { isOffline } = useNetworkStatus();

  let text = 'All changes synced';
  let color = 'textMuted';
  if (pending > 0 && isOffline) {
    text = `${plural(pending, 'change')} saved on this phone. Will sync when you're back online.`;
    color = 'warning';
  } else if (failed > 0) {
    text = `${plural(failed, 'change')} couldn't sync yet. Retrying automatically.`;
    color = 'warning';
  } else if (pending > 0 || isSyncing) {
    text = 'Syncing…';
  }
  return (
    <AppText variant="caption" color={color} style={style} testID="sync-status" accessibilityLiveRegion="polite">
      {text}
    </AppText>
  );
}
