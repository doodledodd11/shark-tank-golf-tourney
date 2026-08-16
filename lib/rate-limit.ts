import "server-only";

// A deliberately simple in-memory sliding-window limiter — no Redis/Upstash
// dependency for what protects exactly one shared password guarding a
// friendly club bracket (nothing financial or personal behind it). It only
// limits attempts within a single warm serverless instance: the counter
// resets on cold start and isn't shared across concurrent instances, so
// treat this as raising the bar against a naive scripted brute force, not
// a hard guarantee. If this project ever protects something higher-stakes,
// replace it with a real distributed limiter (e.g. Upstash Ratelimit)
// instead of trying to harden this further.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 10;

/** True if `key` (e.g. a client IP) has made too many attempts in the
 * current window. Every call counts as an attempt, limited or not. */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
