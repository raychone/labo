import { describe, expect, it } from "vitest";

import {
  createOperationalStatusCounters,
  matchesOperationalStatusTab,
  toOperationalStatusRow,
  type OperationalStatusWorkRecord,
} from "./operational-status.view.js";

function createWorkRecord(input: {
  readonly claimStatus?: "CLAIMED" | "UNCLAIMED";
  readonly deliveryStatus?: "DELIVERED" | "IN_TRANSIT" | null;
  readonly effectiveDueAt?: Date | null;
  readonly logisticsStatus?: "DELIVERED" | "HANDED_TO_DELIVERY" | "IN_PRODUCTION" | null;
  readonly stageStatus?: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  readonly workflowStatus?: "ACTIVE" | "COMPLETED";
} = {}): OperationalStatusWorkRecord {
  const delivery = input.deliveryStatus
    ? [{ code: "DL-1", id: "delivery_1", plannedDate: new Date("2026-08-04T08:00:00.000Z"), status: input.deliveryStatus, updatedAt: new Date("2026-08-04T09:00:00.000Z") }]
    : [];

  return {
    assignedTechnician: null,
    assignedTechnicianId: null,
    baseUnitPriceMinor: 10_000,
    calculatedDueAt: input.effectiveDueAt ?? null,
    claimRevision: 1,
    claimSource: input.claimStatus === "CLAIMED" ? "TECHNICIAN_CLAIM" : null,
    claimStatus: input.claimStatus ?? "UNCLAIMED",
    claimedAt: input.claimStatus === "CLAIMED" ? new Date("2026-08-03T08:00:00.000Z") : null,
    claimedBy: input.claimStatus === "CLAIMED" ? { displayName: "Tehnician", id: "tech_1" } : null,
    claimedByUserId: input.claimStatus === "CLAIMED" ? "tech_1" : null,
    clinic: { id: "clinic_1", name: "Clinica Demo" },
    clinicId: "clinic_1",
    clinicalNotes: null,
    code: "WO-2026-000001",
    createdAt: new Date("2026-08-01T08:00:00.000Z"),
    createdByUserId: null,
    currency: "RON",
    deadlineCalculatedAt: null,
    deadlineDueHour: null,
    deadlineDueMinute: null,
    deadlineExecutionDays: null,
    deadlineExplanation: null,
    deadlineIncludeStartDay: null,
    deadlineLockedAt: null,
    deadlineLockedReason: null,
    deadlineMode: input.effectiveDueAt === null ? null : "CALCULATED",
    deadlineReasonCode: null,
    deadlineRevision: 1,
    deadlineRuleSnapshot: null,
    deadlineSource: "CREATION",
    deadlineStartAt: null,
    deadlineTimezone: null,
    deliveryPreparationItems: [{
      addedAt: new Date("2026-08-04T07:00:00.000Z"),
      addedByUserId: null,
      group: {
        deliveries: delivery,
        clinicId: "clinic_1",
        code: "GR-1",
        createdAt: new Date("2026-08-04T07:00:00.000Z"),
        createdByUserId: null,
        id: "group_1",
        notes: null,
        plannedDate: new Date("2026-08-04T08:00:00.000Z"),
        status: "READY",
        updatedAt: new Date("2026-08-04T07:30:00.000Z"),
        updatedByUserId: null,
        version: 1,
      },
      groupId: "group_1",
      id: "item_1",
      isActive: true,
      removedAt: null,
      removedByUserId: null,
      workOrderId: "work_1",
    }],
    doctor: { displayName: "Dr. Demo", id: "doctor_1" },
    doctorId: "doctor_1",
    effectiveDueAt: input.effectiveDueAt ?? null,
    executionLegalEntity: { code: "NC", displayName: "Nicolaie Cristina" },
    executionLegalEntityId: "legal_1",
    externalReference: null,
    id: "work_1",
    internalNotes: null,
    invoicedDocumentId: null,
    activeCycle: {
      cycleNumber: 1,
      id: "cycle_1",
      reason: "INITIAL",
      status: "ACTIVE",
      logisticsState: input.logisticsStatus ? { status: input.logisticsStatus } : null,
      workflowExecution: {
        completedAt: input.workflowStatus === "COMPLETED" ? new Date("2026-08-04T10:00:00.000Z") : null,
        createdAt: new Date("2026-08-01T08:00:00.000Z"),
        currentStage: {
          assignedAt: null,
          assignedByUserId: null,
          assignedUser: { displayName: "Tehnician", id: "tech_1" },
          assignedUserId: "tech_1",
          completedAt: null,
          completedByUserId: null,
          createdAt: new Date("2026-08-01T08:00:00.000Z"),
          estimatedDurationMinutesSnapshot: null,
          id: "stage_1",
          stageDefinitionId: null,
          stageDescriptionSnapshot: null,
          stageKeySnapshot: "modelaj",
          stageNameSnapshot: "Modelaj",
          sortOrder: 1,
          startedAt: null,
          startedByUserId: null,
          status: input.stageStatus ?? "PENDING",
          updatedAt: new Date("2026-08-01T08:00:00.000Z"),
          version: 1,
          workflowExecutionId: "workflow_1",
        },
        currentStageExecutionId: "stage_1",
        id: "workflow_1",
        startedAt: new Date("2026-08-01T08:00:00.000Z"),
        stages: [{ status: "COMPLETED" }, { status: input.stageStatus ?? "PENDING" }],
        status: input.workflowStatus ?? "ACTIVE",
        updatedAt: new Date("2026-08-01T08:00:00.000Z"),
        version: 1,
        workflowNameSnapshot: "Flux demo",
        workflowTemplateId: null,
        workflowTemplateVersion: 1,
        workCycleId: "cycle_1",
        workOrderId: "work_1",
      },
    },
    activeCycleId: "cycle_1",
    manualDueAt: null,
    patient: { id: "patient_1" },
    patientId: "patient_1",
    patientName: "Pacient Demo",
    patientReference: "P-1",
    priority: "NORMAL",
    qrCreatedAt: new Date("2026-08-01T08:00:00.000Z"),
    qrToken: "qr_1",
    quantity: 1,
    releaseReason: null,
    releasedAt: null,
    releasedByUserId: null,
    requestedDeliveryDate: new Date("2026-08-05T08:00:00.000Z"),
    status: "REGISTERED",
    totalPriceMinor: 10_000,
    updatedAt: new Date("2026-08-02T08:00:00.000Z"),
    updatedByUserId: null,
    version: 1,
    workType: { id: "type_1", name: "Coroană" },
    workTypeId: "type_1",
  } as unknown as OperationalStatusWorkRecord;
}

