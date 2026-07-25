import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { WorkFormTemplateValidationService } from "./work-form-template-validation.service.js";
import { WorkFormSubmissionValidationService } from "./work-form-submission-validation.service.js";
import { WorkFormTemplatesController } from "./work-form-templates.controller.js";
import { WorkFormTemplatesService } from "./work-form-templates.service.js";

@Module({
  controllers: [WorkFormTemplatesController],
  exports: [WorkFormSubmissionValidationService],
  imports: [AuthModule, DatabaseModule, RbacModule],
  providers: [WorkFormSubmissionValidationService, WorkFormTemplateValidationService, WorkFormTemplatesService],
})
export class WorkFormsModule {}
