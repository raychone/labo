import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentLegalEntity } from "../organization-context/current-legal-entity.decorator.js";
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { RequireLegalEntityContext } from "../organization-context/require-legal-entity-context.decorator.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { BillingExportService } from "./billing-export.service.js";
import { BillingPrintService } from "./billing-print.service.js";
import { BillingService } from "./billing.service.js";
import { BillingStatementService } from "./billing-statement.service.js";
import {
  BillableWorksQueryDto,
  BillingRangeQueryDto,
  ClinicStatementQueryDto,
  CreateBillingDocumentDto,
  DoctorStatementQueryDto,
  ListBillingDocumentsQueryDto,
  RecordPaymentDto,
  ReplaceBillingLinesDto,
  SearchBillingQueryDto,
  UpdateBillingDocumentDto,
  UpsertBillingSeriesDto,
} from "./dto/billing.dto.js";

@Controller()
@RequireLegalEntityContext()
@UseGuards(AuthGuard, PermissionsGuard, LegalEntityContextGuard)
export class BillingController {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(BillingExportService) private readonly billingExportService: BillingExportService,
    @Inject(BillingPrintService) private readonly billingPrintService: BillingPrintService,
    @Inject(BillingService) private readonly billingService: BillingService,
    @Inject(BillingStatementService) private readonly billingStatementService: BillingStatementService,
  ) {}

  @Get("billing/overview")
  @RequirePermission("finance.read", "ALL")
  public getOverview(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Query() query: BillingRangeQueryDto) {
    return this.billingService.getOverview(legalEntity, query);
  }

  @Get("billing/billable-works")
  @RequirePermission("invoice.create", "ALL")
  public async listBillableWorks(@CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Query() query: BillableWorksQueryDto) {
    return this.billingService.listBillableWorks(legalEntity, query, await this.canReadMoney(actor.id));
  }

  @Get("billing/search")
  @RequirePermission("finance.read", "ALL")
  public search(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Query() query: SearchBillingQueryDto) {
    return this.billingService.search(legalEntity, query);
  }

  @Get("billing/statements/clinic")
  @RequirePermission("finance.read_reports", "ALL")
  public getClinicStatement(@CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Query() query: ClinicStatementQueryDto, @Req() request: Request) {
    return this.billingStatementService.getClinicStatement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, query);
  }

  @Get("billing/statements/doctor")
  @RequirePermission("finance.read_reports", "ALL")
  public getDoctorStatement(@CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Query() query: DoctorStatementQueryDto, @Req() request: Request) {
    return this.billingStatementService.getDoctorStatement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, query);
  }

  @Get("billing/month-registry")
  @RequirePermission("finance.read_reports", "ALL")
  public getMonthRegistry(@CurrentLegalEntity() legalEntity: LegalEntityContext, @CurrentUser() actor: AuthenticatedUser, @Query() query: BillingRangeQueryDto, @Req() request: Request) {
    return this.billingStatementService.getMonthRegistry({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, query);
  }

  @Get("billing/exports/registry.csv")
  @RequirePermission("invoice.download", "ALL")
  public async exportMonthRegistryCsv(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: BillingRangeQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"registru-lunar-facturare.csv\"");

    return this.billingExportService.getMonthRegistryCsv({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, query);
  }

  @Get("billing-documents")
  @RequirePermission("invoice.read", "ALL")
  public listDocuments(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Query() query: ListBillingDocumentsQueryDto) {
    return this.billingService.listDocuments(legalEntity, query);
  }

  @Get("billing-documents/:id")
  @RequirePermission("invoice.read", "ALL")
  public getDocument(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string) {
    return this.billingService.getDocument(legalEntity, documentId);
  }

  @Get("billing-documents/:id/print-view")
  @RequirePermission("invoice.download", "ALL")
  public getDocumentPrintView(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingPrintService.getDocumentPrintView({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, documentId);
  }

  @Get("billing-documents/:id/attachment")
  @RequirePermission("invoice.download", "ALL")
  public getDocumentAttachment(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingPrintService.getAttachmentPrintView({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, documentId);
  }

  @Post("billing-documents/proformas")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public createProforma(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Body() dto: CreateBillingDocumentDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createProforma({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto);
  }

  @Post("billing-documents/invoices")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public createInvoice(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Body() dto: CreateBillingDocumentDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createInvoice({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto);
  }

  @Patch("billing-documents/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public updateDraft(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Param("id") documentId: string,
    @Body() dto: UpdateBillingDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.updateDraft(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Put("billing-documents/:id/lines")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public replaceLines(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Param("id") documentId: string,
    @Body() dto: ReplaceBillingLinesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.replaceLines(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Post("billing-documents/:id/issue")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public issueDocument(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.issueDocument(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/convert-to-invoice")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public convertProforma(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.convertProformaToInvoice(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.cancel", "ALL")
  public cancelDocument(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.cancelDocument(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/payments")
  @UseGuards(CsrfGuard)
  @RequirePermission("finance.record_payment", "ALL")
  public recordPayment(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Param("id") documentId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.recordPayment(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Get("payments")
  @RequirePermission("finance.read", "ALL")
  public listPayments(@CurrentLegalEntity() legalEntity: LegalEntityContext) {
    return this.billingService.listPayments(legalEntity);
  }

  @Post("payments/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("finance.refund", "ALL")
  public cancelPayment(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") paymentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.cancelPayment(legalEntity, { actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, paymentId);
  }

  @Get("billing-series")
  @RequirePermission("invoice.configure_series", "ALL")
  public listSeries(@CurrentLegalEntity() legalEntity: LegalEntityContext) {
    return this.billingService.listSeries(legalEntity);
  }

  @Post("billing-series")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.configure_series", "ALL")
  public createSeries(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Body() dto: UpsertBillingSeriesDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createSeries({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto);
  }

  @Patch("billing-series/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.configure_series", "ALL")
  public updateSeries(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @Param("id") seriesId: string,
    @Body() dto: UpsertBillingSeriesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.updateSeries({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, seriesId, dto);
  }

  private async canReadMoney(userId: string): Promise<boolean> {
    const [finance, pricing] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "finance.read", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId }),
    ]);

    return finance.allowed || pricing.allowed;
  }
}
