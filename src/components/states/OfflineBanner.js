import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Banner } from '../ui/Banner';

/** Shows a small warning while the device is offline. */
export function OfflineBanner({ message = "You're offline. Showing saved data." }) {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;
  return <Banner tone="warning" message={message} testID="offline-banner" />;
}
