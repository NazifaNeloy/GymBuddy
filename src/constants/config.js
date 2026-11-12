// Public, client-side configuration. Values come from EXPO_PUBLIC_* env vars,
// which Expo inlines at build time. These are NOT secrets: data access is
// protected by Supabase Row Level Security.

export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
};

// Values copied unchanged from .env.example count as missing.
const PLACEHOLDERS = [/your-project-ref/i, /x{8,}/i, /your-vercel-app/i];

function isUsable(key, value) {
  const v = (value ?? '').trim();
  if (!v || PLACEHOLDERS.some((re) => re.test(v))) return false;
  if (key === 'supabaseUrl') return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(v) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(v);
  if (key === 'supabasePublishableKey') return /^sb_publishable_/.test(v) || v.split('.').length === 3;
  return true;
}

export function getMissingConfig(cfg = config) {
  return Object.entries(cfg)
    .filter(([key, value]) => key !== 'apiBaseUrl' && !isUsable(key, value))
    .map(([key]) => key);
}
