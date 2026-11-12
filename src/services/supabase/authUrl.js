// Parse Supabase auth redirects, e.g.
//   gymbuddy://auth/callback#access_token=...&refresh_token=...&type=signup
//   gymbuddy://reset-password#access_token=...&type=recovery
//   gymbuddy://auth/callback?error=access_denied&error_description=...
// Parameters can arrive in the query string, the fragment, or both.

function parseParamString(str) {
  const out = {};
  if (!str) return out;
  for (const pair of str.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(rawKey.replace(/\+/g, ' '))] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      // Ignore malformed escape sequences rather than crashing on a bad link.
    }
  }
  return out;
}

export function parseAuthUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return {};
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);
  // Fragment wins: Supabase puts tokens there.
  return { ...parseParamString(query), ...parseParamString(fragment) };
}

/** True when the URL carries something the auth flow must handle. */
export function hasAuthParams(params) {
  return Boolean(params.access_token || params.code || params.error || params.error_code);
}

export function isRecoveryUrl(url, params) {
  return params.type === 'recovery' || /reset-password/.test(url ?? '');
}
