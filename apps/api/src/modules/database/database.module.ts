import { Module } from "@nestjs/common";
import { Pool } from "pg";

import { loadServerEnvironment } from "../../config/environment.js";
import { DATABASE_POOL } from "./database.constants.js";
import { DatabaseHealthService } from "./database-health.service.js";

@Module({
  exports: [DatabaseHealthService],
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (): Pool => {
        const environment = loadServerEnvironment();

        return new Pool({
          connectionString: environment.databaseUrl,
        });
      },
    },
    DatabaseHealthService,
  ],
})
export class DatabaseModule {}
