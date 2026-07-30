# Claim And Ownership

## Status

Implemented through TECH-CLAIM-001A and TECH-CLAIM-001B; TECH-CLAIM-001C is not started.

## Purpose

Control active technician ownership and lock the final execution context for a work.

## Roles And Permissions

Claim permissions: `works.claim.available.read`, `works.claim.own.read`, `works.claim.create`, `works.claim.release_own`, `works.claim.release_any`, `works.claim.assign`, `works.claim.reassign`, `works.claim.history.read`. Snapshot permissions: `works.execution_snapshot.*`.

## Domain Concepts

Available works, my claimed works, NC/NG selection, release, reassign, assignment history, claim revision, optimistic locking, execution snapshot.

## Business Rules

Current implemented behavior:

- Unclaimed eligible works appear in available-for-claim.
- Technician claims with explicit `executionLegalEntityCode` `NC` or `NG`.
- First valid claim creates a locked execution snapshot with legal entity, technician, pricing, deadline, and context JSON.
- Release clears active owner/legal entity but does not delete or recalculate the snapshot.
- Reclaim must use the already locked legal entity.
- Manager reassign changes current technician but preserves locked execution context.
- Wrong firm after snapshot is rejected with 409.
- Claim/reassign use optimistic `expectedClaimRevision`.

Planned behavior:

- TECH-CLAIM-001C should address lifecycle finalization, stale claims, abandoned assignments, recovery, and advanced concurrency.

## Data Model

`WorkOrder` claim fields, `WorkAssignmentEvent`, `WorkExecutionSnapshot`.

## API

`GET /works/available-for-claim`, `GET /works/my-claimed`, `POST /works/:id/claim`, `POST /works/:id/release`, `POST /works/:id/reassign`, `GET /works/:id/assignment-history`.

## UI

`/workbench` available/my works and claim/release modals. `/works` responsibility column, filters, detail card, assignment history, manager reassign modal.

## Audit

Claim, release, assign, reassign, conflicts, snapshot create/reuse/mismatch/pricing/deadline unresolved.

## Security

RBAC, CSRF, server-side legal entity validation, financial masking.

## Edge Cases

Concurrent claim, stale revision, delivered work cannot be claimed, pricing unresolved, firm mismatch after snapshot.

## Implemented Tasks

TECH-CLAIM-001A, TECH-CLAIM-001B.

## Planned Tasks

TECH-CLAIM-001C.

## Deferred

Manager repair of invalid snapshots; final business rules TBD.

## Open Decisions

Recovery/repair authority and blocking rules after issued financial documents.

## Related Documents

[works.md](works.md), [pricing.md](pricing.md), [deadlines.md](deadlines.md), [../tasks/TECH-CLAIM-001C.md](../tasks/TECH-CLAIM-001C.md).
