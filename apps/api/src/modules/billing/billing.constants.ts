export const BILLING_AUDIT_ACTIONS = {
  attachmentPrintViewed: "billing.attachment_print_viewed",
  ambiguousLegacyReviewViewed: "billing.ambiguous_legacy_review_viewed",
  companyMismatchRejected: "billing.company_mismatch_rejected",
  csvExported: "billing.csv_exported",
  documentCancelled: "billing.document_cancelled",
  documentPrintViewed: "billing.document_print_viewed",
  clinicStatementViewed: "billing.clinic_statement_viewed",
  doctorStatementViewed: "billing.doctor_statement_viewed",
  invoiceCreated: "billing.invoice_created",
  invoiceIssued: "billing.invoice_issued",
  monthRegistryViewed: "billing.month_registry_viewed",
  paymentCancelled: "billing.payment_cancelled",
  paymentRecorded: "billing.payment_recorded",
  printViewed: "billing.print_viewed",
  proformaConverted: "billing.proforma_converted",
  proformaCreated: "billing.proforma_created",
  proformaIssued: "billing.proforma_issued",
  seriesCreated: "billing.series_created",
  seriesUpdated: "billing.series_updated",
} as const;

export const BILLING_RESOURCE_TYPES = {
  billingDocument: "billing_document",
  billingExport: "billing_export",
  billingSeries: "billing_series",
  payment: "payment",
} as const;

export const BILLING_DOCUMENT_SORT_FIELDS = ["createdAt", "issueDate", "formattedNumber", "totalMinor", "status"] as const;
export const BILLING_GROUP_BY = ["day", "week", "month", "clinic", "doctor", "patient", "workType", "billingStatus", "paymentStatus"] as const;
export const BILLING_SORT_DIRECTIONS = ["asc", "desc"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
