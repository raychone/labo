import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../database/prisma.service.js";
import { AuthorizationService, doesScopeSatisfy } from "../rbac/authorization.service.js";
import type { PermissionScope } from "../rbac/permission-registry.js";
import type { OperationalStatusQueryDto } from "./dto/operational-status.dto.js";
import { OPERATIONAL_STATUS_MAX_SCANNED_ROWS } from "./status.constants.js";
import {
  compareOperationalStatusRows,
  createOperationalStatusCounters,
  matchesDeadlineState,
  matchesOperationalStatusTab,
  operationalStatusWorkInclude,
  toOperationalStatusRow,
  type OperationalStatusResponseView,
  type OperationalStatusRowView,
} from "./operational-status.view.js";

interface WorkAccess {
  readonly canReadAll: boolean;
  readonly readAssignedScopes: readonly PermissionScope[];
}

@Injectable()
export class OperationalStatusService {
  public constructor(
    @Inject(AuthorizationService) private readonly authorizationService: AuthorizationService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async getOperationalStatus(actor: AuthenticatedUser, query: OperationalStatusQueryDto): Promise<OperationalStatusResponseView> {
    const access = await this.getWorkAccess(actor.id);
    const baseRows = await this.prisma.workOrder.findMany({
      include: operationalStatusWorkInclude,
      orderBy: {
        updatedAt: "desc",
      },
      take: OPERATIONAL_STATUS_MAX_SCANNED_ROWS + 1,
      where: this.toBaseWhere(actor, query, access),
    });
    const hasMoreBaseRows = baseRows.length > OPERATIONAL_STATUS_MAX_SCANNED_ROWS;
    const scannedRows = baseRows.slice(0, OPERATIONAL_STATUS_MAX_SCANNED_ROWS);
    const now = new Date();
    const rows = scannedRows
      .map((work) => toOperationalStatusRow(work, now))
      .filter((row) => !(row.technicalReadiness === "PROBE_READY" && (row.logistics.status === "DELIVERED" || row.delivery.status === "DELIVERED")))
      .filter((row) => this.matchesComputedFilters(row, query));
    const counters = createOperationalStatusCounters(rows);
    const tabRows = rows
      .filter((row) => matchesOperationalStatusTab(row, query.tab))
      .sort((left, right) => compareOperationalStatusRows(left, right, query.sortBy, query.sortDirection));
    const total = tabRows.length;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;

    return {
      counters,
      items: tabRows.slice(offset, offset + pageSize),
      meta: {
        hasMore: hasMoreBaseRows || offset + pageSize < total,
        page,
        pageSize,
        scannedRows: scannedRows.length,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  private async getWorkAccess(userId: string): Promise<WorkAccess> {
    const [readAll, readAssigned] = await Promise.all([
      this.authorizationService.hasPermission({ permission: "works.read_all", requiredScope: "ALL", userId }),
      this.authorizationService.hasPermission({ permission: "works.read_assigned", userId }),
    ]);

    if (!readAll.allowed && !readAssigned.allowed) {
      throw new ForbiddenException("Permission denied.");
    }

    return {
      canReadAll: readAll.allowed,
      readAssignedScopes: readAssigned.effectiveScopes,
    };
  }

  private toBaseWhere(actor: AuthenticatedUser, query: OperationalStatusQueryDto, access: WorkAccess): Prisma.WorkOrderWhereInput {
    const search = query.search?.trim();
    return {
      AND: [
        this.toVisibilityWhere(actor, access),
        {
          ...(query.clinicId ? { clinicId: query.clinicId } : {}),
          ...(query.doctorId ? { doctorId: query.doctorId } : {}),
          ...(query.patientId ? { patientId: query.patientId } : {}),
          ...(query.workTypeId ? { workTypeId: query.workTypeId } : {}),
          ...(query.executionLegalEntityCode ? { executionLegalEntity: { is: { code: query.executionLegalEntityCode } } } : {}),
          ...(query.priority ? { priority: query.priority } : {}),
          ...(query.logisticsStatus ? { activeCycle: { is: { logisticsState: { is: { status: query.logisticsStatus } } } } } : {}),
          ...(query.ownerUserId ? { OR: [{ assignedTechnicianId: query.ownerUserId }, { claimedByUserId: query.ownerUserId }] } : {}),
          ...(query.stageTechnicianUserId
            ? { activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { assignedUserId: query.stageTechnicianUserId } } } } } } }
            : {}),
          ...(query.deliveryStatus
            ? {
                deliveryPreparationItems: {
                  some: {
                    group: {
                      deliveries: {
                        some: {
                          isActive: true,
                          status: query.deliveryStatus,
                        },
                      },
                    },
                    isActive: true,
                  },
                },
              }
            : {}),
          ...(search
            ? {
                OR: [
                  { code: { contains: search, mode: "insensitive" } },
                  { patientName: { contains: search, mode: "insensitive" } },
                  { patientReference: { contains: search, mode: "insensitive" } },
                  { clinic: { name: { contains: search, mode: "insensitive" } } },
                  { doctor: { displayName: { contains: search, mode: "insensitive" } } },
                  { workType: { name: { contains: search, mode: "insensitive" } } },
                  { workType: { symbol: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
      ],
    };
  }

  private toVisibilityWhere(actor: AuthenticatedUser, access: WorkAccess): Prisma.WorkOrderWhereInput {
    if (access.canReadAll) {
      return {};
    }

    const scopes = access.readAssignedScopes;
    const canReadAssigned = scopes.some((scope) => doesScopeSatisfy(scope, "ASSIGNED") || doesScopeSatisfy(scope, "OWN_STAGE"));
    const canReadOwnStage = scopes.some((scope) => doesScopeSatisfy(scope, "OWN_STAGE"));
    const canReadOwnDelivery = scopes.some((scope) => doesScopeSatisfy(scope, "OWN_DELIVERY"));
    const canReadOwnClinic = scopes.some((scope) => doesScopeSatisfy(scope, "OWN_CLINIC"));
    const visibility: Prisma.WorkOrderWhereInput[] = [];

    if (canReadAssigned || canReadOwnStage) {
      visibility.push(
        { assignedTechnicianId: actor.id },
        { claimedByUserId: actor.id },
        { activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { assignedUserId: actor.id } } } } } } },
        { activeCycle: { is: { workflowExecution: { is: { stages: { some: { assignedUserId: actor.id } } } } } } },
      );
    }

    if (canReadOwnDelivery) {
      visibility.push({
        deliveryPreparationItems: {
          some: {
            group: {
              deliveries: {
                some: {
                  courierUserId: actor.id,
                  isActive: true,
                },
              },
            },
            isActive: true,
          },
        },
      });
    }

    if (canReadOwnClinic) {
      visibility.push({ doctor: { email: actor.email } });
    }

    return visibility.length > 0 ? { OR: visibility } : { id: "__no_status_visibility__" };
  }

  private matchesComputedFilters(row: OperationalStatusRowView, query: OperationalStatusQueryDto): boolean {
    if (!matchesDeadlineState(row, query.deadlineState)) {
      return false;
    }
    if (query.deliveryStatus && row.delivery.status !== query.deliveryStatus) {
      return false;
    }
    if (query.ownerUserId && row.workOwner?.publicId !== query.ownerUserId) {
      return false;
    }
    if (query.stageTechnicianUserId && row.currentStageTechnician?.publicId !== query.stageTechnicianUserId) {
      return false;
    }
    if (query.sheetStatus && row.realLabSheet.status !== query.sheetStatus) {
      return false;
    }
    return true;
  }
}
