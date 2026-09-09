import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { LogisticsService, type UploadedAttachmentFile } from "./logistics.service.js";
import { LogisticsCenterQueryDto } from "./dto/logistics.dto.js";

function createService({ allowUpload = true } = {}) {
  const authorizationService = {
    hasPermission: vi.fn(({ permission }: { readonly permission: string }) => Promise.resolve({
      allowed: permission === "files.upload" ? allowUpload : true,
    })),
  };
  const work = {
    id: "work_1",
    code: "WO-26-0001",
  };
  const worksService = {
    createWork: vi.fn(() => Promise.resolve(work)),
  };
  const auditLogCreate = vi.fn(() => Promise.resolve({ id: "audit_1" }));
  const pickupRecord = {
    cancelledAt: null,
    clinic: { id: "clinic_1", name: "Clinica Test" },
    clinicId: "clinic_1",
    createdAt: new Date("2026-08-20T10:00:00.000Z"),
    doctor: { displayName: "Dr. Ana", id: "doctor_1" },
    doctorId: "doctor_1",
    exactTime: "09:30",
    id: "pickup_1",
    notes: null,
    scheduledDate: new Date("2026-08-21T00:00:00.000Z"),
    scheduleType: "EXACT",
    status: "SCHEDULED",
    updatedAt: new Date("2026-08-20T10:00:00.000Z"),
    version: 1,
    windowEndTime: null,
    windowStartTime: null,
  };
  const pickupRequestCreate = vi.fn(({ data }: { readonly data: Record<string, unknown> }) => Promise.resolve({ ...pickupRecord, ...data, clinic: pickupRecord.clinic, doctor: pickupRecord.doctor }));
  const pickupRequestFindMany = vi.fn(() => Promise.resolve([pickupRecord]));
  const pickupRequestFindUnique = vi.fn(() => Promise.resolve(pickupRecord));
  const pickupRequestUpdate = vi.fn(({ data }: { readonly data: Record<string, unknown> }) => Promise.resolve({
    ...pickupRecord,
    ...data,
    clinic: pickupRecord.clinic,
    doctor: pickupRecord.doctor,
    status: data.status ?? pickupRecord.status,
    updatedAt: new Date("2026-08-20T11:00:00.000Z"),
    version: 2,
  }));
  const routeRecord = {
    completedAt: null,
    courier: { displayName: "Curier Test", id: "courier_1" },
    courierUserId: "courier_1",
    createdAt: new Date("2026-08-20T10:00:00.000Z"),
    id: "route_1",
    name: "Traseu 1",
    notes: null,
    routeDate: new Date("2026-08-21T00:00:00.000Z"),
    routeNumber: "TR-260821-01",
    startedAt: null,
    status: "ASSIGNED",
    stops: [
      { failureReason: null, id: "stop_1", outcomeAt: null, outcomeBy: null, outcomeNotes: null, outcomeStatus: "PENDING", pickupRequest: null, pickupRequestId: null, stopOrder: 1, type: "DELIVERY", workOrder: { code: "WO-26-0001", patientName: "Ion Pop" }, workOrderId: "work_1" },
      { failureReason: null, id: "stop_2", outcomeAt: null, outcomeBy: null, outcomeNotes: null, outcomeStatus: "PENDING", pickupRequest: { clinic: { name: "Clinica Test" }, exactTime: "09:30", scheduledDate: new Date("2026-08-21T00:00:00.000Z"), windowEndTime: null, windowStartTime: null }, pickupRequestId: "pickup_1", stopOrder: 2, type: "PICKUP", workOrder: null, workOrderId: null },
    ],
    updatedAt: new Date("2026-08-20T10:00:00.000Z"),
    version: 1,
  };
  const courierRouteCount = vi.fn(() => Promise.resolve(0));
  const courierRouteFindMany = vi.fn(() => Promise.resolve([] as { readonly routeNumber: string }[]));
  const courierRouteFindUnique = vi.fn(() => Promise.resolve(routeRecord));
  const courierRouteCreate = vi.fn(({ data }: { readonly data: Record<string, unknown> }) => Promise.resolve({
    ...routeRecord,
    courierUserId: data.courierUserId as string | null,
    name: data.name as string,
    notes: data.notes as string | null,
    routeDate: data.routeDate as Date,
    routeNumber: data.routeNumber as string,
    status: data.status as string,
    stops: ((data.stops as { readonly create: readonly Record<string, unknown>[] }).create).map((stop, index) => ({
      id: `stop_${index + 1}`,
      outcomeAt: null,
      outcomeBy: null,
      outcomeNotes: null,
      outcomeStatus: "PENDING",
      pickupRequestId: stop.pickupRequest ? (stop.pickupRequest as { readonly connect: { readonly id: string } }).connect.id : null,
      stopOrder: stop.stopOrder as number,
      type: stop.type as string,
      workOrderId: stop.workOrder ? (stop.workOrder as { readonly connect: { readonly id: string } }).connect.id : null,
    })),
  }));
  const courierRouteUpdate = vi.fn(({ data }: { readonly data: Record<string, unknown> }) => Promise.resolve({
    ...routeRecord,
    completedAt: (data.completedAt as Date | undefined) ?? routeRecord.completedAt,
    startedAt: (data.startedAt as Date | undefined) ?? routeRecord.startedAt,
    status: data.status as string,
    stops: routeRecord.stops.map((stop) => stop.id === "stop_1" ? { ...stop, outcomeAt: new Date("2026-08-20T12:00:00.000Z"), outcomeBy: { displayName: "Curier Test" }, outcomeStatus: "DELIVERED" } : stop),
    version: 2,
  }));
  const courierRouteEventCreate = vi.fn(() => Promise.resolve({ id: "route_event_1" }));
  const courierRouteStopFindFirst = vi.fn(() => Promise.resolve(null));
  const courierRouteStopUpdate = vi.fn(() => Promise.resolve({ id: "stop_1" }));
  const workOrderUpdate = vi.fn(() => Promise.resolve({ id: "work_1" }));
  const workOrderFindMany = vi.fn(({ where }: { readonly where: { readonly id: { readonly in: readonly string[] } } }) => Promise.resolve(where.id.in.map((id) => ({ id }))));
  const workAttachmentCreate = vi.fn(({ data }: { readonly data: { readonly fileName: string; readonly mimeType: string; readonly sizeBytes: number } }) => Promise.resolve({
    id: `att_${data.fileName}`,
    fileName: data.fileName,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    uploadedAt: new Date("2026-08-20T10:00:00.000Z"),
  }));
  const prisma = {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({
      $executeRaw: vi.fn().mockResolvedValue(0),
      auditLog: { create: auditLogCreate },
      courierRoute: { count: courierRouteCount, create: courierRouteCreate, findMany: courierRouteFindMany, findUnique: courierRouteFindUnique, update: courierRouteUpdate },
      courierRouteEvent: { create: courierRouteEventCreate },
      courierRouteStop: { findFirst: courierRouteStopFindFirst, update: courierRouteStopUpdate },
      delivery: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      deliveryPreparationItem: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      pickupRequest: { create: pickupRequestCreate, findUnique: pickupRequestFindUnique, update: pickupRequestUpdate },
      workAttachment: { create: workAttachmentCreate },
      workOrder: { findMany: workOrderFindMany, update: workOrderUpdate },
    })),
    clinic: { findFirst: vi.fn(() => Promise.resolve({ id: "clinic_1" })) },
    doctor: { findFirst: vi.fn(() => Promise.resolve({ id: "doctor_1" })) },
    pickupRequest: { findMany: pickupRequestFindMany },
    workOrder: { findMany: workOrderFindMany },
    courierRouteStop: { findFirst: courierRouteStopFindFirst },
  };

  return {
    authorizationService,
    auditLogCreate,
    courierRouteCreate,
    courierRouteEventCreate,
    courierRouteFindUnique,
    courierRouteFindMany,
    courierRouteStopUpdate,
    courierRouteUpdate,
    prisma,
    pickupRequestCreate,
    pickupRequestFindUnique,
    pickupRequestUpdate,
    service: new LogisticsService(authorizationService as never, prisma as never, worksService as never),
    work,
    workAttachmentCreate,
    workOrderFindMany,
    worksService,
  };
}

