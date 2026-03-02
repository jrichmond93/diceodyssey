interface RateBucket {
  count: number
  windowStartedAt: number
}

const rateBuckets = new Map<string, RateBucket>()

const getBucketKey = (scope: string, key: string): string => `${scope}:${key}`

const pruneBuckets = (now: number, windowMs: number) => {
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now - bucket.windowStartedAt >= windowMs) {
      rateBuckets.delete(key)
    }
  }
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export const consumeRateLimit = (
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitDecision => {
  const now = Date.now()
  pruneBuckets(now, windowMs)

  const bucketKey = getBucketKey(scope, key)
  const bucket = rateBuckets.get(bucketKey)

  if (!bucket || now - bucket.windowStartedAt >= windowMs) {
    rateBuckets.set(bucketKey, {
      count: 1,
      windowStartedAt: now,
    })

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0,
    }
  }

  if (bucket.count >= limit) {
    const retryAfterMs = Math.max(0, windowMs - (now - bucket.windowStartedAt))
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    }
  }

  bucket.count += 1

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: 0,
  }
}

export const __resetRateLimiterForTests = (): void => {
  rateBuckets.clear()
}
