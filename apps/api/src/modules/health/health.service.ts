import { Injectable } from "@nestjs/common";

import type { HealthCheckResponse } from "./health.types.js";

@Injectable()
export class HealthService {
  public getHealth(): HealthCheckResponse {
    return {
      applicationName: "Dental Lab Management",
      status: "ok",
    };
  }
}
