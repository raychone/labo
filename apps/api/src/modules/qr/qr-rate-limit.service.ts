import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { QR_RESOLVE_LIMIT, QR_RESOLVE_WINDOW_MS } from "./qr.constants.js";

interface Bucket {
  readonly resetAt: number;
  readonly count: number;
}

function nextBucket(current: Bucket | undefined, now: number): Bucket {
  if (!current || current.resetAt <= now) {
    return {
      count: 1,
      resetAt: now + QR_RESOLVE_WINDOW_MS,
    };
  }

  return {
    count: current.count + 1,
    resetAt: current.resetAt,
  };
}

@Injectable()
export class QrRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  public assertAllowed(key: string): void {
    const now = Date.now();
    const bucket = nextBucket(this.buckets.get(key), now);
    this.buckets.set(key, bucket);

    if (bucket.count > QR_RESOLVE_LIMIT) {
      throw new HttpException("Too many QR resolve attempts.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
