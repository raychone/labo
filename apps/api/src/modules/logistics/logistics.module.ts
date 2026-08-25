import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { DeliveryModule } from "../delivery/delivery.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { OrganizationContextModule } from "../organization-context/organization-context.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorksModule } from "../works/works.module.js";
import { LogisticsController } from "./logistics.controller.js";
import { LogisticsService } from "./logistics.service.js";

@Module({
  controllers: [LogisticsController],
  imports: [AuthModule, DatabaseModule, DeliveryModule, NotificationsModule, OrganizationContextModule, RbacModule, WorksModule],
  providers: [LogisticsService],
})
export class LogisticsModule {}
