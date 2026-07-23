import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
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
@UseGuards(AuthGuard, PermissionsGuard)
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
  public getOverview(@Query() query: BillingRangeQueryDto) {
    return this.billingService.getOverview(query);
  }

  @Get("billing/billable-works")
  @RequirePermission("invoice.create", "ALL")
  public async listBillableWorks(@CurrentUser() actor: AuthenticatedUser, @Query() query: BillableWorksQueryDto) {
    return this.billingService.listBillableWorks(query, await this.canReadMoney(actor.id));
  }

  @Get("billing/search")
  @RequirePermission("finance.read", "ALL")
  public search(@Query() query: SearchBillingQueryDto) {
    return this.billingService.search(query);
  }

  @Get("billing/statements/clinic")
  @RequirePermission("finance.read_reports", "ALL")
  public getClinicStatement(@CurrentUser() actor: AuthenticatedUser, @Query() query: ClinicStatementQueryDto, @Req() request: Request) {
    return this.billingStatementService.getClinicStatement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query);
  }

  @Get("billing/statements/doctor")
  @RequirePermission("finance.read_reports", "ALL")
  public getDoctorStatement(@CurrentUser() actor: AuthenticatedUser, @Query() query: DoctorStatementQueryDto, @Req() request: Request) {
    return this.billingStatementService.getDoctorStatement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query);
  }

  @Get("billing/month-registry")
  @RequirePermission("finance.read_reports", "ALL")
  public getMonthRegistry(@CurrentUser() actor: AuthenticatedUser, @Query() query: BillingRangeQueryDto, @Req() request: Request) {
    return this.billingStatementService.getMonthRegistry({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query);
  }

  @Get("billing/exports/registry.csv")
  @RequirePermission("invoice.download", "ALL")
  public async exportMonthRegistryCsv(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: BillingRangeQueryDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"billing-month-registry.csv\"");

    return this.billingExportService.getMonthRegistryCsv({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, query);
  }

  @Get("billing-documents")
  @RequirePermission("invoice.read", "ALL")
  public listDocuments(@Query() query: ListBillingDocumentsQueryDto) {
    return this.billingService.listDocuments(query);
  }

  @Get("billing-documents/:id")
  @RequirePermission("invoice.read", "ALL")
  public getDocument(@Param("id") documentId: string) {
    return this.billingService.getDocument(documentId);
  }

  @Get("billing-documents/:id/print-view")
  @RequirePermission("invoice.download", "ALL")
  public getDocumentPrintView(@Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingPrintService.getDocumentPrintView({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Get("billing-documents/:id/attachment")
  @RequirePermission("invoice.download", "ALL")
  public getDocumentAttachment(@Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingPrintService.getAttachmentPrintView({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/proformas")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public createProforma(@Body() dto: CreateBillingDocumentDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createProforma({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Post("billing-documents/invoices")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public createInvoice(@Body() dto: CreateBillingDocumentDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createInvoice({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch("billing-documents/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public updateDraft(
    @Param("id") documentId: string,
    @Body() dto: UpdateBillingDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.updateDraft({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Put("billing-documents/:id/lines")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public replaceLines(
    @Param("id") documentId: string,
    @Body() dto: ReplaceBillingLinesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.replaceLines({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Post("billing-documents/:id/issue")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public issueDocument(@Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.issueDocument({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/convert-to-invoice")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.create", "ALL")
  public convertProforma(@Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.convertProformaToInvoice({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.cancel", "ALL")
  public cancelDocument(@Param("id") documentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.cancelDocument({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId);
  }

  @Post("billing-documents/:id/payments")
  @UseGuards(CsrfGuard)
  @RequirePermission("finance.record_payment", "ALL")
  public recordPayment(
    @Param("id") documentId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.recordPayment({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, documentId, dto);
  }

  @Get("payments")
  @RequirePermission("finance.read", "ALL")
  public listPayments() {
    return this.billingService.listPayments();
  }

  @Post("payments/:id/cancel")
  @UseGuards(CsrfGuard)
  @RequirePermission("finance.refund", "ALL")
  public cancelPayment(@Param("id") paymentId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.cancelPayment({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, paymentId);
  }

  @Get("billing-series")
  @RequirePermission("invoice.configure_series", "ALL")
  public listSeries() {
    return this.billingService.listSeries();
  }

  @Post("billing-series")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.configure_series", "ALL")
  public createSeries(@Body() dto: UpsertBillingSeriesDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.billingService.createSeries({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch("billing-series/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("invoice.configure_series", "ALL")
  public updateSeries(
    @Param("id") seriesId: string,
    @Body() dto: UpsertBillingSeriesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.billingService.updateSeries({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, seriesId, dto);
  }

  private async canReadMoney(userId: string): Promise<boolean> {
    const [finance, pricing] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "finance.read", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "pricing.read", requiredScope: "ALL", userId }),
    ]);

    return finance.allowed || pricing.allowed;
  }
}
