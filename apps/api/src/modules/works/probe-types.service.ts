import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ProbeTypeView } from "@dental-lab/shared";
import { POSTMEETING_AUDIT_ACTIONS } from "@dental-lab/shared";

import { AuditService } from "../auth/audit.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService } from "../rbac/authorization.service.js";
import type { CreateProbeTypeDto, UpdateProbeTypeDto } from "./dto/probe-types.dto.js";

@Injectable()
export class ProbeTypesService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async list(actorUserId: string, includeArchived = false): Promise<readonly ProbeTypeView[]> {
    await this.authorizationService.requirePermission({ permission: "probe_types.read", requiredScope: "ALL", userId: actorUserId });
    const types = await this.prisma.probeType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], where: includeArchived ? {} : { isArchived: false } });
    return types.map(toProbeTypeView);
  }

  public async requireSelectable(id: string, tx: Prisma.TransactionClient | PrismaService): Promise<{ readonly code: string | null; readonly id: string; readonly name: string }> {
    const type = await tx.probeType.findFirst({ select: { code: true, id: true, isArchived: true, name: true }, where: { id } });
    if (!type) throw new BadRequestException("Tipul probei selectat nu există.");
    if (type.isArchived) throw new BadRequestException("Tipul probei selectat este arhivat și nu poate fi folosit pentru o probă nouă.");
    return type;
  }

  public async create(actorUserId: string, dto: CreateProbeTypeDto): Promise<ProbeTypeView> {
    await this.authorizationService.requirePermission({ permission: "probe_types.manage", requiredScope: "ALL", userId: actorUserId });
    try {
      const type = await this.prisma.probeType.create({ data: { code: dto.code ?? null, createdByUserId: actorUserId, name: dto.name, sortOrder: dto.sortOrder ?? 0, symbol: dto.symbol ?? null } });
      await this.auditService.record({ action: POSTMEETING_AUDIT_ACTIONS.probeTypeCreated, actorUserId, metadata: { probeTypeName: type.name }, resourceId: type.id, resourceType: "probe_type" });
      return toProbeTypeView(type);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Există deja un tip de probă cu acest nume.");
      throw error;
    }
  }

  public async update(actorUserId: string, id: string, dto: UpdateProbeTypeDto): Promise<ProbeTypeView> {
    await this.authorizationService.requirePermission({ permission: "probe_types.manage", requiredScope: "ALL", userId: actorUserId });
    const existing = await this.prisma.probeType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tipul probei nu a fost găsit.");
    try {
      const type = await this.prisma.probeType.update({ data: { ...(dto.code !== undefined ? { code: dto.code } : {}), ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}), ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}), ...(dto.isArchived !== undefined ? { isArchived: dto.isArchived, archivedByUserId: dto.isArchived ? actorUserId : null } : {}), updatedByUserId: actorUserId }, where: { id } });
      await this.auditService.record({ action: dto.isArchived === true ? POSTMEETING_AUDIT_ACTIONS.probeTypeArchived : dto.isArchived === false ? POSTMEETING_AUDIT_ACTIONS.probeTypeRestored : POSTMEETING_AUDIT_ACTIONS.probeTypeUpdated, actorUserId, metadata: { probeTypeName: type.name }, resourceId: id, resourceType: "probe_type" });
      return toProbeTypeView(type);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Există deja un tip de probă cu acest nume.");
      throw error;
    }
  }
}

export function toProbeTypeView(type: { code?: string | null; id: string; name: string; sortOrder: number; isArchived: boolean; symbol?: string | null }): ProbeTypeView {
  return { id: type.id, isArchived: type.isArchived, name: type.name, sortOrder: type.sortOrder, ...(type.code ? { code: type.code } : {}), ...(type.symbol ? { symbol: type.symbol } : {}) };
}
