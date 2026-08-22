# EARNINGS-001A - Technician Own Earnings

## Status

COMPLETED

## Objective

Add technician own earnings from immutable performed-operation snapshots.

## Scope

- Added own earnings API on `technician-operations/earnings/me`.
- Aggregated daily and monthly totals from active `TechnicianPerformedOperation.earningMinor` snapshots.
- Grouped breakdown by work and performed operation.
- Added `Câștiguri` technician sidebar route/page.

## Acceptance

- Technician earnings are scoped to the current actor.
- Totals never recalculate from current technician rates or customer prices.
- UI clearly labels values as earned, not paid or settled.

## Validation

- Focused API service/controller earnings tests.
- Focused technician earnings UI test.
- Changed package typechecks.
