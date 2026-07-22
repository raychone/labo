import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkOrderCodeService } from "./work-order-code.service.js";
import { WorksController } from "./works.controller.js";
import { WorksService } from "./works.service.js";

@Module({
  controllers: [WorksController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [WorkOrderCodeService, WorksService],
})
export class WorksModule {}
