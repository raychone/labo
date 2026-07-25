import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkflowTemplateValidationService } from "./workflow-template-validation.service.js";
import { WorkflowTemplatesController } from "./workflow-templates.controller.js";
import { WorkflowTemplatesService } from "./workflow-templates.service.js";

@Module({
  controllers: [WorkflowTemplatesController],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [WorkflowTemplateValidationService, WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}
