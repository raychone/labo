import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { OperationalStatusController } from "./operational-status.controller.js";
import { OperationalStatusService } from "./operational-status.service.js";

@Module({
  controllers: [OperationalStatusController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [OperationalStatusService],
})
export class StatusModule {}
