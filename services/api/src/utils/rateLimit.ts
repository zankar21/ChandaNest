import crypto from "crypto";

const buckets = new Map<string, number[]>();

export function hashIp(ip: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  const existing = buckets.get(key) ?? [];
  const cutoff = now - windowMs;
  const recent = existing.filter((timestamp) => timestamp > cutoff);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}
