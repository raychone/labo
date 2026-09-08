export interface FixedWindowConsumeResult {
  readonly accepted: boolean;
  readonly count: number;
}

interface FixedWindowBucket {
  readonly count: number;
  readonly resetAt: number;
}

/**
 * Process-local fixed-window storage with a hard memory bound. A shared
 * gateway/store can replace this layer when the API is scaled horizontally.
 */
export class BoundedFixedWindowStore {
  private readonly buckets = new Map<string, FixedWindowBucket>();

  public constructor(private readonly maxBuckets: number) {}

  public clear(key: string): void {
    this.buckets.delete(key);
  }

  public consume(key: string, now: number, windowMs: number): FixedWindowConsumeResult {
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > now) {
      const next = { count: existing.count + 1, resetAt: existing.resetAt };
      this.buckets.set(key, next);
      return { accepted: true, count: next.count };
    }

    if (existing) this.buckets.delete(key);
    if (this.buckets.size >= this.maxBuckets) this.pruneExpired(now);
    if (this.buckets.size >= this.maxBuckets) return { accepted: false, count: 0 };

    this.buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { accepted: true, count: 1 };
  }

  private pruneExpired(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
