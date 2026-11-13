// Small Response helpers. Auth is a bearer token (no cookies), so a wildcard CORS origin is safe
// and lets the app call the API from Expo web on localhost as well as from the deployed site.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS_HEADERS, ...extraHeaders },
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });
