import { Inject, Injectable } from "@nestjs/common";

import {
  type DatabaseHealthStatus,
  DatabaseHealthService,
} from "../database/database-health.service.js";
import type { HealthCheckResponse } from "./health.types.js";

export interface DatabaseHealthReader {
  readonly getStatus: () => Promise<DatabaseHealthStatus>;
}

@Injectable()
export class HealthService {
  public constructor(
    @Inject(DatabaseHealthService) private readonly databaseHealthService: DatabaseHealthReader,
  ) {}

  public async getHealth(): Promise<HealthCheckResponse> {
    return {
      applicationName: "Dental Lab Management",
      database: await this.databaseHealthService.getStatus(),
      status: "ok",
    };
  }
}
