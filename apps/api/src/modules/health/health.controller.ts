import { Controller, Get } from "@nestjs/common";

import type { HealthCheckResponse } from "./health.types.js";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get()
  public async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.getHealth();
  }
}