describe("operational status view", () => {
  it("maps operational fields and excludes financial fields", () => {
    const row = toOperationalStatusRow(createWorkRecord({ effectiveDueAt: new Date("2026-08-04T10:00:00.000Z") }), new Date("2026-08-04T08:00:00.000Z"));

    expect(row.workCode).toBe("WO-2026-000001");
    expect(row.workflow.progress).toBe("1/2");
    expect(row.deadline.state).toBe("DUE_TODAY");
    expect(JSON.stringify(row)).not.toContain("totalPriceMinor");
    expect(JSON.stringify(row)).not.toContain("baseUnitPriceMinor");
    expect(row.currentCycle).toMatchObject({ label: "Cycle 1", number: 1, reason: "INITIAL", status: "ACTIVE" });
  });

  it("classifies required tabs from existing operational state", () => {
    const today = toOperationalStatusRow(createWorkRecord({ effectiveDueAt: new Date("2026-08-04T10:00:00.000Z") }), new Date("2026-08-04T08:00:00.000Z"));
    const inProgress = toOperationalStatusRow(createWorkRecord({ claimStatus: "CLAIMED", stageStatus: "IN_PROGRESS" }), new Date("2026-08-04T08:00:00.000Z"));
    const delivered = toOperationalStatusRow(createWorkRecord({ deliveryStatus: "DELIVERED", logisticsStatus: "DELIVERED", workflowStatus: "COMPLETED" }), new Date("2026-08-04T08:00:00.000Z"));

    expect(matchesOperationalStatusTab(today, "TODAY")).toBe(true);
    expect(matchesOperationalStatusTab(inProgress, "IN_PROGRESS")).toBe(true);
    expect(matchesOperationalStatusTab(delivered, "AT_CLINIC")).toBe(true);
    expect(matchesOperationalStatusTab(delivered, "COMPLETED")).toBe(true);
  });

  it("keeps returned count at zero when cycle data does not exist", () => {
    const rows = [toOperationalStatusRow(createWorkRecord(), new Date("2026-08-04T08:00:00.000Z"))];
    const returned = createOperationalStatusCounters(rows).find((counter) => counter.tab === "RETURNED");

    expect(returned?.count).toBe(0);
  });
});
