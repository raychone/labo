/** B02 / RBAC-AUDIT-001 shared audit vocabulary and presentation contract. */

export const POSTMEETING_AUDIT_ACTIONS = {
  workOrderItemAdded: "work_order.item_added",
  workOrderItemModified: "work_order.item_modified",
  workOrderItemRemoved: "work_order.item_removed",
  anatomicalScopeModified: "work_order.anatomical_scope_modified",
  toothConnectionAdded: "work_order.tooth_connection_added",
  toothConnectionRemoved: "work_order.tooth_connection_removed",
  probeTypeSelected: "work_order.probe_type_selected",
  probeTypeCorrected: "work_order.probe_type_corrected",
  probeTypeCreated: "work_order.probe_type_created",
  probeTypeUpdated: "work_order.probe_type_updated",
  probeTypeArchived: "work_order.probe_type_archived",
  probeTypeRestored: "work_order.probe_type_restored",
  activeProbeCycleStarted: "work_order.active_probe_cycle_started",
  caseReceived: "work_order.case_received",
  probeReady: "work_order.probe_ready",
  workOrderFinalized: "work_order.finalized",
  performedManeuverAdded: "technician.performed_maneuver_added",
  maneuverScopeRecorded: "technician.maneuver_scope_recorded",
  customWorkTypeUsed: "work_order.custom_work_type_used",
  customWorkTypeSaved: "work_order.custom_work_type_saved",
  customImplantPlatformUsed: "work_order.custom_implant_platform_used",
  customImplantPlatformSaved: "work_order.custom_implant_platform_saved",
  workOrderDetailsModified: "work_order.details_modified",
  urgencySet: "work_order.urgency_set",
  urgencyChanged: "work_order.urgency_changed",
  probeDeadlineChanged: "work_order.probe_deadline_changed",
} as const;

export type PostmeetingAuditAction = (typeof POSTMEETING_AUDIT_ACTIONS)[keyof typeof POSTMEETING_AUDIT_ACTIONS];

export interface PostmeetingAuditPresentationData {
  readonly componentDescription?: string;
  readonly toothNumbers?: readonly number[];
  readonly probeTypeName?: string;
  readonly previousProbeTypeName?: string;
  readonly nextProbeTypeName?: string;
  readonly probeNumber?: number;
  readonly workOrderLabel?: string;
  readonly workTypeName?: string;
}

export const POSTMEETING_AUDIT_ACTION_LABELS_RO: Readonly<Record<PostmeetingAuditAction, string>> = {
  [POSTMEETING_AUDIT_ACTIONS.workOrderItemAdded]: "Componenta tehnică a fost adăugată.",
  [POSTMEETING_AUDIT_ACTIONS.workOrderItemModified]: "Componenta tehnică a fost modificată.",
  [POSTMEETING_AUDIT_ACTIONS.workOrderItemRemoved]: "Componenta tehnică a fost eliminată.",
  [POSTMEETING_AUDIT_ACTIONS.anatomicalScopeModified]: "Domeniul anatomic a fost modificat.",
  [POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded]: "Au fost conectați dinții indicați.",
  [POSTMEETING_AUDIT_ACTIONS.toothConnectionRemoved]: "Conexiunea dintre dinții indicați a fost eliminată.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeSelected]: "A fost selectat tipul de probă indicat.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeCorrected]: "Tipul probei a fost modificat.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeCreated]: "Tipul probei a fost creat.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeUpdated]: "Tipul probei a fost modificat.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeArchived]: "Tipul probei a fost arhivat.",
  [POSTMEETING_AUDIT_ACTIONS.probeTypeRestored]: "Tipul probei a fost restaurat.",
  [POSTMEETING_AUDIT_ACTIONS.activeProbeCycleStarted]: "A fost începută o probă activă.",
  [POSTMEETING_AUDIT_ACTIONS.caseReceived]: "Lucrarea a fost recepționată.",
  [POSTMEETING_AUDIT_ACTIONS.probeReady]: "Tehnicianul a marcat lucrarea ca Probă gata.",
  [POSTMEETING_AUDIT_ACTIONS.workOrderFinalized]: "Tehnicianul a finalizat lucrarea.",
  [POSTMEETING_AUDIT_ACTIONS.performedManeuverAdded]: "A fost adăugată o manoperă.",
  [POSTMEETING_AUDIT_ACTIONS.maneuverScopeRecorded]: "Domeniul manoperei a fost înregistrat.",
  [POSTMEETING_AUDIT_ACTIONS.customWorkTypeUsed]: "A fost folosit un tip de lucrare personalizat pentru această lucrare.",
  [POSTMEETING_AUDIT_ACTIONS.customWorkTypeSaved]: "Tipul de lucrare personalizat a fost salvat în catalog.",
  [POSTMEETING_AUDIT_ACTIONS.customImplantPlatformUsed]: "A fost folosită o platformă de implant personalizată pentru această lucrare.",
  [POSTMEETING_AUDIT_ACTIONS.customImplantPlatformSaved]: "Platforma de implant personalizată a fost salvată.",
  [POSTMEETING_AUDIT_ACTIONS.workOrderDetailsModified]: "Lucrarea a fost modificată.",
  [POSTMEETING_AUDIT_ACTIONS.urgencySet]: "Urgența a fost setată.",
  [POSTMEETING_AUDIT_ACTIONS.urgencyChanged]: "Urgența a fost modificată.",
  [POSTMEETING_AUDIT_ACTIONS.probeDeadlineChanged]: "Termenul probei a fost modificat.",
};

