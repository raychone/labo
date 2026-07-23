import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { QrController } from "./qr.controller.js";
import { QrRateLimitService } from "./qr-rate-limit.service.js";
import { QrService } from "./qr.service.js";
import { WorkQrTokenService } from "./work-qr-token.service.js";

@Module({
  controllers: [QrController],
  exports: [WorkQrTokenService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [QrRateLimitService, QrService, WorkQrTokenService],
})
export class QrModule {}
