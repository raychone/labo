import { describe, expect, it } from "vitest";

import { DELIVERY_FAILURE_REASON_LABELS, DELIVERY_STATUS_LABELS, canTransitionDelivery, createDefaultDeliveryActions, isDeliveryToday, validateAndNormalizeSignature } from "./delivery.js";

describe("delivery shared rules", () => {
  it("keeps Romanian labels for statuses and failure reasons", () => {
    expect(DELIVERY_STATUS_LABELS.IN_TRANSIT).toBe("În tranzit");
    expect(DELIVERY_STATUS_LABELS.FAILED).toBe("Nereușită");
    expect(DELIVERY_FAILURE_REASON_LABELS.RECIPIENT_UNAVAILABLE).toBe("Destinatar indisponibil");
  });

  it("creates disabled actions by default", () => {
    expect(createDefaultDeliveryActions()).toStrictEqual({
      assign: false,
      cancel: false,
      complete: false,
      fail: false,
      printProof: false,
      pickup: false,
      readProof: false,
      reschedule: false,
      signatureOverride: false,
      startTransit: false,
      unassign: false,
      updatePlan: false,
    });
  });

  it("allows only the documented delivery transitions", () => {
    expect(canTransitionDelivery("ASSIGNED", "pickup")).toBe(true);
    expect(canTransitionDelivery("PICKED_UP", "startTransit")).toBe(true);
    expect(canTransitionDelivery("IN_TRANSIT", "complete")).toBe(true);
    expect(canTransitionDelivery("FAILED", "reschedule")).toBe(true);
    expect(canTransitionDelivery("PLANNED", "complete")).toBe(false);
    expect(canTransitionDelivery("DELIVERED", "cancel")).toBe(false);
  });

  it("detects today's planned deliveries in UTC", () => {
    expect(isDeliveryToday(new Date("2026-07-26T22:30:00.000Z"), new Date("2026-07-26T01:00:00.000Z"))).toBe(true);
    expect(isDeliveryToday(new Date("2026-07-27T00:00:00.000Z"), new Date("2026-07-26T23:59:00.000Z"))).toBe(false);
  });

  it("normalizes valid signature strokes into canonical JSON", () => {
    const result = validateAndNormalizeSignature({
      strokes: [
        {
          points: Array.from({ length: 8 }, (_, index) => ({ t: index, x: index / 10, y: 0.25 })),
        },
      ],
    });

    expect(result.pointCount).toBe(8);
    expect(result.canonical).toContain("\"strokes\"");
  });

  it("rejects unsafe or incomplete signature payloads", () => {
    expect(() => validateAndNormalizeSignature({ strokes: [{ points: [{ t: 1, x: 1.2, y: 0.5 }] }] })).toThrow("coordonate");
    expect(() => validateAndNormalizeSignature({ strokes: [{ points: [{ t: 1, x: 0.2, y: 0.5, pressure: 0.4 }] }] })).toThrow("puncte");
    expect(() => validateAndNormalizeSignature({ strokes: [{ points: [{ t: 1, x: 0.2, y: 0.5 }] }] })).toThrow("prea scurtă");
  });
});
