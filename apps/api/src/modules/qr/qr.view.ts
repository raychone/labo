import type { WorkPriority } from "@prisma/client";

import { QR_PAYLOAD_PREFIX } from "./qr.constants.js";

export interface QrWorkRecord {
  readonly clinic: {
    readonly name: string;
  };
  readonly code: string;
  readonly doctor: {
    readonly displayName: string;
  };
  readonly id: string;
  readonly patientName: string;
  readonly patientReference: string | null;
  readonly priority: WorkPriority;
  readonly qrToken: string;
  readonly quantity: number;
  readonly requestedDeliveryDate: Date;
  readonly workType: {
    readonly name: string;
  };
}

export interface WorkQrLabelView {
  readonly clinicName: string;
  readonly doctorName: string;
  readonly dueDate: string;
  readonly patientDisplay: string;
  readonly priority: WorkPriority;
  readonly quantity: number;
  readonly workTypeName: string;
}

export interface WorkQrView {
  readonly label: WorkQrLabelView;
  readonly payload: string;
  readonly workCode: string;
  readonly workId: string;
}

export function createQrPayload(token: string): string {
  return `${QR_PAYLOAD_PREFIX}${token}`;
}

export function createPatientDisplay(patientName: string, patientReference: string | null): string {
  if (patientReference) {
    return patientReference;
  }

  const initials = patientName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => `${part[0]?.toLocaleUpperCase("ro-RO") ?? ""}.`)
    .join(" ");

  return initials || "Pacient";
}

export function toWorkQrView(workOrder: QrWorkRecord): WorkQrView {
  return {
    label: {
      clinicName: workOrder.clinic.name,
      doctorName: workOrder.doctor.displayName,
      dueDate: workOrder.requestedDeliveryDate.toISOString(),
      patientDisplay: createPatientDisplay(workOrder.patientName, workOrder.patientReference),
      priority: workOrder.priority,
      quantity: workOrder.quantity,
      workTypeName: workOrder.workType.name,
    },
    payload: createQrPayload(workOrder.qrToken),
    workCode: workOrder.code,
    workId: workOrder.id,
  };
}
