import { BadRequestException, Injectable } from "@nestjs/common";

interface SignaturePoint {
  readonly t: number;
  readonly x: number;
  readonly y: number;
}

interface SignatureStroke {
  readonly points: readonly SignaturePoint[];
}

export interface SignatureValue {
  readonly strokes: readonly SignatureStroke[];
}

export interface SignatureValidationResult {
  readonly canonical: string;
  readonly pointCount: number;
  readonly signature: SignatureValue;
}

const SIGNATURE_LIMITS = {
  maxPayloadBytes: 200_000,
  maxPoints: 5_000,
  maxStrokes: 50,
  minPoints: 8,
} as const;

@Injectable()
export class DeliveryProofValidationService {
  public validateSignature(value: unknown): SignatureValidationResult {
    try {
      return validateAndNormalizeSignature(value);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Semnătura are un format invalid.");
    }
  }
}

function validateAndNormalizeSignature(value: unknown): SignatureValidationResult {
  const payloadSize = new TextEncoder().encode(JSON.stringify(value)).length;
  if (payloadSize > SIGNATURE_LIMITS.maxPayloadBytes) {
    throw new Error("Semnătura depășește dimensiunea permisă.");
  }
  if (!isPlainObject(value) || Object.keys(value).length !== 1 || !Array.isArray(value.strokes)) {
    throw new Error("Semnătura are un format invalid.");
  }
  if (value.strokes.length === 0 || value.strokes.length > SIGNATURE_LIMITS.maxStrokes) {
    throw new Error("Semnătura trebuie să conțină între 1 și 50 de linii.");
  }
  let pointCount = 0;
  const strokes = value.strokes.map((stroke) => {
    if (!isPlainObject(stroke) || Object.keys(stroke).length !== 1 || !Array.isArray(stroke.points)) {
      throw new Error("Semnătura conține linii invalide.");
    }
    if (stroke.points.length === 0) {
      throw new Error("Semnătura conține o linie goală.");
    }
    pointCount += stroke.points.length;
    if (pointCount > SIGNATURE_LIMITS.maxPoints) {
      throw new Error("Semnătura conține prea multe puncte.");
    }
    return { points: stroke.points.map((point) => normalizePoint(point)) };
  });
  if (pointCount < SIGNATURE_LIMITS.minPoints) {
    throw new Error("Semnătura este prea scurtă.");
  }
  const signature = { strokes } as const satisfies SignatureValue;
  return { canonical: canonicalizeSignature(signature), pointCount, signature };
}

function canonicalizeSignature(signature: SignatureValue): string {
  return JSON.stringify({
    strokes: signature.strokes.map((stroke) => ({
      points: stroke.points.map((point) => ({ t: point.t, x: point.x, y: point.y })),
    })),
  });
}

function normalizePoint(value: unknown): SignaturePoint {
  if (!isPlainObject(value) || Object.keys(value).length !== 3) {
    throw new Error("Semnătura conține puncte invalide.");
  }
  const t = value["t"];
  const x = value["x"];
  const y = value["y"];
  if (!isFiniteNumber(x) || x < 0 || x > 1 || !isFiniteNumber(y) || y < 0 || y > 1 || !isFiniteNumber(t) || !Number.isInteger(t) || t < 0) {
    throw new Error("Semnătura conține coordonate invalide.");
  }
  return { t, x: roundCoordinate(x), y: roundCoordinate(y) };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
