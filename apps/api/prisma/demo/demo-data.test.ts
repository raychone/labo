import { describe, expect, it } from "vitest";

import { assertDemoDatasetConsistency, buildDemoDataset } from "./demo-data.js";

describe("demo dataset", () => {
  it("builds a stable realistic dataset for the selected month", () => {
    const dataset = buildDemoDataset(new Date("2026-07-24T10:00:00.000Z"));

    expect(dataset.users).toHaveLength(7);
    expect(dataset.clinics).toHaveLength(4);
    expect(dataset.doctors).toHaveLength(9);
    expect(dataset.workTypes).toHaveLength(12);
    expect(dataset.works).toHaveLength(48);
    expect(dataset.billingDocuments.filter((document) => document.type === "PROFORMA")).toHaveLength(4);
    expect(dataset.billingDocuments.filter((document) => document.type === "INVOICE")).toHaveLength(8);
    expect(dataset.payments.length).toBeGreaterThanOrEqual(6);
    expect(dataset.works.some((work) => work.patientName === "Maria Dumitrescu")).toBe(true);
    expect(dataset.clinics.some((clinic) => clinic.name === "Clinica Dentară Aurora")).toBe(true);
    expect(dataset.billingDocuments.some((document) => document.formattedNumber === "FACT-2026-000001")).toBe(true);
    expect(dataset.billingDocuments.some((document) => document.formattedNumber === "PF-2026-000001")).toBe(true);
    expect(dataset.payments.some((payment) => payment.receiptNumber === "CH-2026-001")).toBe(true);
    expect(dataset.payments.some((payment) => payment.reference === "OP-DEMO-001")).toBe(true);
  });

  it("keeps the partial payment scenario at 1000 RON with 400 RON collected", () => {
    const dataset = buildDemoDataset(new Date("2026-07-24T10:00:00.000Z"));
    const partialDocument = dataset.billingDocuments.find((document) => document.id === "demo_invoice_partial_1000");
    const totalMinor = partialDocument?.workIds.reduce((sum, workId) => {
      const work = dataset.works.find((item) => item.id === workId);
      return sum + (work?.totalPriceMinor ?? 0);
    }, 0);
    const paidMinor = dataset.payments
      .filter((payment) => payment.billingDocumentId === "demo_invoice_partial_1000")
      .reduce((sum, payment) => sum + payment.amountMinor, 0);

    expect(totalMinor).toBe(100000);
    expect(paidMinor).toBe(40000);
    expect((totalMinor ?? 0) - paidMinor).toBe(60000);
  });

  it("passes referential and financial consistency checks", () => {
    expect(() => assertDemoDatasetConsistency(buildDemoDataset(new Date("2026-07-24T10:00:00.000Z")))).not.toThrow();
  });
});
