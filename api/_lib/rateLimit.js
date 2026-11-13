// Best-effort per-user rate limit (in memory, per function instance).
// Protects the free Gemini quota from accidental loops; not a security boundary.

const hits = new Map();

export function checkRateLimit(key, { limit = 5, windowMs = 60_000, now = Date.now() } = {}) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}

export function __resetRateLimitForTests() {
  hits.clear();
}
