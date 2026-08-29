import { Body, Controller, Delete, ForbiddenException, Get, Inject, Optional, Param, Patch, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentLegalEntity } from "../organization-context/current-legal-entity.decorator.js";
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { RequireLegalEntityContext } from "../organization-context/require-legal-entity-context.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import {
  ClaimWorkDto,
  CompleteTechnicalWorkDto,
  CreateNextWorkCycleDto,
  CreateWorkDto,
  FinalizeRealLabSheetDto,
  ListClaimWorksQueryDto,
  ListWorksQueryDto,
  ReassignWorkDto,
  RecalculateWorkDeadlineDto,
  ReleaseWorkDto,
  SetWorkStatusDto,
  SetManualWorkDeadlineDto,
  UpdateTechnicianWorkDetailsDto,
  UpdateWorkDto,
  UpsertRealLabSheetDto,
  WorkDeadlinePreviewDto,
} from "./dto/works.dto.js";
import { CreateProbeTypeDto, UpdateProbeTypeDto } from "./dto/probe-types.dto.js";
import { CreateWorkOrderItemDto, UpdateWorkOrderItemDto } from "./dto/work-order-items.dto.js";
import { UpdateWorkOrderCompositionDto } from "./dto/work-order-composition.dto.js";
import { WorksService } from "./works.service.js";
import { WorkItemsService } from "./work-items.service.js";
import { LegacyCompatibilityService } from "./legacy-compatibility.service.js";
import { ToothConnectionsService } from "./tooth-connections.service.js";
import { CreateToothConnectionDto } from "./dto/tooth-connections.dto.js";
import { ProbeTypesService } from "./probe-types.service.js";
import { ProbeCyclesService } from "./probe-cycles.service.js";
import { ReworkProbeDto, SelectProbeTypeDto, UpdateProbeDeadlineDto } from "./dto/probe-cycles.dto.js";
import { LOGISTICS_ATTACHMENT_LIMITS } from "../logistics/logistics.constants.js";
import type { UploadedAttachmentFile } from "../logistics/logistics.service.js";

