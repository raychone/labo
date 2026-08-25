import type { AuditLogSummary } from "@dental-lab/shared";

type Metadata = Record<string, unknown> | null;

const FIELD_LABELS: Record<string, string> = {
  basePriceMinor: "Preț de bază", clinicId: "Clinică", doctorId: "Medic", dueAt: "Termen",
  email: "Email", isActive: "Activ", legalEntityCode: "Firmă", manualDueAt: "Termen",
  notes: "Note", patientId: "Pacient", phone: "Telefon", priceMinor: "Preț", priority: "Prioritate",
  quantity: "Elemente", shade: "Culoare", status: "Status", workTypeId: "Tip lucrare",
  implantPlatform: "Platformă implant",
};

const ACTION_LABELS: Record<string, string> = {
  "auth.demo_login_success": "Autentificare reușită", "auth.login_succeeded": "Autentificare reușită",
  "auth.login_failed": "Autentificare eșuată", "auth.logout_succeeded": "Deconectare",
  "auth.password_changed": "Parolă schimbată", "auth.password_reset": "Parolă resetată",
  "organization_context.switched": "Firmă activă schimbată",
  "work_orders.created": "Lucrare creată", "work.created": "Lucrare creată", "work_orders.updated": "Lucrare modificată",
  "work.updated": "Lucrare modificată", "work_orders.claimed": "Lucrare preluată de tehnician", "work_orders.released": "Lucrare eliberată",
  "work_orders.status_changed": "Status lucrare modificat", "work_orders.assigned": "Lucrare atribuită",
  "work_orders.reassigned": "Lucrare reatribuită", "work_cycles.created": "Etapă de lucru creată", "work_cycles.closed": "Etapă de lucru închisă",
  "work_order.item_added": "Componentă tehnică adăugată", "work_order.item_modified": "Componentă tehnică modificată",
  "work_order.item_removed": "Componentă tehnică eliminată", "work_order.anatomical_scope_modified": "Domeniu anatomic modificat",
  "work_order.tooth_connection_added": "Dinți conectați", "work_order.tooth_connection_removed": "Conexiune dentară eliminată",
  "work_order.probe_type_selected": "Tip de probă selectat", "work_order.probe_type_corrected": "Tip de probă modificat", "work_order.probe_type_created": "Tip de probă creat", "work_order.probe_type_updated": "Tip de probă modificat", "work_order.probe_type_archived": "Tip de probă arhivat", "work_order.probe_type_restored": "Tip de probă restaurat", "work_order.active_probe_cycle_started": "Probă activă începută",
  "work_order.case_received": "Lucrare recepționată", "work_order.probe_ready": "Lucrare marcată Probă gata",
  "work_order.finalized": "Lucrare finalizată", "work_order.details_modified": "Lucrare modificată",
  "work_order.urgency_set": "Urgență setată", "work_order.urgency_changed": "Urgență modificată", "work_order.probe_deadline_changed": "Termen probă modificat",
  "technician.performed_maneuver_added": "Manoperă adăugată", "technician.maneuver_scope_recorded": "Domeniu manoperă înregistrat",
  "work_order.custom_work_type_used": "Tip personalizat folosit", "work_order.custom_work_type_saved": "Tip personalizat salvat",
  "work_order.custom_implant_platform_used": "Platformă personalizată folosită", "work_order.custom_implant_platform_saved": "Platformă personalizată salvată",
  "patient.created": "Pacient adăugat", "patient.updated": "Date pacient modificate", "patient.archived": "Pacient arhivat", "patient.restored": "Pacient reactivat",
  "clinics.created": "Clinică adăugată", "clinics.updated": "Clinică modificată", "doctors.created": "Medic adăugat", "doctors.updated": "Medic modificat",
  "pricing.catalog_item_created": "Preț adăugat în catalog", "pricing.catalog_item_updated": "Preț modificat",
  "pricing.catalog_item_archived": "Preț arhivat", "pricing.catalog_item_restored": "Preț reactivat",
  "pricing.agreement_created": "Acord comercial creat", "pricing.agreement_updated": "Acord comercial modificat",
  "pricing.agreement_archived": "Acord comercial arhivat", "pricing.agreement_restored": "Acord comercial reactivat",
  "billing.invoice_created": "Factură creată", "billing.invoice_issued": "Factură emisă", "billing.storno_created": "Factură stornată",
  "billing.payment_recorded": "Încasare înregistrată", "billing.payment_cancelled": "Încasare anulată", "billing.document_share_attempted": "Document trimis",
  "billing.document_share_download": "Document descărcat", "billing.document_share_email": "Document trimis prin email",
  "billing.clinic_statement_viewed": "Situație clinică consultată", "billing.month_registry_viewed": "Registru lunar consultat",
  "billing.month_closed": "Lună financiară închisă", "billing.csv_exported": "Export financiar realizat",
  "delivery.created": "Livrare creată", "delivery.courier_assigned": "Livrare atribuită curierului", "delivery.started_transit": "Livrare începută",
  "delivery.completed": "Livrare finalizată", "delivery.picked_up": "Livrare ridicată", "delivery.cancelled": "Livrare anulată",
  "logistics.note_updated": "Notă logistică modificată", "logistics.location_updated": "Locație logistică modificată",
  "logistics.work_blocked": "Lucrare blocată", "logistics.work_unblocked": "Lucrare deblocată", "logistics.attachment_uploaded": "Fișier atașat",
  "technician_operations.created": "Manoperă creată", "technician_operations.updated": "Manoperă modificată",
  "technician_rates.set": "Tarif tehnician stabilit", "technician_performed_operations.created": "Manoperă bifată ca finalizată",
  "settings.updated": "Setări firmă modificate", "user.created": "Utilizator creat", "user.updated": "Utilizator modificat",
  "user.disabled": "Utilizator dezactivat", "user.enabled": "Utilizator reactivat", "user.password_reset": "Parola utilizatorului resetată",
};

