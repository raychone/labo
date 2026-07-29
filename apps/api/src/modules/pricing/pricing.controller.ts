import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import { CurrentLegalEntity } from "../organization-context/current-legal-entity.decorator.js";
import { LegalEntityContextGuard } from "../organization-context/legal-entity-context.guard.js";
import { RequireLegalEntityContext } from "../organization-context/require-legal-entity-context.decorator.js";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import {
  PriceCatalogItemDto,
  PricingAgreementDto,
  PricingAgreementsQueryDto,
  PricingCatalogQueryDto,
  ReplaceExecutionRulesDto,
  ReplacePricingAgreementRulesDto,
  ResolvePreviewDto,
} from "./dto/pricing.dto.js";
import { PricingService } from "./pricing.service.js";

@Controller("pricing")
@RequireLegalEntityContext()
@UseGuards(AuthGuard, PermissionsGuard, LegalEntityContextGuard)
export class PricingController {
  public constructor(@Inject(PricingService) private readonly pricingService: PricingService) {}

  @Get("catalog")
  @RequirePermission("pricing.read")
  public listCatalog(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Query() query: PricingCatalogQueryDto) {
    return this.pricingService.listCatalog(legalEntity, query);
  }

  @Get("catalog/:id")
  @RequirePermission("pricing.read")
  public getCatalogItem(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") catalogItemId: string) {
    return this.pricingService.getCatalogItem(legalEntity, catalogItemId);
  }

  @Post("catalog")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.create", "ALL")
  public createCatalogItem(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Body() dto: PriceCatalogItemDto,
  ) {
    return this.pricingService.createCatalogItem({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto);
  }

  @Patch("catalog/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.update", "ALL")
  public updateCatalogItem(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") catalogItemId: string,
    @Body() dto: PriceCatalogItemDto,
  ) {
    return this.pricingService.updateCatalogItem({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, catalogItemId, dto);
  }

  @Post("catalog/:id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.archive", "ALL")
  public archiveCatalogItem(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") catalogItemId: string,
  ) {
    return this.pricingService.archiveCatalogItem({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, catalogItemId);
  }

  @Post("catalog/:id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.archive", "ALL")
  public restoreCatalogItem(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") catalogItemId: string,
  ) {
    return this.pricingService.restoreCatalogItem({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, catalogItemId);
  }

  @Put("catalog/:id/execution-rules")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.update", "ALL")
  public replaceExecutionRules(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") catalogItemId: string,
    @Body() dto: ReplaceExecutionRulesDto,
  ) {
    return this.pricingService.replaceExecutionRules({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, catalogItemId, dto.rules);
  }

  @Get("agreements")
  @RequirePermission("pricing.agreements.read")
  public listAgreements(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Query() query: PricingAgreementsQueryDto) {
    return this.pricingService.listAgreements(legalEntity, query);
  }

  @Get("agreements/:id")
  @RequirePermission("pricing.agreements.read")
  public getAgreement(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Param("id") agreementId: string) {
    return this.pricingService.getAgreement(legalEntity, agreementId);
  }

  @Post("agreements")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.agreements.manage", "ALL")
  public createAgreement(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Body() dto: PricingAgreementDto,
  ) {
    return this.pricingService.createAgreement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, dto);
  }

  @Patch("agreements/:id")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.agreements.manage", "ALL")
  public updateAgreement(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") agreementId: string,
    @Body() dto: PricingAgreementDto,
  ) {
    return this.pricingService.updateAgreement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, agreementId, dto);
  }

  @Put("agreements/:id/rules")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.agreements.manage", "ALL")
  public replaceAgreementRules(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") agreementId: string,
    @Body() dto: ReplacePricingAgreementRulesDto,
  ) {
    return this.pricingService.replaceAgreementRules({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, agreementId, dto.rules);
  }

  @Post("agreements/:id/archive")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.agreements.manage", "ALL")
  public archiveAgreement(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") agreementId: string,
  ) {
    return this.pricingService.archiveAgreement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, agreementId);
  }

  @Post("agreements/:id/restore")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.agreements.manage", "ALL")
  public restoreAgreement(
    @CurrentLegalEntity() legalEntity: LegalEntityContext,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
    @Param("id") agreementId: string,
  ) {
    return this.pricingService.restoreAgreement({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, legalEntity, agreementId);
  }

  @Post("resolve-preview")
  @UseGuards(CsrfGuard)
  @RequirePermission("pricing.resolve_preview", "ALL")
  public resolvePreview(@CurrentLegalEntity() legalEntity: LegalEntityContext, @Body() dto: ResolvePreviewDto) {
    return this.pricingService.resolvePreview(legalEntity, dto);
  }
}
