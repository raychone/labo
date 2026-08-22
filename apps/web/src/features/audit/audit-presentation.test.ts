import { describe, expect, it } from "vitest";

import { formatAuditDetails, formatAuditRow, getAuditActionLabel, getAuditEntityLabel } from "./audit-presentation.js";

describe("audit presentation", () => {
  it("translates business actions and entities", () => {
    expect(getAuditActionLabel("auth.demo_login_success")).toBe("Autentificare reușită");
    expect(getAuditActionLabel("pricing.catalog_item_updated")).toBe("Preț modificat");
    expect(getAuditEntityLabel("billing_document", { formattedNumber: "CD-2026-000123" })).toBe("Document financiar · CD-2026-000123");
  });

  it("formats metadata without exposing JSON or technical field names", () => {
    const details = formatAuditDetails("pricing.catalog_item_updated", {
      changedFields: ["priceMinor", "notes"],
      legalEntityCode: "NC",
    });
    expect(details).toContain("Preț, Note");
    expect(details).toContain("CDT — Nicolaie Cristina");
    expect(details).not.toContain("priceMinor");
    expect(details).not.toContain("{");
  });

  it("handles context switches, downloads and unknown actions safely", () => {
    expect(formatAuditDetails("organization_context.switched", { fromCode: "CDT", toCode: "NG" })).toContain("CDT — Nicolaie Cristina");
    expect(formatAuditDetails("billing.document_share_attempted", { channel: "DOWNLOAD" })).toBe("Documentul a fost descărcat cu succes.");
    expect(getAuditActionLabel("new.future_action")).toBe("Future action");
    expect(formatAuditRow({ action: "new.future_action", actorDisplayName: null, actorUserId: "secret-id", createdAt: "2026-01-01T00:00:00.000Z", id: "audit-1", metadata: null, resourceId: "demo_invoice_paid_3", resourceType: "billing_document" })).toMatchObject({ actor: "Sistem", entity: "Document financiar", details: "Activitate înregistrată." });
  });
});