export const POSTMEETING_UNRESOLVED_AUTHORIZATION_GATES = {
  missingLegalContext: "DECISION_A",
  workUpdatedRecipients: "DECISION_D",
  saveToCatalogRole: "DECISION_E",
  performedManeuverCorrection: "DECISION_F",
} as const;

export const POSTMEETING_RESOLVED_DECISIONS = {
  urgencyPolicy: "WORK_ORDER_LEVEL_0_25_50_75_100_PERCENT",
  urgencyIndependentFromLegacyPriority: true,
  probeTypeCatalog: "GLOBAL_LABORATORY_SHARED_CDT_NG",
  probeTypeCatalogManagerOnly: true,
  probeTypeSelectionCorrectionRoles: ["MANAGER", "RECEPTIE", "TEHNICIAN"],
  probeTypeHistoricalSnapshot: true,
} as const;

function toothList(toothNumbers: readonly number[] | undefined): string | null {
  if (!toothNumbers?.length) return null;
  return toothNumbers.join(", ");
}

export function formatPostmeetingAuditMessage(
  action: PostmeetingAuditAction,
  data: PostmeetingAuditPresentationData = {},
): string {
  const teeth = toothList(data.toothNumbers);

  switch (action) {
    case POSTMEETING_AUDIT_ACTIONS.toothConnectionAdded:
      return teeth ? `Au fost conectați dinții ${teeth}.` : POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
    case POSTMEETING_AUDIT_ACTIONS.toothConnectionRemoved:
      return teeth ? `Conexiunea dintre dinții ${teeth} a fost eliminată.` : POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
    case POSTMEETING_AUDIT_ACTIONS.probeTypeSelected:
      return data.probeTypeName ? `A fost selectat tipul de probă ${data.probeTypeName}.` : POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
    case POSTMEETING_AUDIT_ACTIONS.probeTypeCorrected:
      return data.previousProbeTypeName && data.nextProbeTypeName && data.probeNumber
        ? `Tipul probei a fost modificat pentru Proba ${data.probeNumber}: din ${data.previousProbeTypeName} în ${data.nextProbeTypeName}.`
        : POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
    case POSTMEETING_AUDIT_ACTIONS.performedManeuverAdded:
      return data.componentDescription && teeth
        ? `Manopera ${data.componentDescription} a fost adăugată pentru dinții ${teeth}.`
        : POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
    default:
      return POSTMEETING_AUDIT_ACTION_LABELS_RO[action];
  }
}
