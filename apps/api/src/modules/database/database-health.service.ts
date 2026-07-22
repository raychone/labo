import { Inject, Injectable } from "@nestjs/common";

import { DATABASE_POOL } from "./database.constants.js";

export type DatabaseHealthStatus = "ok" | "unavailable";

export interface DatabaseQueryClient {
  readonly query: (sql: string) => Promise<unknown>;
}

@Injectable()
export class DatabaseHealthService {
  public constructor(@Inject(DATABASE_POOL) private readonly databaseClient: DatabaseQueryClient) {}

  public async getStatus(): Promise<DatabaseHealthStatus> {
    try {
      await this.databaseClient.query("SELECT 1");

      return "ok";
    } catch {
      return "unavailable";
    }
  }
}