const ENTITY_LABELS: Record<string, string> = {
  auth: "Autentificare", billing_document: "Document financiar", billing_export: "Export financiar", billing_series: "Serie document",
  clinic: "Clinică", delivery: "Livrare", doctor: "Medic", legal_entity_context: "Firmă", legal_entity_settings: "Setări",
  patient: "Pacient", payment: "Încasare", price_catalog_item: "Tarif", pricing_agreement: "Acord comercial", route: "Traseu",
  courier_route: "Traseu", session: "Sesiune", settings: "Setări", technician_operation: "Manoperă", user: "Utilizator",
  work: "Lucrare", work_order: "Lucrare", work_attachment: "Fișier atașat", work_logistics: "Logistică lucrare",
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function entityIdentifier(metadata: Metadata): string | null {
  if (!metadata) return null;
  return text(metadata.code) ?? text(metadata.formattedNumber) ?? text(metadata.displayName) ?? text(metadata.name) ?? text(metadata.workCode);
}

function companyLabel(value: unknown): string {
  const code = text(value);
  if (code === "NC" || code === "CDT") return "CDT — Nicolaie Cristina";
  if (code === "NG") return "NG — Nicolaie Gabriel";
  return code ?? "Firmă necunoscută";
}

export function getAuditActionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const suffix = action.split(".").pop()?.replaceAll("_", " ") ?? "activitate";
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

export function getAuditEntityLabel(resourceType: string, metadata: Metadata = null): string {
  const label = ENTITY_LABELS[resourceType] ?? "Activitate";
  const identifier = entityIdentifier(metadata);
  return identifier && !/^demo_[a-z0-9_]+$/i.test(identifier) && !/^c[a-z0-9]{20,}$/i.test(identifier)
    ? `${label} · ${identifier}`
    : label;
}

function formatPostmeetingDetails(action: string, metadata: Metadata): string | null {
  if (!metadata) return null;
  const teeth = Array.isArray(metadata.toothNumbers)
    ? metadata.toothNumbers.filter((value): value is number => typeof value === "number").join(", ")
    : "";
  const probeTypeName = text(metadata.probeTypeName);
  const previousProbeTypeName = text(metadata.previousProbeTypeName);
  const nextProbeTypeName = text(metadata.nextProbeTypeName);
  const probeNumber = typeof metadata.probeNumber === "number" ? metadata.probeNumber : null;
  const maneuverName = text(metadata.maneuverName);

  if (action === "work_order.tooth_connection_added") return teeth ? `Au fost conectați dinții ${teeth}.` : "Au fost conectați dinții indicați.";
  if (action === "work_order.tooth_connection_removed") return teeth ? `Conexiunea dintre dinții ${teeth} a fost eliminată.` : "Conexiunea dintre dinții indicați a fost eliminată.";
  if (action === "work_order.probe_type_selected") return probeTypeName ? `A fost selectat tipul de probă ${probeTypeName}.` : "A fost selectat tipul de probă.";
  if (action === "work_order.probe_type_corrected") return previousProbeTypeName && nextProbeTypeName && probeNumber ? `Tip probă modificat · Proba ${probeNumber} · din ${previousProbeTypeName} în ${nextProbeTypeName}.` : "Tipul probei a fost modificat.";
  if (action === "technician.performed_maneuver_added") return maneuverName && teeth ? `Manopera ${maneuverName} a fost adăugată pentru dinții ${teeth}.` : "A fost adăugată o manoperă.";
  if (action === "work_order.case_received") return "Lucrarea a fost recepționată.";
  if (action === "work_order.probe_ready") return "Tehnicianul a marcat lucrarea ca Probă gata.";
  if (action === "work_order.finalized") return "Tehnicianul a finalizat lucrarea.";
  if (action === "work_order.urgency_set" || action === "work_order.urgency_changed") return `Urgență modificată din ${text(metadata.from) ?? "istoric"} în ${text(metadata.to) ?? "necunoscut"}.`;
  if (action === "work_order.probe_deadline_changed") return `Termen probă modificat din ${text(metadata.from) ?? "necunoscut"} în ${text(metadata.to) ?? "necunoscut"}.`;
  return null;
}

export function formatAuditDetails(action: string, metadata: Metadata): string {
  const postmeetingDetails = formatPostmeetingDetails(action, metadata);
  if (postmeetingDetails) return postmeetingDetails;
  if (!metadata) return "Activitate înregistrată.";
  const before = metadata.before && typeof metadata.before === "object" ? metadata.before as Record<string, unknown> : null;
  const after = metadata.after && typeof metadata.after === "object" ? metadata.after as Record<string, unknown> : null;
  if (action === "organization_context.switched") {
    return `Firmă schimbată din ${companyLabel(metadata.fromCode)} în ${companyLabel(metadata.toCode)}.`;
  }
  if (Array.isArray(metadata.changedFields)) {
    const fields = metadata.changedFields.map((field) => FIELD_LABELS[String(field)] ?? "Date generale").join(", ");
    return `Au fost modificate: ${fields}.${metadata.legalEntityCode ? ` Firmă: ${companyLabel(metadata.legalEntityCode)}.` : ""}`;
  }
  if (action.includes("status_changed") && before && after) return `Status schimbat din „${text(before.status) ?? "necunoscut"}” în „${text(after.status) ?? "necunoscut"}”.`;
  if (action === "pricing.catalog_item_updated" && before && after && before.standardPriceMinor !== after.standardPriceMinor) {
    return `Preț modificat de la ${formatMoney(before.standardPriceMinor)} la ${formatMoney(after.standardPriceMinor)}.`;
  }
  if (action.includes("payment_recorded")) return `Încasare de ${formatMoney(metadata.totalMinor ?? metadata.amountMinor)} înregistrată.`;
  if (action.includes("document_share")) return metadata.channel === "DOWNLOAD" ? "Documentul a fost descărcat cu succes." : "Documentul a fost trimis cu succes.";
  if (metadata.legalEntityCode) return `Firmă: ${companyLabel(metadata.legalEntityCode)}.`;
  return "Activitate înregistrată.";
}

function formatMoney(value: unknown): string {
  return typeof value === "number" ? `${(value / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} RON` : "valoare necunoscută";
}

export function formatAuditRow(row: AuditLogSummary): { action: string; details: string; entity: string; actor: string } {
  return {
    action: getAuditActionLabel(row.action),
    actor: row.actorDisplayName ?? "Sistem",
    details: formatAuditDetails(row.action, row.metadata),
    entity: getAuditEntityLabel(row.resourceType, row.metadata),
  };
}