function upload(overrides: Partial<UploadedAttachmentFile> = {}): UploadedAttachmentFile {
  const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return {
    buffer,
    mimetype: "image/png",
    originalname: "photo.png",
    size: buffer.length,
    ...overrides,
  };
}

const workBody = {
  work: JSON.stringify({
    clinicId: null,
    doctorId: null,
    patientId: "patient_1",
    priority: "NORMAL",
    quantity: 1,
    requestedDeliveryDate: "2026-08-21T00:00:00.000Z",
    shade: "A2",
    workFormSubmission: {
      templateId: "template_1",
      templateVersion: 1,
      values: { teeth: ["11", "21"] },
    },
    workTypeId: "work_type_1",
  }),
};

describe("LogisticsService.createWorkWithAttachments", () => {
  it("reuses work creation and stores validated attachment snapshots with audit", async () => {
    const { auditLogCreate, service, workAttachmentCreate, worksService } = createService();

    const result = await service.createWorkWithAttachments(
      { actor: { id: "user_1" } as never, requestMetadata: { ipAddress: "127.0.0.1", userAgent: "test" } },
      { code: "NC", id: "legal_1" } as never,
      workBody,
      [upload()],
    );

    expect(worksService.createWork).toHaveBeenCalledWith(
      { actorUserId: "user_1", requestMetadata: { ipAddress: "127.0.0.1", userAgent: "test" } },
      { code: "NC", id: "legal_1" },
      expect.objectContaining({ clinicId: null, doctorId: null, patientId: "patient_1", shade: "A2" }),
      true,
    );
    expect(workAttachmentCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ fileName: "photo.png", mimeType: "image/png", uploadedByUserId: "user_1", workOrderId: "work_1" }) });
    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "logistics.attachment_uploaded", resourceType: "work_attachment" }) });
    expect(result.attachments).toEqual([{ fileName: "photo.png", id: "att_photo.png", mimeType: "image/png", sizeBytes: 8, uploadedAt: "2026-08-20T10:00:00.000Z" }]);
    expect(result.work).toEqual({ code: "WO-26-0001", id: "work_1" });
  });

  it("rejects unsafe file types before creating the work", async () => {
    const { service, worksService } = createService();

    await expect(service.createWorkWithAttachments(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { code: "NC", id: "legal_1" } as never,
      workBody,
      [upload({ mimetype: "application/x-msdownload", originalname: "bad.exe" })],
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(worksService.createWork).not.toHaveBeenCalled();
  });

  it("rejects content that spoofs an allowed MIME type before creating the work", async () => {
    const { service, worksService } = createService();
    const buffer = Buffer.from("<script>alert(1)</script>");

    await expect(service.createWorkWithAttachments(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { code: "NC", id: "legal_1" } as never,
      workBody,
      [upload({ buffer, size: buffer.length })],
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(worksService.createWork).not.toHaveBeenCalled();
  });

  it("requires file upload permission", async () => {
    const { service, worksService } = createService({ allowUpload: false });

    await expect(service.createWorkWithAttachments(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { code: "NC", id: "legal_1" } as never,
      workBody,
      [upload()],
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(worksService.createWork).not.toHaveBeenCalled();
  });
});

describe("LogisticsService pickup requests", () => {
  it("creates a standalone exact-time pickup request with audit", async () => {
    const { auditLogCreate, pickupRequestCreate, service } = createService();

    const result = await service.createPickupRequest(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { clinicId: "clinic_1", doctorId: "doctor_1", exactTime: "09:30", scheduledDate: "2026-08-21", scheduleType: "EXACT" },
    );

    expect(pickupRequestCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      clinicId: "clinic_1",
      doctorId: "doctor_1",
      exactTime: "09:30",
      scheduleType: "EXACT",
      windowEndTime: null,
      windowStartTime: null,
    }), include: { clinic: true, doctor: true } });
    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "pickup.created", resourceType: "pickup_request" }) });
    expect(result.scheduleType).toBe("EXACT");
    expect(result.scheduleLabel).toBe("09:30");
  });

  it("rejects an invalid pickup time window before persistence", async () => {
    const { pickupRequestCreate, service } = createService();

    await expect(service.createPickupRequest(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { clinicId: "clinic_1", doctorId: "doctor_1", scheduledDate: "2026-08-21", scheduleType: "RANGE", windowEndTime: "10:00", windowStartTime: "12:00" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(pickupRequestCreate).not.toHaveBeenCalled();
  });

  it("cancels a scheduled pickup with explicit timestamp and audit", async () => {
    const { auditLogCreate, pickupRequestUpdate, service } = createService();

    const result = await service.cancelPickupRequest(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      "pickup_1",
      { version: 1 },
    );

    expect(pickupRequestUpdate).toHaveBeenCalledWith({ data: expect.objectContaining({
      cancelledByUserId: "user_1",
      status: "CANCELLED",
    }), include: { clinic: true, doctor: true }, where: { id: "pickup_1" } });
    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "pickup.cancelled", resourceType: "pickup_request" }) });
    expect(result.status).toBe("CANCELLED");
  });
});

