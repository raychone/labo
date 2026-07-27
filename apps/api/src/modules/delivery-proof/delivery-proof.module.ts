import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { DeliveryProofController } from "./delivery-proof.controller.js";
import { DeliveryProofRenderService } from "./delivery-proof-render.service.js";
import { DeliveryProofService } from "./delivery-proof.service.js";
import { DeliveryProofValidationService } from "./delivery-proof-validation.service.js";

@Module({
  controllers: [DeliveryProofController],
  exports: [DeliveryProofService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [DeliveryProofRenderService, DeliveryProofService, DeliveryProofValidationService],
})
export class DeliveryProofModule {}
