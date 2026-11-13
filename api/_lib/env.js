// Server-side configuration. GEMINI_API_KEY must only ever be set in Vercel environment variables.
// The Supabase URL and publishable key are public, so the EXPO_PUBLIC_* values used for the web build work too.

export function getServerEnv(env = process.env) {
  return {
    supabaseUrl: (env.SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, ''),
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY || env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    geminiApiKey: env.GEMINI_API_KEY || '',
    // Google's alias for the current Flash model; override with GEMINI_MODEL if needed.
    geminiModel: env.GEMINI_MODEL || 'gemini-flash-latest',
  };
}
