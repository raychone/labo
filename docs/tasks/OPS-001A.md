# OPS-001A - Technician Operation Catalog

## Status

COMPLETED

## Objective

Add a dedicated `Manopera` catalog separate from customer-facing Work Types.

## Scope

- Added `TechnicianOperation` Prisma model and deterministic migration.
- Added API endpoints for list/options/detail/create/update/archive/restore.
- Enforced existing `technician.operations.read` and manager-only rate-management permissions for catalog mutations.
- Added audit entries for create/update/archive/restore.
- Added shared frontend/API types.
- Added manager-facing catalog surface in the existing pricing workspace.

## Acceptance

- Operations can be listed and managed independently of `WorkType`.
- Creating a manopera does not require or mutate a Work Type.
- Active/inactive state is preserved through archive/restore.

## Validation

- Focused service/controller tests for technician operations.
- API and web typecheck for changed packages.
