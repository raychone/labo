import { describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";

import { BillingService } from "./billing.service.js";

function createService() {
  return new BillingService({} as never, { record: vi.fn() } as never) as unknown as {
    assignDocumentNumber: (tx: unknown, document: Record<string, unknown>, actorUserId: string) => Promise<Record<string, unknown>>;
    createAndIssueInvoice: (context: Record<string, unknown>, legalEntity: Record<string, unknown>, dto: Record<string, unknown>) => Promise<Record<string, unknown>>;
    createInvoice: ReturnType<typeof vi.fn>;
    issueDocument: ReturnType<typeof vi.fn>;
  };
}

function createTx(prefix: "CD" | "NG") {
  const billingSeriesUpsert = vi.fn(() => Promise.resolve({ currentNumber: 0, id: `series_${prefix.toLowerCase()}`, prefix, year: 2026 }));
  const billingSeriesUpdate = vi.fn(() => Promise.resolve({ currentNumber: 1 }));
  const billingDocumentUpdate = vi.fn(({ data }: { readonly data: Record<string, unknown> }) => Promise.resolve(data));
  return {
    billingDocumentUpdate,
    billingSeriesUpdate,
    billingSeriesUpsert,
    tx: {
      billingDocument: { update: billingDocumentUpdate },
      billingSeries: { findFirst: vi.fn(), update: billingSeriesUpdate, upsert: billingSeriesUpsert },
    },
  };
}

function createBillableWork(overrides: Record<string, unknown>) {
  return {
    activeCycle: {
      billingLines: [],
      cycleNumber: 1,
      executionLegalEntityCodeSnapshot: "NC",
      executionLegalEntityId: "legal_nc",
      executionSnapshot: {
        pricingQuantity: 1,
        pricingTotalMinor: 10000,
        pricingUnitPriceMinor: 10000,
      },
      id: "cycle_1",
    },
    code: "WO-26-0001",
    createdAt: new Date("2026-08-20T00:00:00.000Z"),
    doctor: null,
    id: "work_1",
    patientName: "Ion Popescu",
    patientReference: null,
    quantity: 1,
    workType: { name: "Zirconia FULL anatomic" },
    ...overrides,
  };
}

describe("BillingService invoice series", () => {
  it("pushes billing payment filters into the database where clause", () => {
    const service = new BillingService({} as never, { record: vi.fn() } as never) as unknown as {
      createDocumentsListWhere: (legalEntity: Record<string, unknown>, query: Record<string, unknown>) => Record<string, unknown>;
    };

    const where = service.createDocumentsListWhere({ id: "legal_nc" }, {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      page: 1,
      pageSize: 20,
      paymentFilter: "OVERDUE",
      sortBy: "issueDate",
      sortDirection: "desc",
    });

    expect(where).toMatchObject({
      AND: [expect.objectContaining({ dueDate: expect.objectContaining({ lt: expect.any(Date) }), type: "INVOICE" })],
      legalEntityId: "legal_nc",
    });
  });

  it("creates an internal invoice draft and issues it for the normal billing path", async () => {
    const service = createService();
    service.createInvoice = vi.fn(() => Promise.resolve({ id: "doc_draft" }));
    service.issueDocument = vi.fn(() => Promise.resolve({ id: "doc_issued", status: "ISSUED" }));
    const context = { actorUserId: "user_1" };
    const legalEntity = { id: "legal_nc" };
    const dto = { issueDate: "2026-08-20", workOrderIds: ["work_1"] };

    await expect(service.createAndIssueInvoice(context, legalEntity, dto)).resolves.toMatchObject({ id: "doc_issued", status: "ISSUED" });
    expect(service.createInvoice).toHaveBeenCalledWith(context, legalEntity, dto);
    expect(service.issueDocument).toHaveBeenCalledWith(legalEntity, context, "doc_draft");
  });

  it("creates CDT invoice numbers with CD annual backend series", async () => {
    const service = createService();
    const { billingDocumentUpdate, billingSeriesUpsert, tx } = createTx("CD");

    await service.assignDocumentNumber(tx, { id: "doc_1", issueDate: new Date("2026-08-20T00:00:00.000Z"), legalEntityCodeSnapshot: "NC", legalEntityId: "legal_nc", type: "INVOICE" }, "user_1");

    expect(billingSeriesUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ documentType: "INVOICE", legalEntityId: "legal_nc", prefix: "CD", year: 2026 }),
      where: { legalEntityId_documentType_prefix_year: { documentType: "INVOICE", legalEntityId: "legal_nc", prefix: "CD", year: 2026 } },
    }));
    expect(billingDocumentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ formattedNumber: "CD 260001", number: 1, series: "CD" }) }));
  });

  it("creates NG invoice numbers with NG annual backend series", async () => {
    const service = createService();
    const { billingDocumentUpdate, billingSeriesUpsert, tx } = createTx("NG");

    await service.assignDocumentNumber(tx, { id: "doc_2", issueDate: new Date("2026-08-20T00:00:00.000Z"), legalEntityCodeSnapshot: "NG", legalEntityId: "legal_ng", type: "INVOICE" }, "user_1");

    expect(billingSeriesUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ documentType: "INVOICE", legalEntityId: "legal_ng", prefix: "NG", year: 2026 }),
      where: { legalEntityId_documentType_prefix_year: { documentType: "INVOICE", legalEntityId: "legal_ng", prefix: "NG", year: 2026 } },
    }));
    expect(billingDocumentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ formattedNumber: "NG 260001", number: 1, series: "NG" }) }));
  });

  it("applies percentage and fixed adjustments without mutating base pricing", () => {
    const service = createService() as unknown as BillingService;
    const works = [
      createBillableWork({ id: "work_1", code: "WO-26-0001", patientName: "Ion Popescu" }),
      createBillableWork({
        activeCycle: {
          billingLines: [],
          cycleNumber: 1,
          executionLegalEntityCodeSnapshot: "NC",
          executionLegalEntityId: "legal_nc",
          executionSnapshot: {
            pricingQuantity: 1,
            pricingTotalMinor: 20000,
            pricingUnitPriceMinor: 20000,
          },
          id: "cycle_2",
        },
        code: "WO-26-0002",
        id: "work_2",
        patientName: "Maria Ionescu",
      }),
    ] as never;

    const pricing = (service as never as { createDraftPricing: (items: readonly unknown[], adjustments: readonly unknown[]) => { subtotalMinor: number; totalMinor: number; discountMinor: number; lines: Array<{ workOrderId: string; lineTotalMinor: number }> }; }).createDraftPricing(works, [
      { mode: "PERCENTAGE", percentage: 10, scope: "DOCUMENT" },
      { amountMinor: 3000, mode: "FIXED", scope: "WORK", workOrderId: "work_2" },
    ]);

    expect(pricing.subtotalMinor).toBe(30000);
    expect(pricing.discountMinor).toBe(5700);
    expect(pricing.totalMinor).toBe(24300);
    expect(pricing.lines).toEqual([
      expect.objectContaining({ lineTotalMinor: 9000, workOrderId: "work_1" }),
      expect.objectContaining({ lineTotalMinor: 15300, workOrderId: "work_2" }),
    ]);
    expect((works[0] as { activeCycle: { executionSnapshot: { pricingTotalMinor: number } } }).activeCycle.executionSnapshot.pricingTotalMinor).toBe(10000);
    expect((works[1] as { activeCycle: { executionSnapshot: { pricingTotalMinor: number } } }).activeCycle.executionSnapshot.pricingTotalMinor).toBe(20000);
  });

  it("rejects patient adjustments that do not match selected works", () => {
    const service = createService() as unknown as BillingService;
    const works = [createBillableWork({})] as never;

    expect(() =>
      (service as never as { createDraftPricing: (items: readonly unknown[], adjustments: readonly unknown[]) => unknown }).createDraftPricing(works, [
        { amountMinor: 1000, mode: "FIXED", patientName: "Alt pacient", scope: "PATIENT" },
      ])
    ).toThrow(BadRequestException);
  });

  it("applies work discounts before urgency and invoice discounts after urgency", () => {
    const service = createService() as unknown as BillingService;
    const work = createBillableWork({ urgency: "URGENCY_1" }) as never;
    const pricing = (service as never as { createDraftPricing: (items: readonly unknown[], adjustments: readonly unknown[]) => { readonly totalMinor: number } }).createDraftPricing([work], [
      { amountMinor: 1000, mode: "FIXED", scope: "WORK", workOrderId: "work_1" },
      { percentage: 10, mode: "PERCENTAGE", scope: "DOCUMENT" },
    ]);

    expect(pricing.totalMinor).toBe(10935);
  });
});
