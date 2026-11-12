// Public, client-side configuration. Values come from EXPO_PUBLIC_* env vars,
// which Expo inlines at build time. These are NOT secrets: data access is
// protected by Supabase Row Level Security.

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};

export function getMissingConfig(cfg = config) {
  return Object.entries(cfg)
    .filter(([key, value]) => key !== 'apiBaseUrl' && !value)
    .map(([key]) => key);
}
