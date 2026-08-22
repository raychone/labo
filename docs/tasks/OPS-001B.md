# OPS-001B - Technician Rates

## Status

COMPLETED

## Objective

Configure rate per technician per manopera using minor currency units and future-facing rate intervals.

## Scope

- Added `TechnicianOperationRate` Prisma model and deterministic migration.
- Stored rates in integer minor units with currency.
- Added open-ended rate interval semantics with `effectiveFrom` and `validUntil`.
- Closing a previous open rate and creating a new rate happens in one transaction.
- Added API endpoints for current/as-of rate listing, rate resolution and setting new rates.
- Validated that the target user is an active `TEHNICIAN`.
- Added audit entry for rate changes.
- Added manager-facing rate editor in the existing pricing workspace.

## Acceptance

- Different technicians can have different rates for the same operation.
- Setting a future rate does not rewrite historical rate rows.
- Rate resolution uses the requested effective interval.

## Validation

- Focused service/controller tests for technician rates.
- API and web typecheck for changed packages.
