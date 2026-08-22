import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { TechnicianOperationsController } from "./technician-operations.controller.js";
import { TechnicianOperationsService } from "./technician-operations.service.js";

@Module({
  controllers: [TechnicianOperationsController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [TechnicianOperationsService],
  exports: [TechnicianOperationsService],
})
export class TechnicianOperationsModule {}
