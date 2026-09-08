import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";

import type { HealthCheckResponse, LivenessResponse } from "./health.types.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get()
  public async getHealth(): Promise<HealthCheckResponse> {
    const health = await this.healthService.getHealth();
    if (health.status !== "ok") {
      throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }

  @Get("live")
  public getLiveness(): LivenessResponse {
    return { applicationName: "Dental Lab Management", status: "ok" };
  }

  @Get("ready")
  public getReadiness(): Promise<HealthCheckResponse> {
    return this.getHealth();
  }
}
