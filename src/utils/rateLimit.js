const buckets = new Map();

/** Simple in-memory rate limiter. Returns true if allowed, false if exceeded. */
export function checkRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count += 1;
  buckets.set(key, entry);

  return entry.count <= maxAttempts;
}
