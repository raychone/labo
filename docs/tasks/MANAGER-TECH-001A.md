# MANAGER-TECH-001A - Manager Technicians Page

## Status

COMPLETED

## Objective

Add manager technician page for rates and earnings.

## Scope

- Added manager earnings API on `technician-operations/earnings`.
- Added `Tehnicieni` manager route/page.
- Reused the existing technician rate model and rate mutation for future rates.
- Added technician selector, daily/monthly earnings and work/operation breakdown.

## Acceptance

- Manager can view all technicians or one selected technician.
- Earnings use immutable performed-operation snapshots only.
- Future rate edits do not alter historical earnings.
- UI distinguishes earned from paid/settled without adding settlement state.

## Validation

- Focused API service/controller earnings tests.
- Focused manager technician UI test.
- Changed package typechecks.
