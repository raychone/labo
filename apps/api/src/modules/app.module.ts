import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { ClinicsModule } from "./clinics/clinics.module.js";
import { HealthModule } from "./health/health.module.js";
import { RbacModule } from "./rbac/rbac.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { UsersModule } from "./users/users.module.js";
import { WorkTypesModule } from "./work-types/work-types.module.js";
import { WorksModule } from "./works/works.module.js";

@Module({
  imports: [AuthModule, ClinicsModule, HealthModule, RbacModule, SettingsModule, UsersModule, WorkTypesModule, WorksModule],
})
export class AppModule {}
