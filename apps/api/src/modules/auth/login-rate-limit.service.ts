import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { BoundedFixedWindowStore } from "../../common/bounded-fixed-window-store.js";
import { loadServerEnvironment } from "../../config/environment.js";

@Injectable()
export class LoginRateLimitService {
  private readonly environment = loadServerEnvironment();
  private readonly buckets = new BoundedFixedWindowStore(this.environment.rateLimitMaxBuckets);

  public consume(ipAddress: string | undefined, email: string): void {
    const now = Date.now();
    const key = `${ipAddress ?? "unknown"}:${email.toLowerCase()}`;
    const result = this.buckets.consume(
      key,
      now,
      this.environment.loginRateLimitWindowSeconds * 1000,
    );

    if (!result.accepted || result.count > this.environment.loginRateLimitMaxAttempts) {
      throw new HttpException("Too many login attempts.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  public clear(ipAddress: string | undefined, email: string): void {
    this.buckets.clear(`${ipAddress ?? "unknown"}:${email.toLowerCase()}`);
  }
}
