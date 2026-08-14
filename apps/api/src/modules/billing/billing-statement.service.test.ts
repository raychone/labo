import { ConflictException } from "@nestjs/common";
import type { LegalEntityContext } from "../organization-context/organization-context.view.js";
import type { PrismaService } from "../database/prisma.service.js";
import { describe, expect, it, vi } from "vitest";

import { BillingStatementService } from "./billing-statement.service.js";

function createService(prismaOverrides: Partial<PrismaService> = {}) {
  const auditRecord = vi.fn().mockResolvedValue(undefined);
  const prisma = {
    billingDocument: { findMany: vi.fn() },
    billingMonthCloseArchive: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    payment: { findMany: vi.fn() },
    ...prismaOverrides,
  };

  const service = new BillingStatementService(
    prisma as PrismaService,
    { record: auditRecord } as never,
  );

  return { auditRecord, prisma, service };
}

function legalEntity(code: "NC" | "NG"): LegalEntityContext {
  return {
    code,
    displayName: code === "NC" ? "Nicolaie Cristina" : "Nicolaie Gabriel",
    id: code === "NC" ? "legal_nc" : "legal_ng",
  } as LegalEntityContext;
}

function createRegistryDocument() {
  return {
    clinicNameSnapshot: "Clinica Test",
    currency: "RON",
    dueDate: new Date("2026-08-20T00:00:00.000Z"),
    formattedNumber: "FACT-2026-000001",
    id: "doc_1",
    issueDate: new Date("2026-08-14T00:00:00.000Z"),
    lines: [
      {
        doctorNameSnapshot: "Dr. Ana Popescu",
        patientNameSnapshot: "Ion Pop",
        workCode: "WO-2026-000001",
      },
    ],
    payments: [{ amountMinor: 40000, cancelledAt: null }],
    status: "PARTIALLY_PAID",
    totalMinor: 100000,
    type: "INVOICE",
  } as const;
}

function createRegistryPayment() {
  return {
    amountMinor: 40000,
    billingDocumentId: "doc_1",
    billingDocument: { formattedNumber: "FACT-2026-000001" },
    cancelledAt: null,
    clinic: { name: "Clinica Test" },
    createdAt: new Date("2026-08-14T10:00:00.000Z"),
    id: "payment_1",
    legalEntityId: "legal_nc",
    method: "CASH",
    paymentDate: new Date("2026-08-14T10:00:00.000Z"),
    receiptDate: null,
    receiptNumber: "RC-1",
    reference: "REF-1",
    updatedAt: new Date("2026-08-14T10:00:00.000Z"),
  } as const;
}

