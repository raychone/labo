import { describe, expect, it } from "vitest";

import { calculateBillingAmounts, toBillableWorkView, type BillableWorkRecord } from "./billing.view.js";

describe("billing view helpers", () => {
  it("derives unpaid, partial and paid balances from active payments only", () => {
    expect(calculateBillingAmounts({ payments: [], totalMinor: 1000 })).toEqual({
      balanceMinor: 1000,
      paidMinor: 0,
      paymentStatus: "UNPAID",
    });

    expect(calculateBillingAmounts({
      payments: [
        { amountMinor: 400, cancelledAt: null },
        { amountMinor: 200, cancelledAt: new Date("2026-07-01T00:00:00.000Z") },
      ],
      totalMinor: 1000,
    })).toEqual({
      balanceMinor: 600,
      paidMinor: 400,
      paymentStatus: "PARTIALLY_PAID",
    });

    expect(calculateBillingAmounts({
      payments: [{ amountMinor: 1000, cancelledAt: null }],
      totalMinor: 1000,
    })).toEqual({
      balanceMinor: 0,
      paidMinor: 1000,
      paymentStatus: "PAID",
    });
  });
});

describe("billable work view", () => {
  it("derives company, cycle and price from the active cycle execution snapshot", () => {
    const work = createBillableWorkRecord();

    expect(toBillableWorkView(work, true)).toMatchObject({
      baseUnitPriceMinor: 45000,
      currency: "RON",
      invoicedDocumentId: null,
      isBillable: true,
      legalEntityCode: "NC",
      legalEntityName: "Nicolaie Cristina",
      totalPriceMinor: 90000,
      unavailableReason: null,
      workCycleId: "cycle_1",
      workCycleNumber: 1,
    });
  });

  it("masks money while preserving operational company and cycle state", () => {
    const view = toBillableWorkView(createBillableWorkRecord(), false);

    expect(view.baseUnitPriceMinor).toBeNull();
    expect(view.totalPriceMinor).toBeNull();
    expect(view.currency).toBeNull();
    expect(view.legalEntityCode).toBe("NC");
    expect(view.workCycleNumber).toBe(1);
  });

  it("marks active invoice lines as unavailable by cycle", () => {
    const work = createBillableWorkRecord({
      activeCycle: {
        billingLines: [
          {
            billingDocument: {
              id: "doc_1",
              status: "ISSUED",
              type: "INVOICE",
            } as NonNullable<BillableWorkRecord["activeCycle"]>["billingLines"][number]["billingDocument"],
            billingDocumentId: "doc_1",
          } as NonNullable<BillableWorkRecord["activeCycle"]>["billingLines"][number],
        ],
      },
    });

    expect(toBillableWorkView(work, true)).toMatchObject({
      invoicedDocumentId: "doc_1",
      isBillable: false,
      unavailableReason: "Ciclul activ este deja asociat unei facturi active.",
    });
  });
});

function createBillableWorkRecord(overrides: { readonly activeCycle?: Partial<NonNullable<BillableWorkRecord["activeCycle"]>> } = {}): BillableWorkRecord {
  const now = new Date("2026-08-04T09:00:00.000Z");
  const activeCycle = {
    billingLines: [],
    cycleNumber: 1,
    executionLegalEntityCodeSnapshot: "NC",
    executionLegalEntityId: "legal_nc",
    executionLegalEntityNameSnapshot: "Nicolaie Cristina",
    executionSnapshot: {
      pricingCurrency: "RON",
      pricingQuantity: "2",
      pricingTotalMinor: 90000,
      pricingUnitPriceMinor: 45000,
      status: "LOCKED",
    },
    id: "cycle_1",
    ...overrides.activeCycle,
  };

  return {
    activeCycle,
    baseUnitPriceMinor: 1,
    clinic: { name: "Clinica Test" },
    clinicId: "clinic_1",
    code: "WO-1",
    createdAt: now,
    currency: "RON",
    doctor: { displayName: "Dr. Test" },
    doctorId: "doctor_1",
    id: "work_1",
    invoicedDocumentId: null,
    patientName: "Pacient Test",
    patientReference: "11",
    quantity: 2,
    requestedDeliveryDate: now,
    status: "REGISTERED",
    totalPriceMinor: 1,
    workType: { name: "Coroana" },
  } as BillableWorkRecord;
}
