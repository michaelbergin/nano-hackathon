type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimiterConfig = {
  windowMs: number;
  max: number;
  prefix: string;
};

type RateLimiter = {
  check: (key: string) => Promise<RateLimitResult>;
};

function isUpstashConfigured(): boolean {
  return (
    typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
    process.env.UPSTASH_REDIS_REST_URL !== "" &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== ""
  );
}

async function upstashCheck(
  url: string,
  token: string,
  key: string,
  windowMs: number
): Promise<{ count: number; ttlMs: number } | null> {
  const incrCmd = ["INCR", key];
  const pttlCmd = ["PTTL", key];
  const expireCmd = ["PEXPIRE", key, windowMs, "NX"];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([incrCmd, pttlCmd, expireCmd]),
  });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return null;
  }
  const incr = Number((data[0] as { result?: unknown }).result ?? NaN);
  const pttl = Number((data[1] as { result?: unknown }).result ?? -1);
  if (!Number.isFinite(incr)) {
    return null;
  }
  const ttlMs = pttl >= 0 ? pttl : windowMs;
  return { count: incr, ttlMs };
}

function createInMemoryLimiter(windowMs: number, max: number): RateLimiter {
  type Counter = { count: number; resetAt: number };
  const counters: Map<string, Counter> = new Map();

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      const existing = counters.get(key);
      if (existing == null || now >= existing.resetAt) {
        const next: Counter = { count: 1, resetAt: now + windowMs };
        counters.set(key, next);
        return {
          allowed: true,
          remaining: Math.max(0, max - 1),
          resetAt: next.resetAt,
        };
      }
      existing.count += 1;
      counters.set(key, existing);
      const allowed = existing.count <= max;
      const remaining = Math.max(0, max - existing.count);
      return { allowed, remaining, resetAt: existing.resetAt };
    },
  };
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  const { windowMs, max, prefix } = config;

  if (isUpstashConfigured()) {
    const baseUrl = process.env.UPSTASH_REDIS_REST_URL as string;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN as string;

    return {
      async check(key: string): Promise<RateLimitResult> {
        const namespacedKey = `${prefix}:${key}`;
        const data = await upstashCheck(
          baseUrl,
          token,
          namespacedKey,
          windowMs
        );
        if (data == null) {
          // Fallback to allow if Upstash is temporarily unavailable
          return {
            allowed: true,
            remaining: max - 1,
            resetAt: Date.now() + windowMs,
          };
        }
        const allowed = data.count <= max;
        const remaining = Math.max(0, max - data.count);
        return { allowed, remaining, resetAt: Date.now() + data.ttlMs };
      },
    };
  }

  return createInMemoryLimiter(windowMs, max);
}
