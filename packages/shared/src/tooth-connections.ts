import {
  ADULT_FDI_TEETH,
  isAdultFdiTooth,
  type AdultFdiTooth,
  type AnatomicalScopeType,
} from "./postmeeting-contract.js";

export interface CanonicalWorkOrderCompositionItem {
  readonly scope: AnatomicalScopeType;
  readonly teeth: readonly number[];
  readonly archivedAt?: Date | string | null;
}

export interface NormalizedToothConnection {
  readonly toothA: AdultFdiTooth;
  readonly toothB: AdultFdiTooth;
}

export interface ToothConnectionView extends NormalizedToothConnection {
  readonly id: string;
  readonly workOrderId: string;
  readonly createdAt: string;
}

const UPPER_ARCH_TEETH = ADULT_FDI_TEETH.slice(0, 16);
const LOWER_ARCH_TEETH = ADULT_FDI_TEETH.slice(16);
const CANONICAL_TOOTH_ORDER = new Map<number, number>(ADULT_FDI_TEETH.map((tooth, index) => [tooth, index]));
const ADJACENT_PAIRS = new Set<string>([
  ...Array.from({ length: 15 }, (_, index) => `${ADULT_FDI_TEETH[index]}-${ADULT_FDI_TEETH[index + 1]}`),
  ...Array.from({ length: 15 }, (_, index) => `${ADULT_FDI_TEETH[index + 16]}-${ADULT_FDI_TEETH[index + 17]}`),
]);

export function expandCanonicalWorkOrderItemTeeth(item: Pick<CanonicalWorkOrderCompositionItem, "scope" | "teeth">): readonly AdultFdiTooth[] {
  switch (item.scope) {
    case "UPPER_ARCH":
      return UPPER_ARCH_TEETH;
    case "LOWER_ARCH":
      return LOWER_ARCH_TEETH;
    case "BOTH_ARCHES":
      return ADULT_FDI_TEETH;
    case "TOOTH":
    case "TEETH":
      return normalizeConnectionTeeth(item.teeth);
    case "CASE":
      return [];
  }
}

export function getCanonicalWorkOrderCompositionTeeth(items: readonly CanonicalWorkOrderCompositionItem[]): readonly AdultFdiTooth[] {
  const teeth = new Set<AdultFdiTooth>();
  for (const item of items) {
    if (item.archivedAt) continue;
    for (const tooth of expandCanonicalWorkOrderItemTeeth(item)) teeth.add(tooth);
  }
  return [...teeth].sort((left, right) => (CANONICAL_TOOTH_ORDER.get(left) ?? 999) - (CANONICAL_TOOTH_ORDER.get(right) ?? 999));
}

export function normalizeConnectionPair(toothA: number, toothB: number): NormalizedToothConnection | null {
  if (!isAdultFdiTooth(toothA) || !isAdultFdiTooth(toothB) || toothA === toothB) return null;
  return CANONICAL_TOOTH_ORDER.get(toothA)! < CANONICAL_TOOTH_ORDER.get(toothB)!
    ? { toothA, toothB }
    : { toothA: toothB, toothB: toothA };
}

export function isAdjacentAdultFdiPair(toothA: number, toothB: number): boolean {
  const pair = normalizeConnectionPair(toothA, toothB);
  return pair !== null && ADJACENT_PAIRS.has(`${pair.toothA}-${pair.toothB}`);
}

export function normalizeConnectionTeeth(teeth: readonly number[]): readonly AdultFdiTooth[] {
  return [...new Set(teeth.filter(isAdultFdiTooth))]
    .sort((left, right) => (CANONICAL_TOOTH_ORDER.get(left) ?? 999) - (CANONICAL_TOOTH_ORDER.get(right) ?? 999));
}

export function compareNormalizedToothConnections(left: NormalizedToothConnection, right: NormalizedToothConnection): number {
  const first = (CANONICAL_TOOTH_ORDER.get(left.toothA) ?? 999) - (CANONICAL_TOOTH_ORDER.get(right.toothA) ?? 999);
  return first || ((CANONICAL_TOOTH_ORDER.get(left.toothB) ?? 999) - (CANONICAL_TOOTH_ORDER.get(right.toothB) ?? 999));
}

export function isToothPresentInCanonicalWorkOrderComposition(
  items: readonly CanonicalWorkOrderCompositionItem[],
  tooth: number,
): tooth is AdultFdiTooth {
  return isAdultFdiTooth(tooth) && getCanonicalWorkOrderCompositionTeeth(items).includes(tooth);
}
