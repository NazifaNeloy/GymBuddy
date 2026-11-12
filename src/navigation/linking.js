import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Forward incoming deep links (email confirmation, password reset) to the auth store.
 * Covers both cold start (initial URL) and links opened while the app is running.
 */
export function useAuthDeepLinks() {
  const url = Linking.useLinkingURL();
  const handleDeepLink = useAuthStore((s) => s.handleDeepLink);

  useEffect(() => {
    if (url) handleDeepLink(url);
  }, [url, handleDeepLink]);
}
