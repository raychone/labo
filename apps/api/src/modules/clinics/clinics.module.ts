import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { ClinicsController } from "./clinics.controller.js";
import { ClinicsService } from "./clinics.service.js";
import { DoctorsController } from "./doctors.controller.js";
import { DoctorsService } from "./doctors.service.js";

@Module({
  controllers: [ClinicsController, DoctorsController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [ClinicsService, DoctorsService],
})
export class ClinicsModule {}
