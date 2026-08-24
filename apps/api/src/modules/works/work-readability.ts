import { ForbiddenException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AuthorizationService, doesScopeSatisfy } from "../rbac/authorization.service.js";

/**
 * The single WorkOrder visibility predicate used by both Works and item reads.
 * Item endpoints must never downgrade this predicate to permission presence only.
 */
export async function getVisibleWorkWhere(
  authorizationService: AuthorizationService,
  userId: string,
): Promise<Prisma.WorkOrderWhereInput> {
  const [readAll, readAssigned, readAvailable] = await Promise.all([
    authorizationService.hasPermission({ permission: "works.read_all", requiredScope: "ALL", userId }),
    authorizationService.hasPermission({ permission: "works.read_assigned", userId }),
    authorizationService.hasPermission({ permission: "works.claim.available.read", requiredScope: "ALL", userId }),
  ]);

  if (readAll.allowed) return {};
  if (!readAssigned.allowed && !readAvailable.allowed) throw new ForbiddenException("Permission denied.");

  const canReadAssigned = readAssigned.effectiveScopes.some((scope) => doesScopeSatisfy(scope, "ASSIGNED") || doesScopeSatisfy(scope, "OWN_STAGE"));
  if (!canReadAssigned && !readAvailable.allowed) return { id: "__no_visible_work__" };

  return {
    OR: [
      { assignedTechnicianId: userId },
      { claimedByUserId: userId },
      ...(readAvailable.allowed ? [{ claimStatus: "UNCLAIMED" as const }] : []),
      { activeCycle: { is: { workflowExecution: { is: { currentStage: { is: { assignedUserId: userId } } } } } } },
      { activeCycle: { is: { workflowExecution: { is: { stages: { some: { assignedUserId: userId } } } } } } },
    ],
  };
}
