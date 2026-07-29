import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { PatientsController } from "./patients.controller.js";
import { PatientsService } from "./patients.service.js";

@Module({
  controllers: [PatientsController],
  exports: [PatientsService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [PatientsService],
})
export class PatientsModule {}
