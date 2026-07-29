import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OrganizationContextModule } from "../organization-context/organization-context.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { PricingController } from "./pricing.controller.js";
import { PricingResolverService } from "./pricing-resolver.service.js";
import { PricingService } from "./pricing.service.js";

@Module({
  controllers: [PricingController],
  imports: [AuthModule, DatabaseModule, OrganizationContextModule, RbacModule],
  providers: [PricingResolverService, PricingService],
  exports: [PricingResolverService],
})
export class PricingModule {}