describe("LogisticsService delivery eligibility", () => {
  it("keeps a finalized work visible after a delivery from an earlier cycle", () => {
    const { service } = createService();
    const where = (service as unknown as { toWorkWhere: (query: LogisticsCenterQueryDto) => Record<string, unknown> }).toWorkWhere(
      Object.assign(new LogisticsCenterQueryDto(), { category: "DE_LIVRAT" }),
    );
    const eligibility = (where.AND as Array<Record<string, unknown>>)[0]!;
    const readinessBranch = (eligibility.OR as Array<Record<string, unknown>>)[0]!;

    expect(readinessBranch.technicalReadiness).toEqual({ in: ["PROBE_READY", "FINAL_READY"] });
    expect(readinessBranch.requiresDelivery).toBe(true);
    expect(readinessBranch.courierRouteStops).toEqual({
      none: {
        outcomeStatus: "PENDING",
        route: { status: { in: ["DRAFT", "ASSIGNED", "IN_PROGRESS"] } },
      },
    });
  });
});

describe("LogisticsService routes", () => {
  it("rejects probe-ready and final-ready deliveries until Livrare was explicitly requested", async () => {
    const { courierRouteCreate, service, workOrderFindMany } = createService();
    workOrderFindMany.mockResolvedValueOnce([]);

    await expect(service.createRoute(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      {
        name: "Traseu blocat",
        routeDate: "2026-08-21",
        stops: [{ type: "DELIVERY", workOrderId: "work_1" }],
      },
    )).rejects.toThrow("marcate explicit pentru Livrare");
    expect(workOrderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        requiresDelivery: true,
        technicalReadiness: { in: ["PROBE_READY", "FINAL_READY"] },
      }),
    }));
    expect(courierRouteCreate).not.toHaveBeenCalled();
  });

  it("creates a mixed route and persists manual selection order", async () => {
    const { auditLogCreate, courierRouteCreate, courierRouteEventCreate, service } = createService();

    const result = await service.createRoute(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      {
        courierUserId: "courier_1",
        name: "Traseu 1",
        routeDate: "2026-08-21",
        stops: [
          { type: "DELIVERY", workOrderId: "work_1" },
          { type: "PICKUP", pickupRequestId: "pickup_1" },
        ],
      },
    );

    expect(courierRouteCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        routeNumber: "TR-260821-01",
        status: "ASSIGNED",
        stops: { create: [
          { addressOverride: null, phoneOverride: null, stopNotes: null, stopOrder: 1, type: "DELIVERY", workOrder: { connect: { id: "work_1" } } },
          { addressOverride: null, phoneOverride: null, pickupRequest: { connect: { id: "pickup_1" } }, stopNotes: null, stopOrder: 2, type: "PICKUP" },
        ] },
      }),
    }));
    expect(courierRouteEventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ routeId: "route_1", type: "ROUTE_CREATED" }) });
    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "route.created", resourceType: "courier_route" }) });
    expect(result.stops.map((stop) => [stop.type, stop.stopOrder])).toEqual([["DELIVERY", 1], ["PICKUP", 2]]);
  });

  it("allocates the next route number from the highest issued suffix instead of the row count", async () => {
    const { courierRouteCreate, courierRouteFindMany, service } = createService();
    courierRouteFindMany.mockResolvedValueOnce([{ routeNumber: "TR-260821-01" }, { routeNumber: "TR-260821-03" }]);

    await service.createRoute(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      { name: "Traseu fără coliziune", routeDate: "2026-08-21", stops: [{ type: "DELIVERY", workOrderId: "work_1" }] },
    );

    expect(courierRouteCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ routeNumber: "TR-260821-04" }),
    }));
  });

  it("does not allow route editing to bypass the explicit Livrare gate", async () => {
    const { courierRouteUpdate, service, workOrderFindMany } = createService();
    workOrderFindMany.mockResolvedValueOnce([]);

    await expect(service.updateRoute(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      "route_1",
      {
        courierUserId: "courier_1",
        name: "Traseu 1",
        routeDate: "2026-08-21",
        stops: [
          { type: "DELIVERY", workOrderId: "work_1" },
          { type: "DELIVERY", workOrderId: "work_2" },
        ],
        version: 1,
      },
    )).rejects.toThrow("marcate explicit pentru Livrare");
    expect(workOrderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ["work_2"] },
        requiresDelivery: true,
        technicalReadiness: { in: ["PROBE_READY", "FINAL_READY"] },
      }),
    }));
    expect(courierRouteUpdate).not.toHaveBeenCalled();
  });

  it("rejects a route stop with an ambiguous target", async () => {
    const { courierRouteCreate, service } = createService();

    await expect(service.createRoute(
      { actor: { id: "user_1" } as never, requestMetadata: {} },
      {
        name: "Traseu invalid",
        routeDate: "2026-08-21",
        stops: [{ pickupRequestId: "pickup_1", type: "DELIVERY", workOrderId: "work_1" }],
      },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(courierRouteCreate).not.toHaveBeenCalled();
  });

  it("records an outcome on an own assigned route stop", async () => {
    const { auditLogCreate, courierRouteEventCreate, courierRouteStopUpdate, courierRouteUpdate, service } = createService();

    const result = await service.recordRouteStopOutcome(
      { actor: { id: "courier_1" } as never, requestMetadata: {} },
      "route_1",
      "stop_1",
      { notes: "Predat", outcomeStatus: "DELIVERED" },
    );

    expect(courierRouteStopUpdate).toHaveBeenCalledWith({ data: expect.objectContaining({ outcomeByUserId: "courier_1", outcomeNotes: "Predat", outcomeStatus: "DELIVERED" }), where: { id: "stop_1" } });
    expect(courierRouteUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "IN_PROGRESS" }) }));
    expect(courierRouteEventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ routeId: "route_1", type: "STOP_OUTCOME_RECORDED" }) });
    expect(auditLogCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "route.stop_outcome_recorded", resourceType: "courier_route" }) });
    expect(result.stops[0]?.outcomeStatus).toBe("DELIVERED");
  });

  it("rejects an invalid outcome for the stop type", async () => {
    const { courierRouteStopUpdate, service } = createService();

    await expect(service.recordRouteStopOutcome(
      { actor: { id: "courier_1" } as never, requestMetadata: {} },
      "route_1",
      "stop_1",
      { outcomeStatus: "PICKED_UP" },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(courierRouteStopUpdate).not.toHaveBeenCalled();
  });
});
