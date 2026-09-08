import { Injectable } from "@nestjs/common";
import type { RealtimeTopic } from "@dental-lab/shared";

import type { InternalRealtimeEvent } from "./realtime-event-broker.js";

const TOPIC_PERMISSION_RULES: Readonly<Record<Exclude<RealtimeTopic, "auth" | "technician-earnings">, readonly string[]>> = {
  audit: ["audit.read"],
  billing: ["finance.", "invoice.", "discounts.", "reports.financial"],
  clinics: ["clinics.read", "doctors.read", "works.create"],
  deliveries: ["delivery.", "routes."],
  logistics: ["logistics.", "pickup.", "routes.", "delivery."],
  notifications: ["notifications.read_own"],
  "organization-context": ["organization_context.read", "organization_context.switch"],
  patients: ["patients.read", "works.create"],
  pricing: ["pricing.", "discounts.", "technician.rates."],
  settings: ["settings.read"],
  status: ["works.read_all", "works.read_assigned"],
  "technician-operations": ["technician.operations.", "technician.rates."],
  "technician-workbench": ["technician.workbench.read", "technician.workload.read"],
  users: ["users.read", "roles.read", "permissions.read"],
  "work-forms": ["forms.", "work_forms.real."],
  "work-types": ["pricing.read", "works.create", "forms.read", "workflow.read"],
  "workflow-templates": ["workflow.read", "workflow.configure"],
  works: ["works.read_all", "works.read_assigned", "works.claim.", "cycles.read", "cycles.history.read", "workflow.read", "scan.use"],
};

@Injectable()
export class RealtimeAudienceService {
  public allowedTopics(
    event: InternalRealtimeEvent,
    input: { readonly permissionKeys: ReadonlySet<string>; readonly userId: string },
  ): readonly RealtimeTopic[] {
    if (event.audienceUserId !== undefined && event.audienceUserId !== input.userId) {
      return [];
    }
    if (event.type === "BILLING_CHANGED" && !hasAnyPermission(input.permissionKeys, TOPIC_PERMISSION_RULES.billing)) {
      return [];
    }

    return event.topics.filter((topic) => this.canReceiveTopic(topic, event, input));
  }

  private canReceiveTopic(
    topic: RealtimeTopic,
    event: InternalRealtimeEvent,
    input: { readonly permissionKeys: ReadonlySet<string>; readonly userId: string },
  ): boolean {
    if (topic === "auth") {
      return event.authTargetUserId === input.userId;
    }

    if (topic === "technician-earnings") {
      return hasAnyPermission(input.permissionKeys, ["technician.earnings.read_all"])
        || (event.actorUserId === input.userId && hasAnyPermission(input.permissionKeys, ["technician.earnings.read_own"]));
    }

    return hasAnyPermission(input.permissionKeys, TOPIC_PERMISSION_RULES[topic] ?? []);
  }
}

function hasAnyPermission(permissionKeys: ReadonlySet<string>, rules: readonly string[]): boolean {
  for (const rule of rules) {
    if (rule.endsWith(".")) {
      for (const permission of permissionKeys) {
        if (permission.startsWith(rule)) {
          return true;
        }
      }
    } else if (permissionKeys.has(rule)) {
      return true;
    }
  }

  return false;
}
