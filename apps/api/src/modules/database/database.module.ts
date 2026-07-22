import { Module } from "@nestjs/common";

import { DatabaseHealthService } from "./database-health.service.js";
import { PrismaService } from "./prisma.service.js";

@Module({
  exports: [DatabaseHealthService, PrismaService],
  providers: [DatabaseHealthService, PrismaService],
})
export class DatabaseModule {}
