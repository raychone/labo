# TECH-CLAIM-001B - Final execution snapshot for pricing, deadline and execution context

## Status

COMPLETED.

## Objective

Lock final execution context at the first valid claim or manager assignment.

## Dependencies

TECH-CLAIM-001A, PRICING-002, WORK-DEADLINES-001A, WORK-DEADLINES-001B, WORK-DEADLINES-001C.

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../modules/claim.md](../modules/claim.md)
- [../modules/pricing.md](../modules/pricing.md)
- [../modules/deadlines.md](../modules/deadlines.md)
- [../modules/works.md](../modules/works.md)

## Implemented

- Added `ExecutionSnapshotStatus`, `ExecutionSnapshotSource`, and `WorkExecutionSnapshot`.
- Added snapshot references to `WorkAssignmentEvent`.
- Created pure snapshot mappers in `work-execution-snapshot.ts`.
- Made pricing resolver and deadline service usable with transaction clients.
- Created/reused snapshots inside claim/reassign transactions.
- Preserved snapshots across release, reclaim, and reassign.
- Rejected firm mismatch after snapshot with 409.
- Added RBAC permissions for execution snapshots.
- Added view masking for pricing fields.
- Updated workbench and works UI with fixed context indicators and read-only company behavior.
- Updated QR detail include path so work views can render execution snapshot data.
- Updated demo seed with deterministic locked snapshots and claim catalog entries.

## Models

`WorkExecutionSnapshot` stores legal entity, original technician, claim revision/time, pricing minor units and JSON, deadline fields and JSON, context JSON, status/source/version, and creator.

## API/UI

Existing claim/reassign/detail/list/history endpoints now include snapshot behavior and response fields. UI surfaces `Context executie` without exposing financial fields to unauthorized users.

## Security And Masking

Request bodies do not accept pricing/deadline totals. Server resolves and masks financial snapshot data.

## Audit

Created/reused/locked/mismatch/pricing-unresolved/deadline-unresolved audit actions.

## Migration

`apps/api/prisma/migrations/20260729141612_work_execution_snapshots/migration.sql`.

## Tests

Prisma validate/generate, migration, seed idempotency, DB snapshot check, typecheck, test, build, manual API/web smoke.

## Known Limitations

Advanced stale-claim recovery and snapshot repair are planned for TECH-CLAIM-001C or later. Existing Vite chunk-size warning remains.

## Commit

`ccba29a TECH-CLAIM-001B: lock execution pricing and deadline snapshot`
