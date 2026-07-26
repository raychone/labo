import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { DeliveryCodeService } from "./delivery-code.service.js";
import { DeliveryController } from "./delivery.controller.js";
import { DeliveryService } from "./delivery.service.js";
import { DeliveryTransitionService } from "./delivery-transition.service.js";

@Module({
  controllers: [DeliveryController],
  exports: [DeliveryService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [DeliveryCodeService, DeliveryService, DeliveryTransitionService],
})
export class DeliveryModule {}
