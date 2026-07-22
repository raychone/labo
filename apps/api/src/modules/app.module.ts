import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { RbacModule } from "./rbac/rbac.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [AuthModule, HealthModule, RbacModule, UsersModule],
})
export class AppModule {}
