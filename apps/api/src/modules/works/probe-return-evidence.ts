export interface ProbeReturnRouteStopEvidence {
  readonly outcomeAt: Date | null;
  readonly outcomeStatus: string;
  readonly type: string;
}

export interface ProbeReturnDeliveryEvidence {
  readonly createdAt: Date;
  readonly deliveredAt: Date | null;
  readonly status: string;
}

export interface ProbeReturnPreparationItemEvidence {
  readonly addedAt: Date;
  readonly deliveries: readonly ProbeReturnDeliveryEvidence[];
  readonly removedAt: Date | null;
  readonly workCycleId: string | null;
}

export interface ProbeReturnPickupRequestEvidence {
  readonly doctorId: string | null;
  readonly routeStops: readonly ProbeReturnRouteStopEvidence[];
}

export interface ProbeReturnEvidence {
  readonly activeWorkCycleId: string | null;
  readonly directRouteStops: readonly ProbeReturnRouteStopEvidence[];
  readonly doctorId: string | null;
  readonly pickupRequests: readonly ProbeReturnPickupRequestEvidence[];
  readonly preparationItems: readonly ProbeReturnPreparationItemEvidence[];
}

function latestDate(values: readonly (Date | null)[]): Date | null {
  return values.reduce<Date | null>((latest, value) => {
    if (!value) return latest;
    return !latest || value.getTime() > latest.getTime() ? value : latest;
  }, null);
}

function itemBelongedToDelivery(
  item: ProbeReturnPreparationItemEvidence,
  delivery: ProbeReturnDeliveryEvidence,
  activeWorkCycleId: string | null,
): boolean {
  if (activeWorkCycleId && item.workCycleId && item.workCycleId !== activeWorkCycleId) return false;
  if (item.addedAt.getTime() > delivery.createdAt.getTime()) return false;
  return item.removedAt === null || item.removedAt.getTime() >= delivery.createdAt.getTime();
}

export function latestSuccessfulDeliveryAt(evidence: ProbeReturnEvidence, readyAt: Date): Date | null {
  const legacyDeliveries = evidence.directRouteStops
    .filter((stop) => stop.type === "DELIVERY" && stop.outcomeStatus === "DELIVERED")
    .map((stop) => stop.outcomeAt)
    .filter((value): value is Date => value !== null && value.getTime() >= readyAt.getTime());
  const modernDeliveries = evidence.preparationItems.flatMap((item) => item.deliveries
    .filter((delivery) => (
      delivery.status === "DELIVERED"
      && delivery.deliveredAt !== null
      && delivery.deliveredAt.getTime() >= readyAt.getTime()
      && itemBelongedToDelivery(item, delivery, evidence.activeWorkCycleId)
    ))
    .map((delivery) => delivery.deliveredAt));
  return latestDate([...legacyDeliveries, ...modernDeliveries]);
}

export function latestSuccessfulPickupAt(evidence: ProbeReturnEvidence, deliveredAt: Date): Date | null {
  const directPickups = evidence.directRouteStops
    .filter((stop) => stop.type === "PICKUP" && stop.outcomeStatus === "PICKED_UP")
    .map((stop) => stop.outcomeAt)
    .filter((value): value is Date => value !== null && value.getTime() >= deliveredAt.getTime());
  const locationPickups = evidence.pickupRequests
    .filter((pickup) => pickup.doctorId === null || pickup.doctorId === evidence.doctorId)
    .flatMap((pickup) => pickup.routeStops)
    .filter((stop) => stop.type === "PICKUP" && stop.outcomeStatus === "PICKED_UP")
    .map((stop) => stop.outcomeAt)
    .filter((value): value is Date => value !== null && value.getTime() >= deliveredAt.getTime());
  return latestDate([...directPickups, ...locationPickups]);
}

export function resolveProbeReturnEvidence(evidence: ProbeReturnEvidence, readyAt: Date): {
  readonly deliveredAt: Date | null;
  readonly pickedUpAt: Date | null;
} {
  const deliveredAt = latestSuccessfulDeliveryAt(evidence, readyAt);
  return {
    deliveredAt,
    pickedUpAt: deliveredAt ? latestSuccessfulPickupAt(evidence, deliveredAt) : null,
  };
}
