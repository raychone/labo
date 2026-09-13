import { describe, expect, it, vi } from "vitest";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { BillingService } from "./billing.service.js";

function createService() {
  return new BillingService({} as never, { record: vi.fn() } as never) as unknown as {
    assignDocumentNumber: (tx: unknown, document: Record<string, unknown>, actorUserId: string, issueGuard?: { readonly expectedStatus: "DRAFT"; readonly expectedVersion: number }) => Promise<Record<string, unknown>>;
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
        status: "LOCKED",
      },
      id: "cycle_1",
    },
    code: "WO-26-0001",
    courierRouteStops: [],
    createdAt: new Date("2026-08-20T00:00:00.000Z"),
    deliveryPreparationItems: [],
    doctor: null,
    id: "work_1",
    patientName: "Ion Popescu",
    patientReference: null,
    quantity: 1,
    technicalReadiness: "FINAL_READY",
    workType: { name: "Zirconia FULL anatomic" },
    ...overrides,
  };
}

function createPaymentDocument(id: string, overrides: Record<string, unknown> = {}) {
  return {
    cancelledAt: null,
    clinicAddressSnapshot: null,
    clinicEmailSnapshot: null,
    clinicId: "clinic_1",
    clinicLegalNameSnapshot: null,
    clinicNameSnapshot: "Clinica Test",
    clinicPhoneSnapshot: null,
    clinicRegistrationNumberSnapshot: null,
    clinicTaxIdSnapshot: null,
    createdAt: new Date("2026-09-01T08:00:00.000Z"),
    currency: "RON",
    discountMinor: 0,
    dueDate: new Date("2026-09-30T00:00:00.000Z"),
    formattedNumber: id.toUpperCase(),
    id,
    issueDate: new Date("2026-09-01T00:00:00.000Z"),
    issuedAt: new Date("2026-09-01T08:00:00.000Z"),
    legalEntityCodeSnapshot: "CDT",
    legalEntityId: "legal_cdt",
    legalEntityNameSnapshot: "CDT",
    lines: [],
    notes: null,
    paymentNoteIssuedAt: new Date("2026-09-01T08:00:00.000Z"),
    paymentNoteSnapshot: { totalMinor: 10000 },
    payments: [],
    status: "ISSUED",
    stornoDocument: null,
    stornoOfDocument: null,
    stornoOfDocumentId: null,
    subtotalMinor: 10000,
    taxMinor: 0,
    totalMinor: 10000,
    type: "INVOICE",
    ...overrides,
  };
}

function createBatchPaymentService(documents: readonly ReturnType<typeof createPaymentDocument>[]) {
  const paymentCreate = vi.fn((_input: { readonly data: { readonly amountMinor: number } }) => Promise.resolve({ id: "payment" }));
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    billingDocument: {
      findMany: vi.fn(() => Promise.resolve(documents)),
    },
    payment: { create: paymentCreate },
  }));
  const service = new BillingService({ $transaction: transaction } as never, { record: vi.fn() } as never) as unknown as {
    recordBatchPayment: BillingService["recordBatchPayment"];
    recordDocumentAudit: ReturnType<typeof vi.fn>;
    updateDocumentPaymentStatus: ReturnType<typeof vi.fn>;
  };
  service.updateDocumentPaymentStatus = vi.fn((_tx, documentId: string) => Promise.resolve(documents.find((document) => document.id === documentId)));
  service.recordDocumentAudit = vi.fn(() => Promise.resolve());
  return { paymentCreate, service, transaction };
}

