import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkTypeCodeService } from "./work-type-code.service.js";
import { WorkTypesController } from "./work-types.controller.js";
import { WorkTypesService } from "./work-types.service.js";

@Module({
  controllers: [WorkTypesController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [WorkTypeCodeService, WorkTypesService],
})
export class WorkTypesModule {}