@Controller("works")
@RequireLegalEntityContext()
@UseGuards(AuthGuard, PermissionsGuard, LegalEntityContextGuard)
export class WorksController {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(LegacyCompatibilityService) private readonly legacyCompatibilityService: LegacyCompatibilityService,
    @Inject(ToothConnectionsService) private readonly toothConnectionsService: ToothConnectionsService,
    @Inject(WorkItemsService) private readonly workItemsService: WorkItemsService,
    @Inject(WorksService) private readonly worksService: WorksService,
    @Optional() @Inject(ProbeTypesService) private readonly probeTypesService: ProbeTypesService,
    @Optional() @Inject(ProbeCyclesService) private readonly probeCyclesService: ProbeCyclesService,
  ) {}

  @Get("probe-types")
  @RequirePermission("probe_types.read", "ASSIGNED")
  public listProbeTypes(@CurrentUser() actor: AuthenticatedUser, @Query("includeArchived") includeArchived?: string) {
    return this.probeTypesService.list(actor.id, includeArchived === "true");
  }

  @Post("probe-types")
  @UseGuards(CsrfGuard)
  @RequirePermission("probe_types.manage", "ALL")
  public createProbeType(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateProbeTypeDto) {
    return this.probeTypesService.create(actor.id, dto);
  }

  @Patch("probe-types/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("probe_types.manage", "ALL")
  public updateProbeType(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateProbeTypeDto) {
    return this.probeTypesService.update(actor.id, id, dto);
  }

  @Patch(":id/probe-cycles/:cycleId/probe-type")
  @UseGuards(CsrfGuard)
  @RequirePermission("cycles.probe_type.select", "ASSIGNED")
  public selectProbeType(@Param("id") workOrderId: string, @Param("cycleId") cycleId: string, @Body() dto: SelectProbeTypeDto, @CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Req() request: Request) {
    return this.probeCyclesService.selectProbeType({ actorUserId: actor.id, cycleId, dto, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Patch(":id/probe-cycles/:cycleId/deadline")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.current.update", "ALL")
  public updateProbeDeadline(@Param("id") workOrderId: string, @Param("cycleId") cycleId: string, @Body() dto: UpdateProbeDeadlineDto, @CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Req() request: Request) {
    return this.probeCyclesService.updateActiveDeadline({ actorUserId: actor.id, cycleId, deadlineAt: dto.deadlineAt, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Post(":id/probe-ready")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.change_status", "OWN_STAGE")
  public async markProbeReady(@Param("id") workOrderId: string, @Body() dto: CompleteTechnicalWorkDto, @CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Req() request: Request) {
    await this.probeCyclesService.markProbeReady({ actorUserId: actor.id, ...(dto.executionLegalEntityCode ? { executionLegalEntityCode: dto.executionLegalEntityCode } : {}), legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
    return { probeReady: true };
  }

  @Post(":id/finalize")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.change_status", "OWN_STAGE")
  public async finalizeWork(@Param("id") workOrderId: string, @Body() dto: CompleteTechnicalWorkDto, @CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Req() request: Request) {
    await this.probeCyclesService.finalizeWork({ actorUserId: actor.id, ...(dto.executionLegalEntityCode ? { executionLegalEntityCode: dto.executionLegalEntityCode } : {}), legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
    return { finalized: true };
  }

  @Post(":id/probe-cycles/receive")
  @UseGuards(CsrfGuard)
  @RequirePermission("cycles.create_next", "ALL")
  public receiveProbe(@Param("id") workOrderId: string, @Body() dto: import("./dto/probe-cycles.dto.js").ReceiveProbeDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    // A work may belong to either CDT or NG, determined by its clinic. The
    // reception user's currently selected legal-entity context must not hide
    // an otherwise visible work from the return/probe flow.
    return this.probeCyclesService.createNextActiveAfterReception({ actorUserId: actor.id, deadlineAt: dto.deadlineAt, probeTypeId: dto.probeTypeId ?? dto.probeTypeIds?.[0] ?? "", ...(dto.probeTypeIds ? { probeTypeIds: dto.probeTypeIds } : {}), requestMetadata: getRequestMetadata(request), returnedAfterCompletedCycle: true, workOrderId });
  }

  @Post(":id/probe-cycles/rework")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.change_status", "ALL")
  public reworkProbe(@Param("id") workOrderId: string, @Body() dto: ReworkProbeDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.probeCyclesService.createNextActiveAfterReception({
      actorUserId: actor.id,
      deadlineAt: dto.deadlineAt,
      ...(dto.probeTypeId ? { probeTypeId: dto.probeTypeId } : {}),
      ...(dto.probeTypeIds ? { probeTypeIds: dto.probeTypeIds } : {}),
      directRework: true,
      reasonNotes: dto.reason,
      requestMetadata: getRequestMetadata(request),
      returnedAfterCompletedCycle: true,
      workOrderId,
    });
  }

  @Get()
  public async listWorks(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListWorksQueryDto) {
    await this.ensureCanReadWorks(actor.id);
    return this.worksService.listWorks(actor.id, query, await this.canReadPricing(actor.id));
  }

  @Get("available-for-claim")
  @RequirePermission("works.claim.available.read", "ALL")
  public listAvailableForClaim(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListClaimWorksQueryDto) {
    return this.worksService.listAvailableForClaim(actor.id, query);
  }

  @Get("my-claimed")
  @RequirePermission("works.claim.own.read", "ASSIGNED")
  public listMyClaimed(@CurrentUser() actor: AuthenticatedUser, @Query() query: ListClaimWorksQueryDto) {
    return this.worksService.listMyClaimed(actor.id, query);
  }

  @Get("work-type-options")
  // This catalog is also needed when a technician edits an assigned work.
  // It is read-only; requiring works.create incorrectly returned 403 for technicians.
  @RequirePermission("works.update", "ASSIGNED")
  public listWorkTypeFormOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.worksService.listWorkTypeFormOptions(actor.id);
  }

  @Get(":id/items")
  public listWorkOrderItems(@CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") workOrderId: string) {
    return this.workItemsService.list(actor.id, workOrderId, legalEntity);
  }

  @Patch(":id/composition")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.update", "ASSIGNED")
  public updateWorkOrderComposition(
    @Param("id") workOrderId: string,
    @Body() dto: UpdateWorkOrderCompositionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.workItemsService.updateComposition({ actorUserId: actor.id, dto, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Get(":id/compatibility")
  public getLegacyCompatibility(
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Param("id") workOrderId: string,
  ) {
    return this.legacyCompatibilityService.getComposition(actor.id, workOrderId, legalEntity);
  }

  @Get(":id/tooth-connections")
  public listToothConnections(@CurrentUser() actor: AuthenticatedUser, @CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") workOrderId: string) {
    return this.toothConnectionsService.list(actor.id, workOrderId, legalEntity);
  }

  @Post(":id/tooth-connections")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.connections.manage", "ASSIGNED")
  public createToothConnection(
    @Param("id") workOrderId: string,
    @Body() dto: CreateToothConnectionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.toothConnectionsService.create({ actorUserId: actor.id, dto, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Delete(":id/tooth-connections/:connectionId")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.connections.manage", "ASSIGNED")
  public removeToothConnection(
    @Param("id") workOrderId: string,
    @Param("connectionId") connectionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.toothConnectionsService.remove({ actorUserId: actor.id, connectionId, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Post(":id/items")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.item.create", "ASSIGNED")
  public createWorkOrderItem(
    @Param("id") workOrderId: string,
    @Body() dto: CreateWorkOrderItemDto,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.workItemsService.create({ actorUserId: actor.id, dto, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Patch(":id/items/:itemId")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.item.update", "ASSIGNED")
  public updateWorkOrderItem(
    @Param("id") workOrderId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateWorkOrderItemDto,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.workItemsService.update({ actorUserId: actor.id, dto, itemId, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Delete(":id/items/:itemId")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.item.remove", "ASSIGNED")
  public archiveWorkOrderItem(
    @Param("id") workOrderId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Req() request: Request,
  ) {
    return this.workItemsService.archive({ actorUserId: actor.id, itemId, legalEntity, requestMetadata: getRequestMetadata(request), workOrderId });
  }

  @Post("deadline-preview")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.preview", "ALL")
  public async previewDeadline(
    @Body() dto: WorkDeadlinePreviewDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.worksService.previewDeadline(legalEntity, dto, await this.canSetManualDeadline(actor.id));
  }

  @Get(":id")
  public async getWork(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    await this.ensureCanReadWorks(actor.id);
    return this.worksService.getWork(actor.id, workOrderId, await this.canReadPricing(actor.id));
  }

  @Get(":id/attachments")
  @RequirePermission("files.read", "ASSIGNED")
  public listAttachments(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.getWork(actor.id, workOrderId, false).then((work) => work.attachments);
  }

  @Get(":id/attachments/:attachmentId")
  @RequirePermission("files.read", "ASSIGNED")
  public async downloadAttachment(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string, @Param("attachmentId") attachmentId: string, @Res() response: Response) {
    const attachment = await this.worksService.getAttachment(actor.id, workOrderId, attachmentId);
    const fileName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    response
      .status(200)
      .setHeader("Content-Type", attachment.mimeType)
      .setHeader("Content-Length", String(attachment.content.length))
      .setHeader("Content-Disposition", `${attachment.mimeType.startsWith("image/") ? "inline" : "attachment"}; filename="${fileName}"`)
      .send(Buffer.from(attachment.content));
  }

  @Post(":id/attachments")
  @UseGuards(CsrfGuard)
  @UseInterceptors(FilesInterceptor("attachments", LOGISTICS_ATTACHMENT_LIMITS.maxFiles, { limits: { fileSize: LOGISTICS_ATTACHMENT_LIMITS.maxFileBytes, files: LOGISTICS_ATTACHMENT_LIMITS.maxFiles } }))
  @RequirePermission("files.upload", "ASSIGNED")
  public addAttachments(@Param("id") workOrderId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request, @UploadedFiles() files: UploadedAttachmentFile[] = []) {
    return this.worksService.addAttachments({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, files);
  }

  @Get(":id/cycles")
  @RequirePermission("cycles.history.read", "ASSIGNED")
  public async listCycles(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.listCycles(actor.id, workOrderId, await this.canReadPricing(actor.id));
  }

  @Post(":id/cycles/next")
  @UseGuards(CsrfGuard)
  @RequirePermission("cycles.create_next", "ALL")
  public async createNextCycle(
    @Param("id") workOrderId: string,
    @Body() dto: CreateNextWorkCycleDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.createNextCycle({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto, await this.canReadPricing(actor.id));
  }

  @Get(":id/cycles/:cycleId/real-lab-sheet")
  @RequirePermission("work_forms.real.read", "ASSIGNED")
  public getRealLabSheet(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") workOrderId: string,
    @Param("cycleId") cycleId: string,
  ) {
    return this.worksService.getRealLabSheet(actor.id, workOrderId, cycleId);
  }

  @Patch(":id/cycles/:cycleId/real-lab-sheet")
  @UseGuards(CsrfGuard)
  @RequirePermission("work_forms.real.update", "ASSIGNED")
  public upsertRealLabSheet(
    @Param("id") workOrderId: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: UpsertRealLabSheetDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.upsertRealLabSheet({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, cycleId, dto);
  }

  @Post(":id/cycles/:cycleId/real-lab-sheet/finalize")
  @UseGuards(CsrfGuard)
  @RequirePermission("work_forms.real.finalize", "ASSIGNED")
  public finalizeRealLabSheet(
    @Param("id") workOrderId: string,
    @Param("cycleId") cycleId: string,
    @Body() dto: FinalizeRealLabSheetDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.finalizeRealLabSheet({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, cycleId, dto);
  }

  @Get(":id/assignment-history")
  @RequirePermission("works.claim.history.read", "ASSIGNED")
  public listAssignmentHistory(@CurrentUser() actor: AuthenticatedUser, @Param("id") workOrderId: string) {
    return this.worksService.listAssignmentHistory(actor.id, workOrderId);
  }

  @Post(":id/claim")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.claim.create", "ASSIGNED")
  public claimWork(@Param("id") workOrderId: string, @Body() dto: ClaimWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.claimWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post(":id/release")
  @UseGuards(CsrfGuard)
  public releaseWork(@Param("id") workOrderId: string, @Body() dto: ReleaseWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.releaseWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post(":id/reassign")
  @UseGuards(CsrfGuard)
  public reassignWork(@Param("id") workOrderId: string, @Body() dto: ReassignWorkDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.reassignWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post(":id/status")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.change_status", "OWN_STAGE")
  public setWorkStatus(@Param("id") workOrderId: string, @Body() dto: SetWorkStatusDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.setWorkStatus({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Patch(":id/technician-details")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.technical_details.update", "ASSIGNED")
  public updateTechnicianDetails(@Param("id") workOrderId: string, @Body() dto: UpdateTechnicianWorkDetailsDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.updateTechnicianDetails({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, workOrderId, dto);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("works.create", "ALL")
  public async createWork(@Body() dto: CreateWorkDto, @CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.worksService.createWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto, await this.canSetManualDeadline(actor.id));
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.update", "ASSIGNED")
  public updateWork(
    @Param("id") workOrderId: string,
    @Body() dto: UpdateWorkDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.updateWork({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  @Post(":id/deadline/recalculate")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.recalculate", "ALL")
  public recalculateDeadline(
    @Param("id") workOrderId: string,
    @Body() dto: RecalculateWorkDeadlineDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.recalculateDeadline({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  @Post(":id/deadline/manual")
  @UseGuards(CsrfGuard)
  @RequirePermission("works.deadline.set_manual", "ALL")
  public setManualDeadline(
    @Param("id") workOrderId: string,
    @Body() dto: SetManualWorkDeadlineDto,
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.worksService.setManualDeadline({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, workOrderId, dto);
  }

  private async canReadPricing(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "pricing.read",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private async canSetManualDeadline(userId: string): Promise<boolean> {
    const result = await this.authorizationService.hasPermission({
      permission: "works.deadline.set_manual",
      requiredScope: "ALL",
      userId,
    });

    return result.allowed;
  }

  private async ensureCanReadWorks(userId: string): Promise<void> {
    const [readAll, readAssigned, readAvailable] = await Promise.all([
      this.authorizationService.hasPermission({
        permission: "works.read_all",
        requiredScope: "ALL",
        userId,
      }),
      this.authorizationService.hasPermission({
        permission: "works.read_assigned",
        userId,
      }),
      this.authorizationService.hasPermission({
        permission: "works.claim.available.read",
        requiredScope: "ALL",
        userId,
      }),
    ]);

    if (!readAll.allowed && !readAssigned.allowed && !readAvailable.allowed) {
      throw new ForbiddenException("Permission denied.");
    }
  }
}
