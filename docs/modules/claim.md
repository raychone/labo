# Claim And Ownership

## Status

Implemented through TECH-CLAIM-001A and TECH-CLAIM-001B; TECH-CLAIM-001C is deferred and does not block the current MVP.

## Purpose

Control active technician ownership and lock the final execution context for a work.

## Roles And Permissions

Claim permissions: `works.claim.available.read`, `works.claim.own.read`, `works.claim.create`, `works.claim.release_own`, `works.claim.release_any`, `works.claim.assign`, `works.claim.reassign`, `works.claim.history.read`. Snapshot permissions: `works.execution_snapshot.*`.

## Domain Concepts

Available works, my claimed works, NC/NG selection, release, reassign, assignment history, claim revision, optimistic locking, execution snapshot.

## Business Rules

Current implemented behavior:

- Unclaimed eligible works appear in available-for-claim.
- Reception-created unclaimed works are immediately claimable even if the current workflow stage is still assigned to reception; no manual `Trimite la tehnician`, `Alocă`, `Pornește`, or `Mută` step is required before `GET /works/available-for-claim` returns them.
- Technician claims with explicit `executionLegalEntityCode` `NC` or `NG`.
- First valid claim in a cycle creates a locked execution snapshot with legal entity, technician, pricing, deadline, and context JSON.
- Successful claim and manager reassign set the work operational status to `IN_LUCRU` with explicit status-change timestamp/actor.
- Release clears active owner/legal entity and returns non-final work to `RECEPTIE`, but does not delete or recalculate the snapshot.
- Reclaim must use the already locked legal entity.
- Manager reassign changes current technician but preserves locked execution context.
- Wrong firm after snapshot is rejected with 409.
- Claim/reassign use optimistic `expectedClaimRevision`. `Preia` is committed through a conditional transaction update on `claimRevision`, `claimStatus: UNCLAIMED`, and work id, so concurrent claims produce one committed owner and one conflict.

Deferred behavior:

- TECH-CLAIM-001C may later address lifecycle finalization, stale claims, abandoned assignments, recovery, and advanced concurrency after business validation.
- No automatic claim expiration exists.
- No automatic reassignment exists.
- Existing manual manager release/reassign remains the current recovery mechanism.
- Execution snapshots always remain immutable inside their cycle and are not recalculated by release, reclaim, reassign, or future recovery flows unless a future approved repair task explicitly defines a controlled versioning rule.

## Data Model

`WorkOrder` claim fields plus operational status timestamp fields, `WorkCycle`, `WorkAssignmentEvent`, `WorkExecutionSnapshot`.

## API

`GET /works/available-for-claim`, `GET /works/my-claimed`, `POST /works/:id/claim`, `POST /works/:id/release`, `POST /works/:id/reassign`, `GET /works/:id/assignment-history`.

## UI

`/workbench` available/my works and claim/release modals. `/works` responsibility column, filters, detail card, assignment history, manager reassign modal.

## Audit

Claim, release, assign, reassign, conflicts, snapshot create/reuse/mismatch/pricing/deadline unresolved.

## Security

RBAC, CSRF, server-side legal entity validation, financial masking.

## Edge Cases

Concurrent claim, stale revision, delivered work cannot be claimed, pricing unresolved, firm mismatch after snapshot, new cycle resets active owner while preserving historical snapshots.

## Implemented Tasks

TECH-CLAIM-001A, TECH-CLAIM-001B, WORK-CYCLES-001A, CLAIM-001A, CLAIM-001B, STATE-001A.

## Planned Tasks

TECH-CLAIM-001C is deferred. STATUS-001A reads claim ownership for operational status without changing claim lifecycle rules.

## Deferred

Manager repair of invalid snapshots, stale claim timeout, abandoned-claim recovery, automatic expiry, and advanced recovery UX.

## Open Decisions

Recovery/repair authority, stale timeout duration, abandoned-claim recovery flow, and blocking rules after issued financial documents.

## Related Documents

[works.md](works.md), [pricing.md](pricing.md), [deadlines.md](deadlines.md), [../tasks/TECH-CLAIM-001C.md](../tasks/TECH-CLAIM-001C.md).
