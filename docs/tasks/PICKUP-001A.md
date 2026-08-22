# PICKUP-001A - Pickup Request Domain

## Status

COMPLETED

## Objective

Add standalone `Ridicare` requests for logistics scheduling, separate from work orders and ready for future route consumption.

## Scope

- Added `PickupRequest` persistence with clinic, doctor, scheduled date, explicit schedule type, status and audit actor timestamps.
- Added API endpoints to list, create, update and cancel pickup requests under existing `pickup.*` permissions.
- Added logistics UI for pickup list plus create/edit modal using existing clinic and doctor selectors.
- Represented exact time and time-window schedules with distinct fields.

## Acceptance

- Exact pickup stores `scheduleType=EXACT` with `exactTime` only.
- Ranged pickup stores `scheduleType=RANGE` with `windowStartTime` and `windowEndTime` only.
- Server validation rejects mixed, missing, malformed or reversed schedules.
- Create, update and cancel mutations write audit entries.
- Pickup requests have no `WorkOrder` relation.

## Validation

- `pnpm --filter @dental-lab/api test -- logistics.service.test.ts`
- `pnpm --filter @dental-lab/web test -- logistics-page.test.tsx`
- `pnpm --filter @dental-lab/shared typecheck`
- `pnpm --filter @dental-lab/api typecheck`
- `pnpm --filter @dental-lab/web typecheck`
