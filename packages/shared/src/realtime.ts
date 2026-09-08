export const REALTIME_EVENT_TYPES = [
  "ACCESS_CHANGED",
  "BILLING_CHANGED",
  "LOGISTICS_CHANGED",
  "NOTIFICATION_CHANGED",
  "REFERENCE_CHANGED",
  "SETTINGS_CHANGED",
  "TECHNICIAN_CHANGED",
  "WORK_CHANGED",
] as const;

export const REALTIME_TOPICS = [
  "audit",
  "auth",
  "billing",
  "clinics",
  "deliveries",
  "logistics",
  "notifications",
  "organization-context",
  "patients",
  "pricing",
  "settings",
  "status",
  "technician-earnings",
  "technician-operations",
  "technician-workbench",
  "users",
  "work-forms",
  "work-types",
  "workflow-templates",
  "works",
] as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];
export type RealtimeTopic = (typeof REALTIME_TOPICS)[number];

/**
 * A deliberately small invalidation envelope. It never contains entity data,
 * patient data, financial values, credentials, or permission snapshots.
 */
export interface RealtimeEventEnvelope {
  readonly id: string;
  readonly occurredAt: string;
  readonly topics: readonly RealtimeTopic[];
  readonly type: RealtimeEventType;
}

export function isRealtimeEventEnvelope(value: unknown): value is RealtimeEventEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.id === "string"
    && value.id.length > 0
    && typeof value.occurredAt === "string"
    && REALTIME_EVENT_TYPES.includes(value.type as RealtimeEventType)
    && Array.isArray(value.topics)
    && value.topics.length > 0
    && value.topics.every((topic) => REALTIME_TOPICS.includes(topic as RealtimeTopic));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
