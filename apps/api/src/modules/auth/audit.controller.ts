import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";

import { AuthGuard } from "./auth.guard.js";
import { AuditService, type PaginatedAuditLogsResponse } from "./audit.service.js";
import { AuditListQueryDto } from "./dto/audit.dto.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";

@Controller("audit")
@UseGuards(AuthGuard, PermissionsGuard)
export class AuditController {
  public constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission("audit.read", "ALL")
  public list(@Query() query: AuditListQueryDto): Promise<PaginatedAuditLogsResponse> {
    return this.auditService.list(query);
  }
}
