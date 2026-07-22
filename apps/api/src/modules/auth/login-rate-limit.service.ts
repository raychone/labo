import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { loadServerEnvironment } from "../../config/environment.js";

interface LoginAttemptBucket {
  readonly resetAt: number;
  readonly attempts: number;
}

@Injectable()
export class LoginRateLimitService {
  private readonly buckets = new Map<string, LoginAttemptBucket>();

  public consume(ipAddress: string | undefined, email: string): void {
    const environment = loadServerEnvironment();
    const now = Date.now();
    const key = `${ipAddress ?? "unknown"}:${email.toLowerCase()}`;
    const existingBucket = this.buckets.get(key);

    if (!existingBucket || existingBucket.resetAt <= now) {
      this.buckets.set(key, {
        attempts: 1,
        resetAt: now + environment.loginRateLimitWindowSeconds * 1000,
      });
      return;
    }

    if (existingBucket.attempts >= environment.loginRateLimitMaxAttempts) {
      throw new HttpException("Too many login attempts.", HttpStatus.TOO_MANY_REQUESTS);
    }

    this.buckets.set(key, {
      attempts: existingBucket.attempts + 1,
      resetAt: existingBucket.resetAt,
    });
  }

  public clear(ipAddress: string | undefined, email: string): void {
    this.buckets.delete(`${ipAddress ?? "unknown"}:${email.toLowerCase()}`);
  }
}
