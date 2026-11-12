import { useNetInfo } from '@react-native-community/netinfo';

/**
 * Online/offline status. `isOffline` is only true when NetInfo is sure there is no connection
 * (null = still checking, treated as online so we never flash an offline banner on launch).
 */
export function useNetworkStatus() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const isOffline = isConnected === false || isInternetReachable === false;
  return { isOffline, isConnected, isInternetReachable };
}
