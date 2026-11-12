import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { config, getMissingConfig } from '../../constants/config';
import { authStorage } from './secureStorage';

let client = null;

/**
 * Lazily create the single Supabase client.
 * Only the project URL and publishable key are used here; data is protected by RLS.
 */
export function getSupabase() {
  if (client) return client;

  const missing = getMissingConfig();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase config (${missing.join(', ')}). Copy .env.example to .env and restart Expo.`);
  }

  client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Native apps receive tokens through deep links that we parse ourselves.
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'implicit',
    },
  });

  // Refresh tokens only while the app is in the foreground (Supabase recommendation for RN).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
  }

  return client;
}
