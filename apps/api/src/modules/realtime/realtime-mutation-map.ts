import type { RealtimeEventType, RealtimeTopic } from "@dental-lab/shared";

export interface RealtimeMutationDescriptor {
  readonly audienceUserId?: string;
  readonly authTargetUserId?: string;
  readonly technicianSubjectUserId?: string;
  readonly topics: readonly RealtimeTopic[];
  readonly type: RealtimeEventType;
}

export interface RealtimeMutationRequest {
  readonly actorUserId?: string;
  readonly body?: unknown;
  readonly method: string;
  readonly path: string;
}

const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export function describeRealtimeMutation(request: RealtimeMutationRequest): RealtimeMutationDescriptor | null {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const path = normalizePath(request.path);
  const root = path.split("/")[1] ?? "";

  if (root === "notifications") {
    return request.actorUserId
      ? { audienceUserId: request.actorUserId, topics: ["notifications"], type: "NOTIFICATION_CHANGED" }
      : null;
  }

  if (root === "users") {
    const encodedTargetUserId = path.match(/^\/users\/([^/]+)/)?.[1];
    const targetUserId = encodedTargetUserId ? safeDecodePathSegment(encodedTargetUserId) : undefined;
    return {
      ...(targetUserId ? { authTargetUserId: targetUserId } : {}),
      topics: ["auth", "users", "works", "status", "technician-workbench", "logistics", "audit"],
      type: "ACCESS_CHANGED",
    };
  }

  if (path === "/auth/me/profile" && request.actorUserId) {
    return {
      authTargetUserId: request.actorUserId,
      topics: ["auth", "users", "works", "status", "technician-workbench", "logistics"],
      type: "REFERENCE_CHANGED",
    };
  }

  if (root === "organization-context" && request.actorUserId) {
    return {
      audienceUserId: request.actorUserId,
      topics: ["organization-context", "settings", "works", "status", "logistics", "billing", "pricing"],
      type: "SETTINGS_CHANGED",
    };
  }

  if (root === "settings") {
    return { topics: ["settings", "audit"], type: "SETTINGS_CHANGED" };
  }

  if (["billing", "billing-documents", "billing-series", "payments"].includes(root)) {
    return { topics: ["billing", "works", "audit", "notifications"], type: "BILLING_CHANGED" };
  }

  if (root === "technician-operations") {
    const performed = path.includes("/performed");
    const technicianSubjectUserId = performed
      ? request.actorUserId
      : path === "/technician-operations/payments" || path === "/technician-operations/rates"
        ? getStringProperty(request.body, "technicianId")
        : undefined;
    return {
      ...(technicianSubjectUserId ? { technicianSubjectUserId } : {}),
      topics: performed
        ? ["technician-operations", "technician-earnings", "technician-workbench", "works", "status", "audit"]
        : ["technician-operations", "technician-earnings", "pricing", "audit"],
      type: "TECHNICIAN_CHANGED",
    };
  }

  if (["deliveries", "routes", "pickup-requests", "delivery-preparation-groups", "logistics"].includes(root)) {
    return logisticsDescriptor();
  }

  if (root === "works") {
    if (path.includes("/logistics")) {
      return logisticsDescriptor();
    }

    return {
      topics: ["works", "status", "technician-workbench", "logistics", "notifications", "audit"],
      type: "WORK_CHANGED",
    };
  }

  if (["clinics", "doctors", "patients"].includes(root)) {
    return { topics: ["clinics", "patients", "works", "status", "logistics", "billing", "audit"], type: "REFERENCE_CHANGED" };
  }

  if (["pricing", "work-types", "work-form-templates", "workflow-templates"].includes(root)) {
    return { topics: ["pricing", "work-types", "work-forms", "workflow-templates", "works", "audit"], type: "REFERENCE_CHANGED" };
  }

  return null;
}

function logisticsDescriptor(): RealtimeMutationDescriptor {
  return {
    topics: ["logistics", "deliveries", "works", "status", "billing", "notifications", "audit"],
    type: "LOGISTICS_CHANGED",
  };
}

function normalizePath(value: string): string {
  const withoutQuery = value.split("?", 1)[0] ?? "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

function safeDecodePathSegment(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }
}

function getStringProperty(value: unknown, property: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[property];
  if (typeof candidate !== "string") return undefined;
  const normalized = candidate.trim();
  return normalized.length > 0 ? normalized : undefined;
}
