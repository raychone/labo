import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { QrRateLimitService } from "../qr/qr-rate-limit.service.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { ScanController } from "./scan.controller.js";
import { ScanService } from "./scan.service.js";

@Module({
  controllers: [ScanController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [QrRateLimitService, ScanService],
})
export class ScanModule {}
