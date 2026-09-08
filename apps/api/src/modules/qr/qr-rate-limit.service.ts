import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { BoundedFixedWindowStore } from "../../common/bounded-fixed-window-store.js";
import { loadServerEnvironment } from "../../config/environment.js";
import { QR_RESOLVE_LIMIT, QR_RESOLVE_WINDOW_MS } from "./qr.constants.js";

@Injectable()
export class QrRateLimitService {
  private readonly buckets = new BoundedFixedWindowStore(loadServerEnvironment().rateLimitMaxBuckets);

  public assertAllowed(key: string): void {
    const now = Date.now();
    const result = this.buckets.consume(key, now, QR_RESOLVE_WINDOW_MS);

    if (!result.accepted || result.count > QR_RESOLVE_LIMIT) {
      throw new HttpException("Too many QR resolve attempts.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
