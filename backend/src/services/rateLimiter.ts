import { redisConnection } from "../lib/redis";

/**
 * Returns the formatted Redis key for hourly rate limiting:
 * ratelimit:{senderEmail}:{YYYY-MM-DD-HH}
 */
export function getHourlyRateLimitKey(senderEmail: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  return `ratelimit:${senderEmail}:${yyyy}-${mm}-${dd}-${hh}`;
}

/**
 * Atomically increments the hourly counter for the sender in Redis
 * and sets a TTL of 3600 seconds.
 */
export async function checkAndIncrementHourlyRateLimit(
  senderEmail: string,
  maxLimit: number
): Promise<{ allowed: boolean; currentCount: number }> {
  const key = getHourlyRateLimitKey(senderEmail);

  // Redis Pipeline: INCR and EXPIRE with TTL 3600s
  const pipeline = redisConnection.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 3600, "NX");

  const results = await pipeline.exec();
  const currentCount = (results?.[0]?.[1] as number) || 1;

  return {
    allowed: currentCount <= maxLimit,
    currentCount,
  };
}

/**
 * Calculates milliseconds remaining until the start of the next hour window.
 */
export function getMsUntilNextHour(now = new Date()): number {
  const nextHour = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
    0,
    0,
    0
  );
  return Math.max(1000, nextHour.getTime() - now.getTime());
}
