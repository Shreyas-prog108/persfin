const buckets = new Map<string, { tokens: number; resetAt: number }>();

export function allowRequest(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return true;
  }
  if (current.tokens <= 0) return false;
  current.tokens -= 1;
  return true;
}