describe("BillingStatementService month close archives", () => {
  it("uses archived snapshot for a historical month and keeps the live builder untouched", async () => {
    const snapshot = {
      currency: "RON",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
      generatedAt: "2026-08-14T12:00:00.000Z",
      paidMinor: 40000,
      paidTotalMinor: 0,
      partialTotalMinor: 100000,
      payments: [],
      rows: [{ balanceMinor: 60000, clinicName: "Clinica Test", code: "WO-2026-000001", createdAt: "2026-08-14T00:00:00.000Z", doctorNames: ["Dr. Ana Popescu"], documentId: "doc_1", documentNumber: "FACT-2026-000001", documentType: "INVOICE", dueDate: "2026-08-20T00:00:00.000Z", issueDate: "2026-08-14T00:00:00.000Z", paidMinor: 40000, patientNames: ["Ion Pop"], status: "PARTIALLY_PAID", totalMinor: 100000, workCodes: ["WO-2026-000001"] }],
      totalMinor: 100000,
      unpaidTotalMinor: 0,
    };
    const { auditRecord, prisma, service } = createService({
      billingDocument: { findMany: vi.fn() },
      billingMonthCloseArchive: {
        findUnique: vi.fn().mockResolvedValue({
          closedAt: new Date("2026-08-14T12:00:00.000Z"),
          closedBy: { displayName: "Demo Manager", email: "manager@demo.local", id: "user_1" },
          closedByUserId: "user_1",
          currency: "RON",
          id: "archive_1",
          legalEntityId: "legal_nc",
          month: 8,
          paidMinor: 40000,
          paidTotalMinor: 0,
          partialTotalMinor: 100000,
          periodEnd: new Date("2026-08-31T23:59:59.999Z"),
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
          reportVersion: "1",
          snapshot,
          totalMinor: 100000,
          unpaidTotalMinor: 0,
          updatedAt: new Date("2026-08-14T12:00:00.000Z"),
          year: 2026,
        }),
      },
      payment: { findMany: vi.fn() },
    } as unknown as Partial<PrismaService>);

    const registry = await service.getMonthRegistry(
      { actorUserId: "user_1", requestMetadata: {} as never },
      legalEntity("NC"),
      { month: 8, year: 2026 },
    );

    expect(registry).toEqual(snapshot);
    expect(prisma.billingDocument.findMany).not.toHaveBeenCalled();
    expect(auditRecord).toHaveBeenCalledWith(expect.objectContaining({
      action: expect.any(String),
      actorUserId: "user_1",
    }));
  });

  it("lists archives scoped by legal entity and includes the closed-by metadata", async () => {
    const { prisma, service } = createService({
      billingMonthCloseArchive: {
        findMany: vi.fn().mockResolvedValue([
          {
            closedAt: new Date("2026-08-14T12:00:00.000Z"),
            closedBy: { displayName: "Demo Manager", email: "manager@demo.local", id: "user_1" },
            closedByUserId: "user_1",
            currency: "RON",
            id: "archive_1",
            legalEntityId: "legal_nc",
            month: 8,
            paidMinor: 40000,
            paidTotalMinor: 0,
            partialTotalMinor: 100000,
            periodEnd: new Date("2026-08-31T23:59:59.999Z"),
            periodStart: new Date("2026-08-01T00:00:00.000Z"),
            reportVersion: "1",
            snapshot: { currency: "RON", dateFrom: "2026-08-01", dateTo: "2026-08-31", generatedAt: "2026-08-14T12:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, payments: [], rows: [], totalMinor: 0, unpaidTotalMinor: 0 },
            totalMinor: 100000,
            unpaidTotalMinor: 0,
            updatedAt: new Date("2026-08-14T12:00:00.000Z"),
            year: 2026,
          },
        ]),
      },
    } as unknown as Partial<PrismaService>);

    const result = await service.listMonthCloseArchives(legalEntity("NC"));

    expect(prisma.billingMonthCloseArchive.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { legalEntityId: "legal_nc" },
    }));
    expect(result.items[0]).toMatchObject({
      archiveId: "archive_1",
      closedByDisplayName: "Demo Manager",
      closedByEmail: "manager@demo.local",
      closedByUserId: "user_1",
      month: 8,
      year: 2026,
    });
  });

  it("creates a closed archive and preserves the snapshot for the same legal entity", async () => {
    const document = createRegistryDocument();
    const payment = createRegistryPayment();
    const archiveCreate = vi.fn().mockImplementation(async ({ data }: { readonly data: Record<string, unknown> }) => ({
      ...data,
      closedBy: { displayName: "Demo Manager", email: "manager@demo.local", id: "user_1" },
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
      id: "archive_1",
      updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    }));
    const { service } = createService({
      billingDocument: { findMany: vi.fn().mockResolvedValue([document]) },
      billingMonthCloseArchive: {
        create: archiveCreate,
        findUnique: vi.fn().mockResolvedValue(null),
      },
      payment: { findMany: vi.fn().mockResolvedValue([payment]) },
    } as unknown as Partial<PrismaService>);

    const archive = await service.closeMonth(
      { actorUserId: "user_1", requestMetadata: {} as never },
      legalEntity("NC"),
      { month: 8, year: 2026 },
    );

    expect(archiveCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        closedByUserId: "user_1",
        legalEntityId: "legal_nc",
        month: 8,
        year: 2026,
      }),
    }));
    expect(archive).toMatchObject({
      archiveId: "archive_1",
      closedByDisplayName: "Demo Manager",
      closedByEmail: "manager@demo.local",
      closedByUserId: "user_1",
      month: 8,
      year: 2026,
    });
    expect(archive.snapshot.currency).toBe("RON");
    expect(archive.snapshot.rows).toHaveLength(1);
    expect(archive.snapshot.rows[0]).toMatchObject({
      clinicName: "Clinica Test",
      workCodes: ["WO-2026-000001"],
    });
  });

  it("rejects duplicate archives for the same legal entity and month", async () => {
    const { prisma, service } = createService({
      billingMonthCloseArchive: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          closedAt: new Date("2026-08-14T12:00:00.000Z"),
          closedBy: null,
          closedByUserId: null,
          currency: "RON",
          id: "archive_1",
          legalEntityId: "legal_nc",
          month: 8,
          paidMinor: 40000,
          paidTotalMinor: 0,
          partialTotalMinor: 100000,
          periodEnd: new Date("2026-08-31T23:59:59.999Z"),
          periodStart: new Date("2026-08-01T00:00:00.000Z"),
          reportVersion: "1",
          snapshot: { currency: "RON", dateFrom: "2026-08-01", dateTo: "2026-08-31", generatedAt: "2026-08-14T12:00:00.000Z", paidMinor: 0, paidTotalMinor: 0, partialTotalMinor: 0, payments: [], rows: [], totalMinor: 0, unpaidTotalMinor: 0 },
          totalMinor: 100000,
          unpaidTotalMinor: 0,
          updatedAt: new Date("2026-08-14T12:00:00.000Z"),
          year: 2026,
        }),
      },
      billingDocument: { findMany: vi.fn() },
      payment: { findMany: vi.fn() },
    } as unknown as Partial<PrismaService>);

    await expect(service.closeMonth(
      { actorUserId: "user_1", requestMetadata: {} as never },
      legalEntity("NC"),
      { month: 8, year: 2026 },
    )).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.billingMonthCloseArchive.create).not.toHaveBeenCalled();
  });

  it("allows the same calendar month to be archived independently per legal entity", async () => {
    const document = createRegistryDocument();
    const payment = createRegistryPayment();
    const archiveCreate = vi.fn().mockImplementation(async ({ data }: { readonly data: Record<string, unknown> }) => ({
      ...data,
      closedBy: { displayName: "Demo Manager", email: "manager@demo.local", id: "user_1" },
      createdAt: new Date("2026-08-14T12:00:00.000Z"),
      id: String(data.legalEntityId) === "legal_nc" ? "archive_nc" : "archive_ng",
      updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    }));
    const findUnique = vi.fn().mockResolvedValue(null);
    const { service } = createService({
      billingDocument: { findMany: vi.fn().mockResolvedValue([document]) },
      billingMonthCloseArchive: {
        create: archiveCreate,
        findUnique,
      },
      payment: { findMany: vi.fn().mockResolvedValue([payment]) },
    } as unknown as Partial<PrismaService>);

    await service.closeMonth({ actorUserId: "user_1", requestMetadata: {} as never }, legalEntity("NC"), { month: 8, year: 2026 });
    await service.closeMonth({ actorUserId: "user_1", requestMetadata: {} as never }, legalEntity("NG"), { month: 8, year: 2026 });

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { legalEntityId_year_month: { legalEntityId: "legal_nc", month: 8, year: 2026 } },
    }));
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { legalEntityId_year_month: { legalEntityId: "legal_ng", month: 8, year: 2026 } },
    }));
    expect(archiveCreate).toHaveBeenCalledTimes(2);
    expect(archiveCreate.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      data: expect.objectContaining({ legalEntityId: "legal_nc" }),
    }));
    expect(archiveCreate.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      data: expect.objectContaining({ legalEntityId: "legal_ng" }),
    }));
  });
});
