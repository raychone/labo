import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

@Module({ controllers: [NotificationsController], exports: [NotificationsService], imports: [AuthModule, DatabaseModule, RbacModule], providers: [NotificationsService] })
export class NotificationsModule {}