describe("BillingService invoice series", () => {
  it("requires a persisted successful delivery before billing", () => {
    const service = new BillingService({} as never, { record: vi.fn() } as never) as unknown as {
      isWorkCycleBillable: (work: unknown) => boolean;
    };

    expect(service.isWorkCycleBillable(createBillableWork({ courierRouteStops: [] }))).toBe(false);
    expect(service.isWorkCycleBillable(createBillableWork({ courierRouteStops: undefined }))).toBe(false);
    expect(service.isWorkCycleBillable(createBillableWork({ courierRouteStops: [{ outcomeStatus: "DELIVERED", type: "DELIVERY" }] }))).toBe(true);
    expect(service.isWorkCycleBillable(createBillableWork({
      deliveryPreparationItems: [{
        group: { deliveries: [{ status: "DELIVERED" }] },
        workCycleId: "cycle_1",
      }],
    }))).toBe(true);
  });

  it("does not reuse modern delivery evidence from another work cycle", () => {
    const service = new BillingService({} as never, { record: vi.fn() } as never) as unknown as {
      isWorkCycleBillable: (work: unknown) => boolean;
    };

    expect(service.isWorkCycleBillable(createBillableWork({
      deliveryPreparationItems: [{
        group: { deliveries: [{ status: "DELIVERED" }] },
        workCycleId: "cycle_previous",
      }],
    }))).toBe(false);
    expect(service.isWorkCycleBillable(createBillableWork({
      deliveryPreparationItems: [{
        group: { deliveries: [] },
        workCycleId: "cycle_1",
      }],
    }))).toBe(false);
  });

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

  it("keeps the draft status and version predicates on an issuance write", async () => {
    const service = createService();
    const { billingDocumentUpdate, tx } = createTx("CD");

    await service.assignDocumentNumber(tx, {
      id: "doc_guarded",
      issueDate: new Date("2026-08-20T00:00:00.000Z"),
      legalEntityCodeSnapshot: "NC",
      legalEntityId: "legal_nc",
      lines: [],
      totalMinor: 10000,
      type: "INVOICE",
      version: 4,
    }, "user_1", { expectedStatus: "DRAFT", expectedVersion: 4 });

    expect(billingDocumentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "doc_guarded", status: "DRAFT", version: 4 },
    }));
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

  it("returns a retryable conflict after repeated concurrent payment serialization failures", async () => {
    const serializationError = new Prisma.PrismaClientKnownRequestError("concurrent write", {
      clientVersion: "test",
      code: "P2034",
    });
    const transaction = vi.fn().mockRejectedValue(serializationError);
    const service = new BillingService({ $transaction: transaction } as never, { record: vi.fn() } as never);

    await expect(service.recordPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      "document_1",
      { amountMinor: 1000, method: "CARD", paymentDate: "2026-09-07" },
    )).rejects.toBeInstanceOf(ConflictException);

    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("records one settlement across five emitted invoices atomically", async () => {
    const documents = Array.from({ length: 5 }, (_, index) => createPaymentDocument(`invoice_${index + 1}`));
    const { paymentCreate, service, transaction } = createBatchPaymentService(documents);

    const result = await service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 50000, documentIds: documents.map((document) => document.id), method: "BANK_TRANSFER", paymentDate: "2026-09-10", reference: "TRANSFER-1" },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(paymentCreate).toHaveBeenCalledTimes(5);
    expect(paymentCreate.mock.calls.map(([call]) => call.data.amountMinor)).toEqual([10000, 10000, 10000, 10000, 10000]);
    expect(result.documents).toHaveLength(5);
  });

  it("allocates a partial settlement deterministically across selected invoices", async () => {
    const documents = [createPaymentDocument("invoice_1"), createPaymentDocument("invoice_2"), createPaymentDocument("invoice_3")];
    const { paymentCreate, service } = createBatchPaymentService(documents);

    await service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 25000, documentIds: documents.map((document) => document.id), method: "BANK_TRANSFER", paymentDate: "2026-09-10" },
    );

    expect(paymentCreate.mock.calls.map(([call]) => call.data.amountMinor)).toEqual([10000, 10000, 5000]);
  });

  it("rejects duplicate, draft, cross-company and cross-currency batch selections", async () => {
    const emitted = createPaymentDocument("invoice_1");
    const draft = createPaymentDocument("invoice_2", { status: "DRAFT" });
    const otherCurrency = createPaymentDocument("invoice_2", { currency: "EUR" });

    const duplicateService = createBatchPaymentService([emitted]).service;
    await expect(duplicateService.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 10000, documentIds: [emitted.id, emitted.id], method: "CARD", paymentDate: "2026-09-10" },
    )).rejects.toBeInstanceOf(BadRequestException);

    const draftBatch = createBatchPaymentService([emitted, draft]);
    await expect(draftBatch.service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 20000, documentIds: [emitted.id, draft.id], method: "CARD", paymentDate: "2026-09-10" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(draftBatch.paymentCreate).not.toHaveBeenCalled();

    const crossCompanyBatch = createBatchPaymentService([emitted]);
    await expect(crossCompanyBatch.service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 20000, documentIds: [emitted.id, "invoice_other_company"], method: "CARD", paymentDate: "2026-09-10" },
    )).rejects.toThrow("firma activă");
    expect(crossCompanyBatch.paymentCreate).not.toHaveBeenCalled();

    const crossCurrencyBatch = createBatchPaymentService([emitted, otherCurrency]);
    await expect(crossCurrencyBatch.service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 20000, documentIds: [emitted.id, otherCurrency.id], method: "CARD", paymentDate: "2026-09-10" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(crossCurrencyBatch.paymentCreate).not.toHaveBeenCalled();
  });

  it("rejects a repeated settlement and mixed-clinic selections before creating allocations", async () => {
    const alreadyPaid = createPaymentDocument("invoice_paid", { status: "PAID" });
    const repeatedBatch = createBatchPaymentService([alreadyPaid]);
    await expect(repeatedBatch.service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 10000, documentIds: [alreadyPaid.id], method: "BANK_TRANSFER", paymentDate: "2026-09-10", reference: "TRANSFER-1" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(repeatedBatch.paymentCreate).not.toHaveBeenCalled();

    const first = createPaymentDocument("invoice_1");
    const second = createPaymentDocument("invoice_2", { clinicId: "clinic_2", clinicNameSnapshot: "Altă clinică" });
    const mixedClinicBatch = createBatchPaymentService([first, second]);
    await expect(mixedClinicBatch.service.recordBatchPayment(
      { code: "CDT", displayName: "CDT", id: "legal_cdt" },
      { actorUserId: "manager_1", requestMetadata: {} },
      { amountMinor: 20000, documentIds: [first.id, second.id], method: "BANK_TRANSFER", paymentDate: "2026-09-10" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(mixedClinicBatch.paymentCreate).not.toHaveBeenCalled();
  });
});
