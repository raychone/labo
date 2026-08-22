# OPS-001C - Performed Operations and Earning Snapshots

## Status

COMPLETED

## Objective

Let technicians select performed `Manopere` and store immutable earning snapshots.

## Scope

- Added `TechnicianPerformedOperation` as a separate domain record from `WorkType`.
- Snapshotted `earningMinor`, `currency` and `rateId` from the applicable technician rate at performance time.
- Added active-operation list, perform and soft-remove APIs with technician ownership checks.
- Added audit entries for performed-operation create/remove.
- Replaced the workbench `Manopere` placeholder with a full-screen catalog selector.

## Acceptance

- Later technician rate changes do not alter historical performed-operation earning snapshots.
- Removing a manopera soft-removes the active selection and preserves the original financial snapshot.
- The technician workbench uses the new operation catalog, not Work Types.

## Validation

- Focused API service/controller tests for snapshot creation, immutable reads and soft-remove.
- Focused technician workbench UI test for add/remove behavior.
- API, web and shared typecheck for changed packages.
