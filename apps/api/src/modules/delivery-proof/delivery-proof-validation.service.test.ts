import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { DeliveryProofValidationService } from "./delivery-proof-validation.service.js";

describe("DeliveryProofValidationService", () => {
  const service = new DeliveryProofValidationService();

  it("normalizes strict numeric signature strokes", () => {
    const result = service.validateSignature({
      strokes: [
        {
          points: Array.from({ length: 8 }, (_, index) => ({ t: index, x: index / 10, y: 0.4 })),
        },
      ],
    });

    expect(result.pointCount).toBe(8);
    expect(result.signature.strokes[0]?.points[0]).toStrictEqual({ t: 0, x: 0, y: 0.4 });
  });

  it("rejects extra properties and out of range coordinates", () => {
    expect(() => service.validateSignature({ strokes: [{ points: [{ t: 1, x: 0.2, y: 0.5, pressure: 0.8 }] }] })).toThrow(BadRequestException);
    expect(() => service.validateSignature({ strokes: [{ points: [{ t: 1, x: -0.1, y: 0.5 }] }] })).toThrow(BadRequestException);
  });
});
